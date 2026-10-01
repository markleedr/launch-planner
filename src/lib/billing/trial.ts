/**
 * Free-trial and October promotion rules.
 *
 * The paid price stays the A$49 monthly Stripe Price. A trial only delays the
 * first charge. OCT15FREE replaces the 14-day trial with one 30-day trial.
 * It does not add 30 days on top of 14.
 */

import {
  isSubscriptionActive,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "./subscription";

export const DEFAULT_TRIAL_DAYS = 14;
export const PROMO_TRIAL_DAYS = 30;

/** Customer-facing Stripe promotion code for the 31 October 2026 offer. */
export const OCTOBER_PROMO_CODE = "OCT15FREE";

/**
 * 11:59:59 pm on 31 October 2026 in Brisbane (AEST, UTC+10, no daylight saving).
 * The code is valid through this instant and rejected a second later.
 */
export const OCTOBER_PROMO_EXPIRES_AT = new Date("2026-10-31T13:59:59.000Z");

const DAY_MS = 24 * 60 * 60 * 1000;

export type PromoRedemption = {
  code: string;
  email: string | null;
  stripeCustomerId: string | null;
  userId: string | null;
};

export type StripePromotionSnapshot = {
  code: string;
  active: boolean;
  /** Unix seconds, or null when Stripe has no expiry of its own. */
  expiresAt: number | null;
};

export type TrialOffer =
  | {
      ok: true;
      trialDays: number;
      promoCode: string | null;
      requireCard: boolean;
    }
  | {
      ok: false;
      message: string;
    };

/** Single switch. Only the exact value "true" collects a card. Default is no card. */
export function trialRequiresCard(env: Record<string, string | undefined> = process.env): boolean {
  return env.TRIAL_REQUIRE_CARD?.trim().toLowerCase() === "true";
}

export function normalisePromoCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim().toUpperCase() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function normaliseEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function octoberPromoExpiresUnix(expiresAt: Date = OCTOBER_PROMO_EXPIRES_AT): number {
  return Math.floor(expiresAt.getTime() / 1000);
}

/**
 * Coupon stored in Stripe so the promotion code has a record.
 * Checkout must not apply this coupon: a discount would change the A$49 price.
 * The app reads the code and sets trial length instead.
 */
export function octoberCouponCreateParams(expiresAt: Date = OCTOBER_PROMO_EXPIRES_AT) {
  return {
    id: OCTOBER_PROMO_CODE,
    name: "OCT15 30-day trial",
    percent_off: 100,
    duration: "once" as const,
    redeem_by: octoberPromoExpiresUnix(expiresAt),
    metadata: {
      app: "launch-planner",
      effect: "replace_14_day_trial_with_30_days",
      apply_as_discount: "false",
    },
  };
}

export function octoberPromotionCodeCreateParams(expiresAt: Date = OCTOBER_PROMO_EXPIRES_AT) {
  return {
    code: OCTOBER_PROMO_CODE,
    expires_at: octoberPromoExpiresUnix(expiresAt),
    metadata: {
      app: "launch-planner",
      trial_days: String(PROMO_TRIAL_DAYS),
      replaces_trial_days: String(DEFAULT_TRIAL_DAYS),
      stacks: "false",
    },
    promotion: {
      type: "coupon" as const,
      coupon: OCTOBER_PROMO_CODE,
    },
  };
}

export function matchingRedemption(
  redemptions: readonly PromoRedemption[],
  query: {
    code: string;
    email?: string | null;
    stripeCustomerId?: string | null;
    userId?: string | null;
  },
): PromoRedemption | null {
  const code = normalisePromoCode(query.code);
  const email = normaliseEmail(query.email);
  if (!code) return null;
  return (
    redemptions.find((redemption) => {
      if (normalisePromoCode(redemption.code) !== code) return false;
      if (email && normaliseEmail(redemption.email) === email) return true;
      if (query.stripeCustomerId && redemption.stripeCustomerId === query.stripeCustomerId) {
        return true;
      }
      if (query.userId && redemption.userId === query.userId) return true;
      return false;
    }) ?? null
  );
}

/**
 * Decide the trial a new signup receives.
 * Pass `stripePromotion` once Stripe has been asked. Omit it in pure length checks.
 */
export function evaluateSignupTrial(input: {
  promoCode?: string | null;
  email?: string | null;
  now?: Date;
  redemptions?: readonly PromoRedemption[];
  stripeCustomerId?: string | null;
  userId?: string | null;
  requireCard?: boolean;
  stripePromotion?: StripePromotionSnapshot | null;
}): TrialOffer {
  const now = input.now ?? new Date();
  const requireCard = input.requireCard ?? false;
  const code = normalisePromoCode(input.promoCode);
  if (!code) {
    return { ok: true, trialDays: DEFAULT_TRIAL_DAYS, promoCode: null, requireCard };
  }
  if (code !== OCTOBER_PROMO_CODE) {
    return { ok: false, message: "That promotion code isn't valid." };
  }
  const email = normaliseEmail(input.email);
  if (!email) {
    return {
      ok: false,
      message:
        "Enter the email you'll use for this account. The code can be used once per account.",
    };
  }
  if (
    matchingRedemption(input.redemptions ?? [], {
      code,
      email,
      stripeCustomerId: input.stripeCustomerId,
      userId: input.userId,
    })
  ) {
    return {
      ok: false,
      message: "That promotion code has already been used for this account.",
    };
  }
  if (now.getTime() > OCTOBER_PROMO_EXPIRES_AT.getTime()) {
    return {
      ok: false,
      message: "That promotion code expired at 11:59 pm AEST on 31 October 2026.",
    };
  }
  if (input.stripePromotion !== undefined) {
    const remote = promotionCodeAllowsRedemption(input.stripePromotion, now);
    if (!remote.ok) return remote;
  }
  return { ok: true, trialDays: PROMO_TRIAL_DAYS, promoCode: code, requireCard };
}

export function promotionCodeAllowsRedemption(
  promo: StripePromotionSnapshot | null,
  now: Date,
): { ok: true } | { ok: false; message: string } {
  if (!promo || normalisePromoCode(promo.code) !== OCTOBER_PROMO_CODE || !promo.active) {
    return { ok: false, message: "That promotion code isn't valid." };
  }
  const remoteExpiry = promo.expiresAt == null ? null : promo.expiresAt * 1000;
  const cutoff = Math.min(
    OCTOBER_PROMO_EXPIRES_AT.getTime(),
    remoteExpiry ?? OCTOBER_PROMO_EXPIRES_AT.getTime(),
  );
  if (now.getTime() > cutoff) {
    return {
      ok: false,
      message: "That promotion code expired at 11:59 pm AEST on 31 October 2026.",
    };
  }
  return { ok: true };
}

/** Trial end measured from the moment signup checkout starts the subscription. */
export function trialEndFromSignup(signupAt: Date, trialDays: number): Date {
  return new Date(signupAt.getTime() + trialDays * DAY_MS);
}

export function trialDaysRemaining(periodEnd: Date | null, now: Date): number | null {
  if (!periodEnd) return null;
  const remaining = periodEnd.getTime() - now.getTime();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / DAY_MS);
}

