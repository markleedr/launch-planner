import type Stripe from "stripe";
import {
  classifyOwnership,
  configuredPriceIds,
  configuredProductIds,
  extractBillingSignals,
  mergeSignals,
  type Ownership,
} from "./launch-planner-billing";
import {
  getStripe,
  getStripeCryptoProvider,
  getStripeWebhookSecret,
  stripeCustomerId,
} from "./stripe.server";

/** Subscription lifecycle events carry the Subscription object directly. */
const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  // Sent a few days before trial end. The payload is a Subscription, same as
  // the other subscription events. Sync it; do not 500 or treat it as foreign
  // just because the status is trialing.
  "customer.subscription.trial_will_end",
]);

/** These events reference a subscription by id and need a retrieve first. */
const REFERENCE_EVENTS = new Set([
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

export type StripeWebhookDeps = {
  priceIds: ReadonlySet<string>;
  productIds: ReadonlySet<string>;
  constructEvent: (body: string, signature: string) => Promise<Stripe.Event>;
  retrieveSubscription: (subscriptionId: string) => Promise<Stripe.Subscription>;
  findUserIdByCustomerId: (customerId: string) => Promise<string | null>;
  provisionCheckoutAccount: (session: Stripe.Checkout.Session) => Promise<string | null>;
  persistStripeSubscription: (subscription: Stripe.Subscription) => Promise<void>;
};

function referencedSubscriptionId(event: Stripe.Event): string | null {
  const object = event.data.object as unknown as Record<string, unknown>;
  const value = object.subscription ?? object.parent;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const nested = value as {
      id?: string;
      subscription_details?: { subscription?: string | { id?: string } };
    };
    if (typeof nested.id === "string" && nested.id.startsWith("sub_")) return nested.id;
    const detail = nested.subscription_details?.subscription;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail.id === "string") return detail.id;
  }
  return null;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
  }
  return null;
}

function ownershipOf(object: unknown, deps: StripeWebhookDeps): Ownership {
  return classifyOwnership(extractBillingSignals(object), deps.priceIds, deps.productIds);
}

/**
 * metadata.user_id is only trusted once the event is already Launch Planner's.
 * Other products on the shared account put their own user ids there.
 * Otherwise the Stripe customer has to be one we already stored.
 */
async function resolveUserId(
  subscription: Stripe.Subscription,
  deps: StripeWebhookDeps,
  trustMetadata: boolean,
): Promise<string | null> {
  if (trustMetadata) {
    const hinted = subscription.metadata?.user_id?.trim();
    if (hinted) return hinted;
  }
  const customerId = stripeCustomerId(subscription.customer);
  if (!customerId) return null;
  return deps.findUserIdByCustomerId(customerId);
}

async function resolveSubscription(
  subscription: Stripe.Subscription,
  deps: StripeWebhookDeps,
): Promise<{ ownership: Ownership; subscription: Stripe.Subscription }> {
  let current = subscription;
  let ownership = ownershipOf(current, deps);
  if (ownership === "unknown" && current.id) {
    const fetched = await deps.retrieveSubscription(current.id);
    ownership = classifyOwnership(
      mergeSignals(extractBillingSignals(current), extractBillingSignals(fetched)),
      deps.priceIds,
      deps.productIds,
    );
    current = fetched;
  }
  return { ownership, subscription: current };
}

async function syncIfLinked(
  subscription: Stripe.Subscription,
  deps: StripeWebhookDeps,
  ownership: Ownership,
): Promise<string | null> {
  if (ownership === "foreign") return "foreign_product";
  const userId = await resolveUserId(subscription, deps, ownership === "ours");
  if (!userId) return "unknown_customer";
  await deps.persistStripeSubscription(subscription);
  return null;
}

