import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAppOrigin, getStripe, stripeCurrentPeriodEnd, stripeCustomerId } from "./stripe.server";
import { BILLING_PLAN, normaliseSubscriptionStatus, type SubscriptionStatus } from "./subscription";

/** Lazy service-role table access. Only trusted server code can write billing state. */
async function subscriptionTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // The generated database types can lag migrations deployed by Lovable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabaseAdmin.from as any)("subscription");
}

function stripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error("Billing isn't configured yet. Add STRIPE_PRICE_ID in Lovable Cloud.");
  }
  return priceId;
}

let validatedPriceId: string | undefined;

/** Fail closed if the configured Stripe Price is not the advertised monthly plan. */
async function monthlyPriceId(): Promise<string> {
  const priceId = stripePriceId();
  if (validatedPriceId === priceId) return priceId;

  const price = await getStripe().prices.retrieve(priceId);
  const matchesPlan =
    price.active &&
    price.currency.toLowerCase() === BILLING_PLAN.currency &&
    price.unit_amount === BILLING_PLAN.amountCents &&
    price.recurring?.interval === "month" &&
    (price.recurring.interval_count ?? 1) === 1;
  if (!matchesPlan) {
    throw new Error("The configured Stripe Price must be an active A$49 monthly subscription.");
  }
  validatedPriceId = priceId;
  return priceId;
}

/** Ensure the signed-in person has one Stripe customer record. */
async function ensureCustomer(userId: string, email?: string): Promise<string> {
  const table = await subscriptionTable();
  const { data, error } = await table
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const existing = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (existing) return existing;

  const customer = await getStripe().customers.create(
    {
      email,
      metadata: { user_id: userId },
    },
    { idempotencyKey: `project-profile-customer-${userId}` },
  );
  const { error: writeError } = await table.upsert({
    user_id: userId,
    status: "inactive",
    stripe_customer_id: customer.id,
  });
  if (writeError) throw writeError;
  return customer.id;
}

/** Resolve the owning user for a webhook subscription and persist its latest state. */
export async function persistStripeSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = stripeCustomerId(subscription.customer);
  if (!customerId) throw new Error("Stripe subscription has no customer.");

  const table = await subscriptionTable();
  let userId: string | undefined = subscription.metadata.user_id?.trim() || undefined;

  if (!userId) {
    const { data, error } = await table
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (error) throw error;
    userId = (data as { user_id: string } | null)?.user_id ?? undefined;
  }
  if (!userId) throw new Error("Could not match the Stripe customer to an account.");

  const { error } = await table.upsert({
    user_id: userId,
    status: normaliseSubscriptionStatus(subscription.status),
    plan: BILLING_PLAN.name,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: stripeCurrentPeriodEnd(subscription)?.toISOString() ?? null,
  });
  if (error) throw error;
}

function preferredSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  const statusRank: Record<string, number> = {
    active: 4,
    trialing: 3,
    past_due: 2,
    incomplete: 1,
  };
  return (
    [...subscriptions].sort(
      (a, b) => (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0) || b.created - a.created,
    )[0] ?? null
  );
}

type CheckoutStage = "price" | "customer" | "subscription" | "portal" | "checkout";

function checkoutFailureMessage(stage: CheckoutStage, error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.startsWith("Billing isn't configured yet.")) return message;
  if (message === "The configured Stripe Price must be an active A$49 monthly subscription.") {
    return message;
  }
  if (stage === "price") {
    return "Stripe pricing could not be verified. Confirm the recurring A$49 AUD Price ID and secret key use the same Test or Live mode.";
  }
  if (stage === "customer") {
    return "The subscription database is not ready. Publish the latest Lovable database changes, then try again.";
  }
  if (stage === "subscription" || stage === "portal") {
    return "Your Stripe billing account could not be checked. Please try again.";
  }
  return "Stripe could not create checkout. Please try again.";
}

async function latestSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return preferredSubscription(subscriptions.data);
}

/** Start secure hosted Checkout for the single A$49 monthly plan. */
/**
 * Pay-first sign-up. No account is required: Stripe collects the email on the
 * hosted Checkout page and `provisionCheckoutAccount` creates the account when
 * the `checkout.session.completed` webhook arrives.
 */
export const startSignupCheckout = createServerFn({ method: "POST" }).handler(async () => {
  let stage: CheckoutStage = "price";
  try {
    const priceId = await monthlyPriceId();
    stage = "checkout";
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: { signup_flow: "pay_first" },
      success_url: `${getAppOrigin()}/welcome`,
      cancel_url: `${getAppOrigin()}/pricing?checkout=cancel`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url, error: null };
  } catch (error) {
    console.error(`[Billing] Sign-up checkout failed during ${stage}.`, error);
    return { url: null, error: checkoutFailureMessage(stage, error) };
  }
});