export function trialDaysRemainingLabel(days: number): string {
  if (days <= 0) return "Your trial ends today";
  if (days === 1) return "1 day left in your trial";
  return `${days} days left in your trial`;
}

export function trialIndicatorText(
  status: SubscriptionStatus | null,
  periodEnd: Date | null,
  now: Date,
): string | null {
  if (status !== "trialing") return null;
  const days = trialDaysRemaining(periodEnd, now);
  if (days === null) return null;
  return trialDaysRemainingLabel(days);
}

/**
 * Expired trials and lapsed subscriptions ask the person to subscribe.
 * Nothing in this decision deletes projects or the account.
 */
export function decidePaidAccess(
  record: SubscriptionRecord | null | undefined,
  now: Date = new Date(),
): { allowed: boolean; prompt: null | "subscribe"; deleteUserData: false } {
  const allowed = isSubscriptionActive(record, now);
  return { allowed, prompt: allowed ? null : "subscribe", deleteUserData: false };
}

export type SignupCheckoutDraft = {
  mode: "subscription";
  line_items: [{ price: string; quantity: 1 }];
  payment_method_collection: "always" | "if_required";
  /** The code is handled before checkout. Stripe must not also apply a discount. */
  allow_promotion_codes: false;
  billing_address_collection: "auto";
  customer?: string;
  customer_email?: string;
  metadata: Record<string, string>;
  subscription_data: {
    trial_period_days: number;
    trial_settings?: { end_behavior: { missing_payment_method: "cancel" } };
    metadata: Record<string, string>;
  };
  success_url: string;
  cancel_url: string;
};

