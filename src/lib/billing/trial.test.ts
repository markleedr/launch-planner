import { describe, expect, test } from "bun:test";
import { stripeCurrentPeriodEnd } from "./stripe.server";
import {
  DEFAULT_TRIAL_DAYS,
  OCTOBER_PROMO_CODE,
  OCTOBER_PROMO_EXPIRES_AT,
  PROMO_TRIAL_DAYS,
  assertPromoScriptKey,
  buildSignupCheckoutDraft,
  buildSubscribeCheckoutDraft,
  decidePaidAccess,
  evaluateSignupTrial,
  incomingTrialReplacesExisting,
  octoberCouponCreateParams,
  octoberPromoExpiresUnix,
  trialDaysRemainingLabel,
  trialEndFromSignup,
  trialIndicatorText,
  trialRequiresCard,
  type PromoRedemption,
} from "./trial";

const SIGNUP_AT = new Date("2026-10-01T02:00:00.000Z");
const ACTIVE_PROMO = {
  code: OCTOBER_PROMO_CODE,
  active: true,
  expiresAt: octoberPromoExpiresUnix(),
};

describe("trial card switch", () => {
  test("no card unless TRIAL_REQUIRE_CARD is exactly true", () => {
    expect(trialRequiresCard({})).toBe(false);
    expect(trialRequiresCard({ TRIAL_REQUIRE_CARD: "false" })).toBe(false);
    expect(trialRequiresCard({ TRIAL_REQUIRE_CARD: " TRUE " })).toBe(true);
  });
});

