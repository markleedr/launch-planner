import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAppOrigin, getStripe, stripeCurrentPeriodEnd, stripeCustomerId } from "./stripe.server";
import { launchPlannerMetadata, UnknownStripeCustomerError } from "./launch-planner-billing";
import { BILLING_PLAN, normaliseSubscriptionStatus, type SubscriptionStatus } from "./subscription";
import {
  DEFAULT_TRIAL_DAYS,
  OCTOBER_PROMO_CODE,
  OCTOBER_PROMO_EXPIRES_AT,
  PROMO_TRIAL_DAYS,
  buildSignupCheckoutDraft,
  buildSubscribeCheckoutDraft,
  evaluateSignupTrial,
  incomingTrialReplacesExisting,
  normaliseEmail,
  normalisePromoCode,
  trialRequiresCard,
  type PromoRedemption,
  type StripePromotionSnapshot,
} from "./trial";

/** Lazy service-role table access. Only trusted server code can write billing state. */
async function subscriptionTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // The generated database types can lag applied migrations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabaseAdmin.from as any)("subscription");
}

function stripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error("Billing isn't configured yet. Add STRIPE_PRICE_ID in Vercel.");
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
      metadata: launchPlannerMetadata({ user_id: userId }),
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

/** Launch Planner user already stored against this Stripe customer, if any. */
export async function findUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const table = await subscriptionTable();
  const { data, error } = await table
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data as { user_id: string } | null)?.user_id ?? null;
}

async function promoRedemptionTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabaseAdmin.from as any)("promo_redemption");
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/** True when a new column is not in the database yet, so older rows can still sync. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204";
}

/** Remember a code use. Repeating the same account is ignored. */
export async function recordPromoRedemption(input: {
  code: string;
  email?: string | null;
  userId?: string | null;
  stripeCustomerId?: string | null;
}): Promise<void> {
  const code = normalisePromoCode(input.code);
  if (!code) return;
  const email = normaliseEmail(input.email);
  const table = await promoRedemptionTable();
  if (email && input.stripeCustomerId) {
    const { error: fillError } = await table
      .update({ email })
      .eq("code", code)
      .eq("stripe_customer_id", input.stripeCustomerId)
      .is("email", null);
    if (fillError && !isUniqueViolation(fillError)) throw fillError;
  }
  const { error } = await table.insert({
    code,
    email,
    user_id: input.userId ?? null,
    stripe_customer_id: input.stripeCustomerId ?? null,
  });
  if (error && !isUniqueViolation(error)) throw error;
}

async function redemptionsFor(query: {
  code: string;
  email?: string | null;
  stripeCustomerId?: string | null;
}): Promise<PromoRedemption[]> {
  const table = await promoRedemptionTable();
  const found: PromoRedemption[] = [];
  const email = normaliseEmail(query.email);
  if (email) {
    const { data, error } = await table
      .select("code,email,stripe_customer_id,user_id")
      .eq("code", query.code)
      .eq("email", email)
      .limit(5);
    if (error) throw error;
    for (const row of (data ?? []) as Array<Record<string, string | null>>) {
      found.push({
        code: String(row.code),
        email: row.email,
        stripeCustomerId: row.stripe_customer_id,
        userId: row.user_id,
      });
    }
  }
  if (query.stripeCustomerId) {
    const { data, error } = await table
      .select("code,email,stripe_customer_id,user_id")
      .eq("code", query.code)
      .eq("stripe_customer_id", query.stripeCustomerId)
      .limit(5);
    if (error) throw error;
    for (const row of (data ?? []) as Array<Record<string, string | null>>) {
      found.push({
        code: String(row.code),
        email: row.email,
        stripeCustomerId: row.stripe_customer_id,
        userId: row.user_id,
      });
    }
  }
  return found;
}

async function stripePromotionSnapshot(code: string): Promise<StripePromotionSnapshot | null> {
  const list = await getStripe().promotionCodes.list({ code, limit: 1 });
  const match = list.data.find((item) => item.code.toUpperCase() === code.toUpperCase()) ?? null;
  if (!match) return null;
  return { code: match.code, active: match.active, expiresAt: match.expires_at };
}

/**
 * Find the Stripe customer for this email and whether they already used the
 * code or already have a subscription.
 */
