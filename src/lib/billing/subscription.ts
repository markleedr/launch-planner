/**
 * Subscription domain logic. Pure and framework-agnostic (no React, no Supabase,
 * no Stripe SDK) so it can be unit-tested and run on client or server.
 *
 * The single source of truth for "can this user use the paid app" is
 * `isSubscriptionActive`. Everything else (hooks, gates, server sync) feeds a
 * `SubscriptionRecord` into it.
 */

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface SubscriptionRecord {
  status: SubscriptionStatus;
  /** End of the current paid/trial period; null when never subscribed. */
  currentPeriodEnd: Date | null;
}

/** Statuses that grant access while the period is still current. */
const ACCESS_STATUSES: ReadonlySet<SubscriptionStatus> = new Set(["active", "trialing"]);

const KNOWN_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

/** Safely contain future Stripe statuses rather than accidentally granting access. */
export function normaliseSubscriptionStatus(status: string): SubscriptionStatus {
  return KNOWN_STATUSES.has(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : "inactive";
}

/**
 * True when the record grants access to the paid product right now. A record is
 * active when its status is `active`/`trialing`, Stripe supplied a current
 * period end, and that period has not elapsed.
 */
export function isSubscriptionActive(
  record: SubscriptionRecord | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!record) return false;
  if (!ACCESS_STATUSES.has(record.status)) return false;
  if (!record.currentPeriodEnd) return false;
  return record.currentPeriodEnd.getTime() >= now.getTime();
}

/**
 * Display + config for the single paid plan. The real charge amount lives in the
 * Stripe Price (referenced by STRIPE_PRICE_ID); `priceLabel` is only what we show
 * on the pricing page. Adjust these to change copy without touching logic.
 */
export const BILLING_PLAN = {
  name: "Launch Planner",
  amountCents: 4_900,
  currency: "aud",
  priceLabel: "$49",
  pricePeriod: "per month",
  features: [
    "Unlimited saved projects",
    "Costed, scheduled launch plans",
    "Media budget calculator",
    "Buyer personas & channel recommendations",
    "Auto-save across devices",
  ],
} as const;