/**
 * Provision (or link) the account for a completed pay-first Checkout Session.
 * New customers get an emailed set-password link; existing accounts get a
 * normal sign-in link and keep their user id.
 */
export async function provisionCheckoutAccount(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const email = (session.customer_details?.email ?? session.customer_email ?? "").trim();
  const customerId = stripeCustomerId(session.customer as Stripe.Checkout.Session["customer"]);
  if (!email || !customerId) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const origin = getAppOrigin();

  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { source: "stripe_checkout" },
  });

  const isNewUser = Boolean(created.data.user?.id);
  let userId = created.data.user?.id ?? null;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: isNewUser ? "recovery" : "magiclink",
    email,
    options: { redirectTo: isNewUser ? `${origin}/reset-password` : `${origin}/projects` },
  });
  if (linkError) throw linkError;
  userId = userId ?? linkData.user?.id ?? null;
  if (!userId) throw new Error("Could not resolve the account for the Stripe customer.");

  // Link billing state before the subscription webhook work runs.
  const table = await subscriptionTable();
  const { error: upsertError } = await table.upsert({
    user_id: userId,
    status: "inactive",
    stripe_customer_id: customerId,
  });
  if (upsertError) throw upsertError;

  await getStripe().customers.update(customerId, { metadata: { user_id: userId } });
  if (typeof session.subscription === "string") {
    await getStripe().subscriptions.update(session.subscription, { metadata: { user_id: userId } });
  }

  const actionLink = linkData.properties?.action_link;
  if (actionLink) {
    const { notify } = await import("@/lib/procurement/notifications.server");
    const { adminClient } = await import("@/lib/procurement/server-helpers");
    await notify(await adminClient(), {
      userId,
      email,
      kind: "account_invitation",
      title: isNewUser ? "Set your Launch Planner password" : "Sign in to Launch Planner",
      body: isNewUser
        ? "Your payment is complete and your Launch Planner account is ready. Use the secure link below to set your password and sign in."
        : "Your Launch Planner subscription is active. Use the secure link below to sign in.",
      href: actionLink,
      idempotencyKey: `checkout-access:${session.id}`,
    });
  }

  return userId;
}

export const createCheckoutSession = createServerFn({ method: "POST" })

  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let stage: CheckoutStage = "price";
    try {
      const priceId = await monthlyPriceId();
      const userId = context.userId as string;
      const email = (context.claims as { email?: string })?.email;

      stage = "customer";
      const customer = await ensureCustomer(userId, email);

      stage = "subscription";
      const existing = await latestSubscription(customer);

      if (existing && ["active", "trialing"].includes(existing.status)) {
        await persistStripeSubscription(existing);
        return { url: `${getAppOrigin()}/projects`, error: null };
      }
      if (existing && ["past_due", "unpaid", "paused"].includes(existing.status)) {
        await persistStripeSubscription(existing);
        stage = "portal";
        const portal = await getStripe().billingPortal.sessions.create({
          customer,
          return_url: `${getAppOrigin()}/projects`,
        });
        return { url: portal.url, error: null };
      }

      stage = "checkout";
      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        customer,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        subscription_data: { metadata: { user_id: userId } },
        success_url: `${getAppOrigin()}/projects?checkout=success`,
        cancel_url: `${getAppOrigin()}/pricing?checkout=cancel`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url, error: null };
    } catch (error) {
      console.error(`[Billing] Checkout failed during ${stage}.`, error);
      return { url: null, error: checkoutFailureMessage(stage, error) };
    }
  });

/** Open Stripe's customer portal for payment details, invoices and cancellation. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const table = await subscriptionTable();
    const { data, error } = await table
      .select("stripe_customer_id")
      .eq("user_id", context.userId as string)
      .maybeSingle();
    if (error) throw error;
    const customer = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
    if (!customer) throw new Error("No billing account was found.");

    const portal = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${getAppOrigin()}/projects`,
    });
    return { url: portal.url };
  });

/**
 * Refresh Stripe state immediately after Checkout. Webhooks remain the source
 * of truth for renewals, cancellations and failed payments.
 */
export const syncSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const table = await subscriptionTable();
    const { data, error } = await table
      .select("stripe_customer_id")
      .eq("user_id", context.userId as string)
      .maybeSingle();
    if (error) throw error;
    const customer = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
    if (!customer) return { status: "inactive" as SubscriptionStatus };

    const subscription = await latestSubscription(customer);
    if (!subscription) return { status: "inactive" as SubscriptionStatus };
    await persistStripeSubscription(subscription);
    return { status: normaliseSubscriptionStatus(subscription.status) };
  });