describe("signup using OCT15FREE ends with a 30-day trial, not 44 days", () => {
  test("signup using OCT15FREE ends with a 30-day trial, not 44 days", () => {
    const offer = evaluateSignupTrial({
      promoCode: "oct15free",
      email: "ada@example.com",
      now: SIGNUP_AT,
      redemptions: [],
      requireCard: false,
      stripePromotion: ACTIVE_PROMO,
    });
    expect(offer.ok).toBe(true);
    if (!offer.ok) return;

    expect(offer.trialDays).toBe(PROMO_TRIAL_DAYS);
    expect(offer.trialDays).toBe(30);
    expect(offer.trialDays).not.toBe(DEFAULT_TRIAL_DAYS + PROMO_TRIAL_DAYS);

    const draft = buildSignupCheckoutDraft({
      priceId: "price_launch_planner_monthly",
      origin: "https://launchplanner.com.au",
      offer,
      metadata: { app: "launch-planner", signup_flow: "pay_first" },
      customerEmail: "ada@example.com",
    });

    expect(draft.subscription_data.trial_period_days).toBe(30);
    expect(draft.allow_promotion_codes).toBe(false);
    expect("discounts" in draft).toBe(false);
    expect(draft.payment_method_collection).toBe("if_required");
    expect(draft.metadata.promo_code).toBe(OCTOBER_PROMO_CODE);
    expect(draft.metadata.trial_days).toBe("30");

    const trialEnd = trialEndFromSignup(SIGNUP_AT, draft.subscription_data.trial_period_days);
    const stackedEnd = trialEndFromSignup(SIGNUP_AT, DEFAULT_TRIAL_DAYS + PROMO_TRIAL_DAYS);
    expect(trialEnd.toISOString()).toBe("2026-10-31T02:00:00.000Z");
    expect(stackedEnd.toISOString()).toBe("2026-11-14T02:00:00.000Z");
    expect(trialEnd.getTime() - SIGNUP_AT.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
    expect(trialEnd.getTime() - SIGNUP_AT.getTime()).not.toBe(44 * 24 * 60 * 60 * 1000);

    const periodEnd = stripeCurrentPeriodEnd({
      status: "trialing",
      trial_end: Math.floor(trialEnd.getTime() / 1000),
      items: {
        data: [{ current_period_end: Math.floor(stackedEnd.getTime() / 1000) }],
      },
    });
    expect(periodEnd?.toISOString()).toBe(trialEnd.toISOString());
    expect(trialIndicatorText("trialing", periodEnd, SIGNUP_AT)).toBe("30 days left in your trial");
    expect(trialIndicatorText("trialing", stackedEnd, SIGNUP_AT)).not.toBe(
      "30 days left in your trial",
    );
  });
});

describe("October promotion code", () => {
  test("a signup without the code gets 14 days and does not collect a card", () => {
    const offer = evaluateSignupTrial({ now: SIGNUP_AT, requireCard: false });
    expect(offer).toEqual({
      ok: true,
      trialDays: 14,
      promoCode: null,
      requireCard: false,
    });
    if (!offer.ok) return;
    const draft = buildSignupCheckoutDraft({
      priceId: "price_x",
      origin: "https://launchplanner.com.au",
      offer,
      metadata: { app: "launch-planner" },
    });
    expect(draft.subscription_data.trial_period_days).toBe(14);
    expect(draft.payment_method_collection).toBe("if_required");
    expect(draft.subscription_data.trial_settings?.end_behavior.missing_payment_method).toBe(
      "cancel",
    );
  });

  test("TRIAL_REQUIRE_CARD collects a card and still uses the chosen trial length", () => {
    const offer = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "ada@example.com",
      now: SIGNUP_AT,
      requireCard: true,
      stripePromotion: ACTIVE_PROMO,
    });
    expect(offer.ok).toBe(true);
    if (!offer.ok) return;
    const draft = buildSignupCheckoutDraft({
      priceId: "price_x",
      origin: "https://launchplanner.com.au",
      offer,
      metadata: { app: "launch-planner" },
      customerId: "cus_ada",
    });
    expect(draft.payment_method_collection).toBe("always");
    expect(draft.subscription_data.trial_period_days).toBe(30);
    expect(draft.subscription_data.trial_settings).toBeUndefined();
    expect(draft.customer).toBe("cus_ada");
  });

  test("the code is accepted at 11:59:59 pm AEST on 31 October 2026 and rejected a second later", () => {
    const accepted = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "ada@example.com",
      now: OCTOBER_PROMO_EXPIRES_AT,
      stripePromotion: ACTIVE_PROMO,
    });
    const rejected = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "ada@example.com",
      now: new Date(OCTOBER_PROMO_EXPIRES_AT.getTime() + 1000),
      stripePromotion: ACTIVE_PROMO,
    });
    expect(accepted.ok).toBe(true);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.message).toContain("expired");
  });

  test("a code signup on 31 October 2026 before 13:59:59Z still gets 30 days", () => {
    const signupAt = new Date("2026-10-31T01:00:00.000Z");
    const offer = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "ada@example.com",
      now: signupAt,
      redemptions: [],
      stripePromotion: ACTIVE_PROMO,
    });
    expect(offer.ok).toBe(true);
    if (!offer.ok) return;
    expect(offer.trialDays).toBe(PROMO_TRIAL_DAYS);
    expect(offer.trialDays).toBe(30);
    expect(offer.trialDays).not.toBe(DEFAULT_TRIAL_DAYS + PROMO_TRIAL_DAYS);
    const trialEnd = trialEndFromSignup(signupAt, offer.trialDays);
    expect(trialEnd.toISOString()).toBe("2026-11-30T01:00:00.000Z");
    expect(trialEnd.getTime() - signupAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  test("the code is rejected after 2026-10-31T13:59:59Z", () => {
    const rejected = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "ada@example.com",
      now: new Date("2026-10-31T14:00:00.000Z"),
      redemptions: [],
      stripePromotion: ACTIVE_PROMO,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.message).toBe(
        "That promotion code expired at 11:59 pm AEST on 31 October 2026.",
      );
    }
  });

  test("a second use by the same account is rejected", () => {
    const redemptions: PromoRedemption[] = [
      {
        code: OCTOBER_PROMO_CODE,
        email: "ada@example.com",
        stripeCustomerId: "cus_ada",
        userId: "user_ada",
      },
    ];
    const sameEmail = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "Ada@Example.com",
      now: SIGNUP_AT,
      redemptions,
      stripePromotion: ACTIVE_PROMO,
    });
    const sameCustomer = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "other@example.com",
      stripeCustomerId: "cus_ada",
      now: SIGNUP_AT,
      redemptions,
      stripePromotion: ACTIVE_PROMO,
    });
    expect(sameEmail.ok).toBe(false);
    expect(sameCustomer.ok).toBe(false);
    if (!sameEmail.ok) expect(sameEmail.message).toContain("already been used");
  });

  test("an unknown code is rejected", () => {
    const offer = evaluateSignupTrial({
      promoCode: "NOTACODE",
      email: "ada@example.com",
      now: SIGNUP_AT,
    });
    expect(offer.ok).toBe(false);
  });

  test("an inactive Stripe promotion code is rejected", () => {
    const offer = evaluateSignupTrial({
      promoCode: OCTOBER_PROMO_CODE,
      email: "ada@example.com",
      now: SIGNUP_AT,
      stripePromotion: { code: OCTOBER_PROMO_CODE, active: false, expiresAt: null },
    });
    expect(offer.ok).toBe(false);
  });
});