async function promoCustomerState(
  email: string,
  code: string,
): Promise<{
  stripeCustomerId: string | null;
  redemptions: PromoRedemption[];
  alreadySubscribed: boolean;
}> {
  const customers = await getStripe().customers.list({ email, limit: 10 });
  const customer = customers.data.find((item) => !("deleted" in item && item.deleted)) ?? null;
  const stripeCustomerId = customer?.id ?? null;
  const redemptions = await redemptionsFor({ code, email, stripeCustomerId });
  if (!stripeCustomerId) {
    return { stripeCustomerId: null, redemptions, alreadySubscribed: false };
  }
  const subscriptions = await getStripe().subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 20,
  });
  const usedOnSubscription = subscriptions.data.some(
    (subscription) => normalisePromoCode(subscription.metadata?.promo_code) === code,
  );
  if (usedOnSubscription) {
    redemptions.push({
      code,
      email,
      stripeCustomerId,
      userId: subscriptionUserId(subscriptions.data),
    });
  }
  return {
    stripeCustomerId,
    redemptions,
    alreadySubscribed: subscriptions.data.length > 0,
  };
}

function subscriptionUserId(subscriptions: Stripe.Subscription[]): string | null {
  for (const subscription of subscriptions) {
    const userId = subscription.metadata?.user_id?.trim();
    if (userId) return userId;
  }
  return null;
}

/** Public trial settings for the pricing page. No secrets. */
export const getTrialConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    defaultTrialDays: DEFAULT_TRIAL_DAYS,
    promoTrialDays: PROMO_TRIAL_DAYS,
    promoCode: OCTOBER_PROMO_CODE,
    promoExpiresAt: OCTOBER_PROMO_EXPIRES_AT.toISOString(),
    requireCard: trialRequiresCard(),
  };
});

/** Resolve the owning user for a webhook subscription and persist its latest state. */
export async function persistStripeSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = stripeCustomerId(subscription.customer);
  if (!customerId) throw new Error("Stripe subscription has no customer.");

  const table = await subscriptionTable();
  const userId =
    subscription.metadata.user_id?.trim() ||
    (await findUserIdByStripeCustomerId(customerId)) ||
    undefined;
  if (!userId) throw new UnknownStripeCustomerError();

  const { data: existingRow, error: existingError } = await table
    .select("stripe_subscription_id,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  const existing = existingRow as { stripe_subscription_id: string | null; status: string } | null;
  if (
    incomingTrialReplacesExisting(
      existing
        ? { stripeSubscriptionId: existing.stripe_subscription_id, status: existing.status }
        : null,
      { id: subscription.id, status: subscription.status },
    ) === "keep_existing"
  ) {
    if (subscription.status === "trialing") {
      await getStripe().subscriptions.cancel(subscription.id);
    }
    console.log("[Billing] Kept the existing subscription and cancelled a duplicate trial.", {
      userId,
      incomingSubscriptionId: subscription.id,
    });
    return;
  }

  const promoCode = normalisePromoCode(subscription.metadata?.promo_code);
  const trialEnd =
    typeof subscription.trial_end === "number"
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
  const baseRow = {
    user_id: userId,
    status: normaliseSubscriptionStatus(subscription.status),
    plan: BILLING_PLAN.name,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: stripeCurrentPeriodEnd(subscription)?.toISOString() ?? null,
  };
  const extendedRow = {
    ...baseRow,
    ...(trialEnd ? { trial_end: trialEnd } : {}),
    ...(promoCode ? { promo_code: promoCode } : {}),
  };
  const firstWrite = await table.upsert(extendedRow);
  const error = isMissingColumn(firstWrite.error)
    ? (await table.upsert(baseRow)).error
    : firstWrite.error;
  if (error) throw error;
  if (promoCode) {
    await recordPromoRedemption({ code: promoCode, userId, stripeCustomerId: customerId });
  }
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
    return "We couldn't verify your Stripe pricing. Confirm the recurring A$49 AUD Price ID and secret key use the same Test or Live mode.";
  }
  if (stage === "customer") {
    return "The subscription database is not ready. Apply the latest Supabase migrations, then try again.";
  }
  if (stage === "subscription" || stage === "portal") {
    return "We couldn't check your Stripe billing account. Try again.";
  }
  return "We couldn't start Stripe checkout. Try again.";
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
 *
 * Every new signup starts a free trial (14 days, or 30 with OCT15FREE).
 * TRIAL_REQUIRE_CARD=true collects a card; otherwise Checkout skips the card.
 */