async function processCheckout(
  event: Stripe.Event,
  deps: StripeWebhookDeps,
): Promise<string | null> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode !== "subscription") return "not_launch_planner";

  let ownership = ownershipOf(session, deps);
  if (ownership === "foreign") return "foreign_product";

  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) {
    if (ownership === "ours") {
      throw new Error("Launch Planner checkout is missing a subscription.");
    }
    return "not_launch_planner";
  }

  const subscription = await deps.retrieveSubscription(subscriptionId);
  ownership = classifyOwnership(
    mergeSignals(extractBillingSignals(session), extractBillingSignals(subscription)),
    deps.priceIds,
    deps.productIds,
  );
  if (ownership !== "ours") {
    return ownership === "foreign" ? "foreign_product" : "not_launch_planner";
  }

  await deps.provisionCheckoutAccount(session);
  await deps.persistStripeSubscription(subscription);
  return null;
}

async function processSubscription(
  event: Stripe.Event,
  deps: StripeWebhookDeps,
): Promise<string | null> {
  const { ownership, subscription } = await resolveSubscription(
    event.data.object as Stripe.Subscription,
    deps,
  );
  return syncIfLinked(subscription, deps, ownership);
}

async function processReference(
  event: Stripe.Event,
  deps: StripeWebhookDeps,
): Promise<string | null> {
  let ownership = ownershipOf(event.data.object, deps);
  if (ownership === "foreign") return "foreign_product";

  const subscriptionId = referencedSubscriptionId(event);
  if (!subscriptionId) {
    return ownership === "ours" ? null : "not_launch_planner";
  }

  const subscription = await deps.retrieveSubscription(subscriptionId);
  if (ownership !== "ours") {
    ownership = classifyOwnership(
      mergeSignals(extractBillingSignals(event.data.object), extractBillingSignals(subscription)),
      deps.priceIds,
      deps.productIds,
    );
  }
  return syncIfLinked(subscription, deps, ownership);
}

async function processEvent(event: Stripe.Event, deps: StripeWebhookDeps): Promise<string | null> {
  if (event.type === "checkout.session.completed") return processCheckout(event, deps);
  if (SUBSCRIPTION_EVENTS.has(event.type)) return processSubscription(event, deps);
  if (REFERENCE_EVENTS.has(event.type)) return processReference(event, deps);
  return null;
}

let warnedAboutAllowlist = false;

function warnIfAllowlistEmpty(deps: StripeWebhookDeps) {
  if (warnedAboutAllowlist || deps.priceIds.size > 0 || deps.productIds.size > 0) return;
  warnedAboutAllowlist = true;
  console.warn(
    "[Stripe webhook] STRIPE_PRICE_ID is not set. Only customers already stored by Launch Planner can be synced. Set STRIPE_PRICE_ID to the A$49 price so other products are recognised explicitly.",
  );
}

async function createDefaultDeps(): Promise<StripeWebhookDeps> {
  const billing = await import("./billing.server");
  return {
    priceIds: configuredPriceIds(),
    productIds: configuredProductIds(),
    constructEvent: (body, signature) =>
      getStripe().webhooks.constructEventAsync(
        body,
        signature,
        getStripeWebhookSecret(),
        undefined,
        getStripeCryptoProvider(),
      ),
    retrieveSubscription: (subscriptionId) => getStripe().subscriptions.retrieve(subscriptionId),
    findUserIdByCustomerId: (customerId) => billing.findUserIdByStripeCustomerId(customerId),
    provisionCheckoutAccount: (session) => billing.provisionCheckoutAccount(session),
    persistStripeSubscription: (subscription) => billing.persistStripeSubscription(subscription),
  };
}

export async function handleStripeWebhook(
  request: Request,
  deps?: StripeWebhookDeps,
): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const resolved = deps ?? (await createDefaultDeps());
  warnIfAllowlistEmpty(resolved);

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = await resolved.constructEvent(rawBody, signature);
  } catch (error) {
    console.error("[Stripe webhook] Verification failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const skipped = await processEvent(event, resolved);
    if (skipped) {
      console.log("[Stripe webhook] Skipping event.", {
        eventId: event.id,
        eventType: event.type,
        reason: skipped,
      });
      return Response.json({ received: true, skipped });
    }
  } catch (error) {
    console.error("[Stripe webhook] Subscription sync failed.", {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "Could not sync subscription." }, { status: 500 });
  }

  return Response.json({ received: true });
}