export function buildSignupCheckoutDraft(input: {
  priceId: string;
  origin: string;
  offer: Extract<TrialOffer, { ok: true }>;
  metadata: Record<string, string>;
  customerId?: string | null;
  customerEmail?: string | null;
}): SignupCheckoutDraft {
  const metadata: Record<string, string> = {
    ...input.metadata,
    trial_days: String(input.offer.trialDays),
    ...(input.offer.promoCode ? { promo_code: input.offer.promoCode } : {}),
  };
  const draft: SignupCheckoutDraft = {
    mode: "subscription",
    line_items: [{ price: input.priceId, quantity: 1 }],
    payment_method_collection: input.offer.requireCard ? "always" : "if_required",
    allow_promotion_codes: false,
    billing_address_collection: "auto",
    metadata,
    subscription_data: {
      trial_period_days: input.offer.trialDays,
      metadata,
    },
    success_url: `${input.origin}/welcome`,
    cancel_url: `${input.origin}/pricing?checkout=cancel`,
  };
  if (!input.offer.requireCard) {
    draft.subscription_data.trial_settings = {
      end_behavior: { missing_payment_method: "cancel" },
    };
  }
  if (input.customerId) draft.customer = input.customerId;
  else if (input.customerEmail) draft.customer_email = input.customerEmail;
  return draft;
}

export type SubscribeCheckoutDraft = {
  mode: "subscription";
  customer: string;
  client_reference_id: string;
  line_items: [{ price: string; quantity: 1 }];
  payment_method_collection: "always";
  allow_promotion_codes: false;
  metadata: Record<string, string>;
  subscription_data: { metadata: Record<string, string> };
  success_url: string;
  cancel_url: string;
};

/** Paid checkout after a trial. There is no second trial and no promo stacking. */
export function buildSubscribeCheckoutDraft(input: {
  priceId: string;
  origin: string;
  customerId: string;
  userId: string;
  metadata: Record<string, string>;
  subscriptionMetadata: Record<string, string>;
}): SubscribeCheckoutDraft {
  return {
    mode: "subscription",
    customer: input.customerId,
    client_reference_id: input.userId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    payment_method_collection: "always",
    allow_promotion_codes: false,
    metadata: input.metadata,
    subscription_data: { metadata: input.subscriptionMetadata },
    success_url: `${input.origin}/projects?checkout=success`,
    cancel_url: `${input.origin}/pricing?checkout=cancel`,
  };
}

/**
 * A second trialing subscription must not replace one this account already has.
 * A later paid subscription may replace a trial.
 */
export function incomingTrialReplacesExisting(
  existing: { stripeSubscriptionId: string | null; status: string } | null,
  incoming: { id: string; status: string },
): "persist" | "keep_existing" {
  if (!existing?.stripeSubscriptionId) return "persist";
  if (existing.stripeSubscriptionId === incoming.id) return "persist";
  if (incoming.status === "trialing") return "keep_existing";
  return "persist";
}

export function assertPromoScriptKey(
  key: string | undefined,
  allowLive: boolean,
): { ok: true; mode: "test" | "live" } | { ok: false; message: string } {
  const value = key?.trim() ?? "";
  if (!value) {
    return {
      ok: false,
      message:
        "Set STRIPE_SECRET_KEY to a test key (sk_test_...) and run this script again. Live keys are refused unless you set STRIPE_PROMO_ALLOW_LIVE=yes yourself.",
    };
  }
  if (value.startsWith("sk_test_")) return { ok: true, mode: "test" };
  if (value.startsWith("sk_live_")) {
    if (!allowLive) {
      return {
        ok: false,
        message:
          "This key is live. The script will not create the live coupon unless STRIPE_PROMO_ALLOW_LIVE=yes is set in the same command. Do that only when you mean to change the live Stripe account.",
      };
    }
    return { ok: true, mode: "live" };
  }
  return {
    ok: false,
    message: "STRIPE_SECRET_KEY must be a Stripe secret key starting with sk_test_ or sk_live_.",
  };
}