export const startSignupCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const raw =
      input && typeof input === "object" ? (input as { promoCode?: unknown; email?: unknown }) : {};
    return {
      promoCode: typeof raw.promoCode === "string" ? raw.promoCode : null,
      email: typeof raw.email === "string" ? raw.email : null,
    };
  })
  .handler(async ({ data }) => {
    let stage: CheckoutStage = "price";
    try {
      const priceId = await monthlyPriceId();
      const requireCard = trialRequiresCard();
      const email = normaliseEmail(data.email);
      const localOffer = evaluateSignupTrial({
        promoCode: data.promoCode,
        email: data.email,
        requireCard,
      });
      if (!localOffer.ok) return { url: null, error: localOffer.message };

      let stripeCustomerIdForPromo: string | null = null;
      let offer = localOffer;
      if (localOffer.promoCode) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { url: null, error: "Enter a valid email address." };
        }
        stage = "customer";
        const state = await promoCustomerState(email, localOffer.promoCode);
        const stripePromotion = await stripePromotionSnapshot(localOffer.promoCode);
        const confirmed = evaluateSignupTrial({
          promoCode: data.promoCode,
          email,
          requireCard,
          redemptions: state.redemptions,
          stripeCustomerId: state.stripeCustomerId,
          stripePromotion,
        });
        if (!confirmed.ok) return { url: null, error: confirmed.message };
        if (state.alreadySubscribed) {
          return {
            url: null,
            error: "This email already has a Launch Planner billing account. Sign in to subscribe.",
          };
        }
        offer = confirmed;
        stripeCustomerIdForPromo = state.stripeCustomerId;
      }

      let customerId = stripeCustomerIdForPromo;
      if (offer.promoCode && email && !customerId) {
        stage = "customer";
        const customer = await getStripe().customers.create(
          {
            email,
            metadata: launchPlannerMetadata({ promo_code: offer.promoCode }),
          },
          {
            idempotencyKey: `launch-planner-promo-${offer.promoCode}-${email}`.slice(0, 255),
          },
        );
        customerId = customer.id;
      }

      stage = "checkout";
      const draft = buildSignupCheckoutDraft({
        priceId,
        origin: getAppOrigin(),
        offer,
        metadata: launchPlannerMetadata({ signup_flow: "pay_first" }),
        customerId,
        customerEmail: email,
      });
      const session = await getStripe().checkout.sessions.create(draft);
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url, error: null };
    } catch (error) {
      console.error(`[Billing] Sign-up checkout failed during ${stage}.`, error);
      return { url: null, error: checkoutFailureMessage(stage, error) };
    }
  });

/**
 * Provision (or link) the account for a completed pay-first Checkout Session.
 * Every customer, new or returning, gets an emailed set-password link.
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

  let userId = created.data.user?.id ?? null;

  // Always send a "set your password" link, never a magic sign-in link. Every
  // paid customer, new or returning, gets the same reliable password-set flow.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });
  if (linkError) throw linkError;
  userId = userId ?? linkData.user?.id ?? null;
  if (!userId) throw new Error("Could not resolve the account for the Stripe customer.");

  // Link billing state before the subscription webhook work runs.
  // An account that already has a subscription keeps that row. A second trial
  // must not mark it inactive or spend a promotion code.
  const table = await subscriptionTable();
  const { data: existingBilling, error: existingError } = await table
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  const alreadyBilled = Boolean(
    (existingBilling as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id,
  );
  if (!alreadyBilled) {
    const { error: upsertError } = await table.upsert({
      user_id: userId,
      status: "inactive",
      stripe_customer_id: customerId,
    });
    if (upsertError) throw upsertError;
  }

  const promoCode = normalisePromoCode(session.metadata?.promo_code);
  await getStripe().customers.update(customerId, {
    metadata: launchPlannerMetadata({ user_id: userId }),
  });
  if (typeof session.subscription === "string") {
    await getStripe().subscriptions.update(session.subscription, {
      metadata: launchPlannerMetadata({
        user_id: userId,
        ...(promoCode ? { promo_code: promoCode } : {}),
      }),
    });
  }

  if (promoCode && !alreadyBilled) {
    await recordPromoRedemption({
      code: promoCode,
      email,
      userId,
      stripeCustomerId: customerId,
    });
  }

  const actionLink = linkData.properties?.action_link;
  if (actionLink) {
    const trialDays = session.metadata?.trial_days?.trim();
    const { notify } = await import("@/lib/procurement/notifications.server");
    const { adminClient } = await import("@/lib/procurement/server-helpers");
    await notify(await adminClient(), {
      userId,
      email,
      kind: "account_invitation",
      title: trialDays ? "Your Launch Planner trial is ready" : "Set your Launch Planner password",
      body: trialDays
        ? `Your ${trialDays}-day Launch Planner trial has started. Use the secure link below to set your password and sign in. You won't be charged today, and your projects stay saved on this account.`
        : "Your payment is complete and your Launch Planner account is ready. Use the secure link below to set your password and sign in.",
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
      const session = await getStripe().checkout.sessions.create(
        buildSubscribeCheckoutDraft({
          priceId,
          origin: getAppOrigin(),
          customerId: customer,
          userId,
          metadata: launchPlannerMetadata(),
          subscriptionMetadata: launchPlannerMetadata({ user_id: userId }),
        }),
      );
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
