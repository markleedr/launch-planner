import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";
import { handleStripeWebhook, type StripeWebhookDeps } from "./stripe-webhook.server";

const LP_PRICE = "price_launch_planner_monthly";
const CP_PRICE = "price_content_proof_pro";
const LP_USER = "11111111-1111-4111-8111-111111111111";

function subscriptionObject(priceId: string, extras: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    metadata: {},
    items: {
      data: [
        {
          price: { id: priceId, product: "prod_x" },
          current_period_end: 1_800_000_000,
        },
      ],
    },
    ...extras,
  };
}

function event(type: string, object: Record<string, unknown>, id = "evt_test"): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

function createHarness(webhookEvent: Stripe.Event, overrides: Partial<StripeWebhookDeps> = {}) {
  const persisted: Stripe.Subscription[] = [];
  const provisioned: Stripe.Checkout.Session[] = [];
  const retrieves: string[] = [];
  const lookups: string[] = [];
  let signatureError: Error | null = null;
  let knownUserId: string | null = null;

  const deps: StripeWebhookDeps = {
    priceIds: new Set([LP_PRICE]),
    productIds: new Set(),
    constructEvent: async () => {
      if (signatureError) throw signatureError;
      return webhookEvent;
    },
    retrieveSubscription: async (subscriptionId) => {
      retrieves.push(subscriptionId);
      return subscriptionObject(LP_PRICE, { id: subscriptionId }) as Stripe.Subscription;
    },
    findUserIdByCustomerId: async (customerId) => {
      lookups.push(customerId);
      return knownUserId;
    },
    provisionCheckoutAccount: async (session) => {
      provisioned.push(session);
      return LP_USER;
    },
    persistStripeSubscription: async (subscription) => {
      persisted.push(subscription);
    },
    ...overrides,
  };

  return {
    deps,
    persisted,
    provisioned,
    retrieves,
    lookups,
    recogniseCustomer() {
      knownUserId = LP_USER;
    },
    failSignature(message = "No signatures found matching the expected signature for payload") {
      signatureError = new Error(message);
    },
  };
}

function post(body = "{}", signature = "t=1,v1=ok"): Request {
  return new Request("https://launchplanner.com.au/api/public/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body,
  });
}