describe("trial access", () => {
  test("days left copy follows the trial end", () => {
    const end = new Date("2026-10-15T02:00:00.000Z");
    expect(trialIndicatorText("trialing", end, SIGNUP_AT)).toBe("14 days left in your trial");
    expect(trialIndicatorText("active", end, SIGNUP_AT)).toBeNull();
    expect(trialDaysRemainingLabel(1)).toBe("1 day left in your trial");
    expect(trialIndicatorText("trialing", SIGNUP_AT, new Date("2026-10-01T06:00:00.000Z"))).toBe(
      "Your trial ends today",
    );
  });

  test("an elapsed trial prompts to subscribe and does not delete data", () => {
    const decision = decidePaidAccess(
      {
        status: "canceled",
        currentPeriodEnd: new Date("2026-10-15T00:00:00.000Z"),
      },
      new Date("2026-10-16T00:00:00.000Z"),
    );
    expect(decision).toEqual({ allowed: false, prompt: "subscribe", deleteUserData: false });

    const stillInTrial = decidePaidAccess(
      { status: "trialing", currentPeriodEnd: new Date("2026-10-31T00:00:00.000Z") },
      SIGNUP_AT,
    );
    expect(stillInTrial.allowed).toBe(true);
    expect(stillInTrial.deleteUserData).toBe(false);
  });

  test("subscribing after the trial does not start another trial", () => {
    const draft = buildSubscribeCheckoutDraft({
      priceId: "price_x",
      origin: "https://launchplanner.com.au",
      customerId: "cus_ada",
      userId: "user_ada",
      metadata: { app: "launch-planner" },
      subscriptionMetadata: { app: "launch-planner", user_id: "user_ada" },
    });
    expect(draft.payment_method_collection).toBe("always");
    expect(draft.allow_promotion_codes).toBe(false);
    expect("trial_period_days" in draft.subscription_data).toBe(false);
    expect("discounts" in draft).toBe(false);
  });

  test("a second trialing subscription does not replace the one already stored", () => {
    expect(
      incomingTrialReplacesExisting(
        { stripeSubscriptionId: "sub_old", status: "canceled" },
        { id: "sub_new", status: "trialing" },
      ),
    ).toBe("keep_existing");
    expect(
      incomingTrialReplacesExisting(
        { stripeSubscriptionId: "sub_old", status: "trialing" },
        { id: "sub_old", status: "active" },
      ),
    ).toBe("persist");
    expect(incomingTrialReplacesExisting(null, { id: "sub_new", status: "trialing" })).toBe(
      "persist",
    );
  });
});

describe("October Stripe coupon payload", () => {
  test("the stored coupon expires at 11:59:59 pm AEST and is marked as a trial replacement", () => {
    const coupon = octoberCouponCreateParams();
    expect(coupon.id).toBe("OCT15FREE");
    expect(coupon.redeem_by).toBe(Math.floor(OCTOBER_PROMO_EXPIRES_AT.getTime() / 1000));
    expect(new Date(coupon.redeem_by * 1000).toISOString()).toBe("2026-10-31T13:59:59.000Z");
    expect(coupon.metadata.effect).toBe("replace_14_day_trial_with_30_days");
    expect(coupon.metadata.apply_as_discount).toBe("false");
    expect(coupon.metadata.effect).not.toContain("44");
  });

  test("the script refuses a live key unless live creation is explicitly allowed", () => {
    expect(assertPromoScriptKey(undefined, false).ok).toBe(false);
    expect(assertPromoScriptKey("sk_test_123", false)).toEqual({ ok: true, mode: "test" });
    expect(assertPromoScriptKey("sk_live_123", false).ok).toBe(false);
    expect(assertPromoScriptKey("sk_live_123", true)).toEqual({ ok: true, mode: "live" });
  });
});
