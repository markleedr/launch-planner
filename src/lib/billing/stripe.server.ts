import Stripe from "stripe";

let stripeClient: Stripe | undefined;

function requiredEnv(name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Billing isn't configured yet. Add ${name} in Vercel.`);
  }
  return value;
}

/** Lazy server-only Stripe client using fetch so it runs in Vercel's serverless runtime. */
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
    });
  }
  return stripeClient;
}

/** Public application origin used for all Stripe redirects. Never trust a browser-supplied URL. */
export function getAppOrigin(): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (!configured) {
    throw new Error("Billing isn't configured yet. Add APP_ORIGIN in Vercel.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("APP_ORIGIN must be a complete http or https URL.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("APP_ORIGIN must be a complete http or https URL.");
  }

  return url.origin;
}

export function getStripeWebhookSecret(): string {
  return requiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripeCryptoProvider() {
  return Stripe.createSubtleCryptoProvider();
}

export function stripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Stripe's 2025-03-31 API moved subscription period dates onto subscription
 * items. Supporting both shapes keeps existing and newer webhook versions safe.
 */
export function stripeCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const legacyEnd = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const itemEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  const unixSeconds = legacyEnd ?? (itemEnds.length ? Math.max(...itemEnds) : undefined);
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}