describe("Launch Planner Stripe webhook", () => {
  test("skips a Content Proof subscription with 200 and does not save it", async () => {
    const webhookEvent = event(
      "customer.subscription.updated",
      subscriptionObject(CP_PRICE, {
        metadata: { user_id: "content-proof-user", app: "contentproof" },
        status: "active",
      }),
    );
    const harness = createHarness(webhookEvent);
    harness.recogniseCustomer();

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: "foreign_product" });
    expect(harness.persisted).toEqual([]);
    expect(harness.provisioned).toEqual([]);
    expect(harness.lookups).toEqual([]);
    expect(harness.retrieves).toEqual([]);
  });

  test("skips an unknown customer with 200 and does not save it", async () => {
    const webhookEvent = event("customer.subscription.updated", subscriptionObject(LP_PRICE));
    const harness = createHarness(webhookEvent);

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: "unknown_customer" });
    expect(harness.persisted).toEqual([]);
    expect(harness.provisioned).toEqual([]);
    expect(harness.lookups).toEqual(["cus_123"]);
  });

  test("still syncs a Launch Planner subscription for a known customer", async () => {
    const webhookEvent = event(
      "customer.subscription.updated",
      subscriptionObject(LP_PRICE, { status: "past_due" }),
    );
    const harness = createHarness(webhookEvent);
    harness.recogniseCustomer();

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(harness.persisted).toHaveLength(1);
    expect(harness.persisted[0]?.id).toBe("sub_123");
    expect(harness.persisted[0]?.status).toBe("past_due");
    expect(harness.provisioned).toEqual([]);
  });

  test("still syncs a Launch Planner subscription that already carries our user id", async () => {
    const webhookEvent = event(
      "customer.subscription.created",
      subscriptionObject(LP_PRICE, { metadata: { user_id: LP_USER, app: "launch-planner" } }),
    );
    const harness = createHarness(webhookEvent);

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(harness.persisted).toHaveLength(1);
    expect(harness.lookups).toEqual([]);
  });

  test("does not provision a Launch Planner account for a Content Proof checkout", async () => {
    const webhookEvent = event("checkout.session.completed", {
      id: "cs_cp",
      mode: "subscription",
      customer: "cus_cp",
      subscription: "sub_cp",
      customer_details: { email: "pro@contentproof.example", name: "Pro Subscriber" },
      customer_email: "pro@contentproof.example",
      metadata: { user_id: "content-proof-user" },
    });
    const retrieved: string[] = [];
    const harness = createHarness(webhookEvent, {
      retrieveSubscription: async (subscriptionId) => {
        retrieved.push(subscriptionId);
        return subscriptionObject(CP_PRICE, {
          id: subscriptionId,
          customer: "cus_cp",
        }) as Stripe.Subscription;
      },
    });

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: "foreign_product" });
    expect(harness.provisioned).toEqual([]);
    expect(harness.persisted).toEqual([]);
    expect(retrieved).toEqual(["sub_cp"]);
  });

  test("still provisions and syncs a Launch Planner checkout", async () => {
    const session = {
      id: "cs_lp",
      mode: "subscription",
      customer: "cus_123",
      subscription: "sub_123",
      customer_details: { email: "buyer@example.com" },
      metadata: { app: "launch-planner", signup_flow: "pay_first" },
    };
    const webhookEvent = event("checkout.session.completed", session);
    const harness = createHarness(webhookEvent);

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(harness.provisioned).toHaveLength(1);
    expect(harness.provisioned[0]?.id).toBe("cs_lp");
    expect(harness.persisted).toHaveLength(1);
    expect(harness.retrieves).toEqual(["sub_123"]);
  });

  test("skips a Content Proof invoice without retrieving or saving", async () => {
    const webhookEvent = event("invoice.payment_failed", {
      customer: "cus_cp",
      lines: {
        data: [{ pricing: { price_details: { price: CP_PRICE, product: "prod_cp" } } }],
      },
    });
    const harness = createHarness(webhookEvent);
    harness.recogniseCustomer();

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, skipped: "foreign_product" });
    expect(harness.persisted).toEqual([]);
    expect(harness.retrieves).toEqual([]);
    expect(harness.lookups).toEqual([]);
  });

  test("keeps rejecting a bad signature before any billing work", async () => {
    const harness = createHarness(
      event("customer.subscription.updated", subscriptionObject(LP_PRICE)),
    );
    harness.failSignature();
    harness.recogniseCustomer();

    const missing = await handleStripeWebhook(
      new Request("https://launchplanner.com.au/api/public/stripe/webhook", { method: "POST" }),
      harness.deps,
    );
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "Missing Stripe signature." });

    const forged = await handleStripeWebhook(post("{}", "t=1,v1=forged"), harness.deps);
    expect(forged.status).toBe(400);
    expect(await forged.json()).toEqual({ error: "Invalid webhook signature." });
    expect(harness.persisted).toEqual([]);
    expect(harness.provisioned).toEqual([]);
  });

  test("still returns 500 when a Launch Planner sync fails, so Stripe retries", async () => {
    const webhookEvent = event(
      "customer.subscription.updated",
      subscriptionObject(LP_PRICE),
      "evt_retry",
    );
    const harness = createHarness(webhookEvent, {
      persistStripeSubscription: async () => {
        throw new Error("database unavailable");
      },
    });
    harness.recogniseCustomer();

    const response = await handleStripeWebhook(post(), harness.deps);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not sync subscription." });
    expect(harness.provisioned).toEqual([]);
  });
});
