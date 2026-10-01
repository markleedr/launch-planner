/**
 * Create the OCT15FREE coupon and promotion code. Safe to run more than once.
 *
 * Launch Planner does not apply this coupon as a price discount. Checkout
 * reads the code and starts a 30-day trial instead of the usual 14 days
 * (30 days total, not 44). The A$49 price and GST settings are not changed.
 *
 * Test mode (this is the command to run before the October push, against
 * Stripe test data):
 *
 *   STRIPE_SECRET_KEY=sk_test_... bun scripts/create-october-promo.ts
 *
 * The script refuses live keys unless you opt in yourself:
 *
 *   STRIPE_PROMO_ALLOW_LIVE=yes STRIPE_SECRET_KEY=sk_live_... bun scripts/create-october-promo.ts
 *
 * Only do that when you intend to create the code on the live Stripe account.
 * Preview the payload without calling Stripe:
 *
 *   bun scripts/create-october-promo.ts --dry-run
 *
 * Dashboard equivalent, if you would rather click it:
 * 1. Turn Stripe's test mode on (or live mode, when you mean to).
 * 2. Product catalogue → Coupons → Create coupon.
 *    ID OCT15FREE, name "OCT15 30-day trial", 100% off, duration once,
 *    redeem by 15 Oct 2026 11:59:59 pm Brisbane time.
 *    Do not apply this coupon to a customer or subscription.
 * 3. Create promotion code OCT15FREE on that coupon, expiring at the same
 *    moment. Customer eligibility: any customer, one use enforced by
 *    Launch Planner per email and Stripe customer.
 * 4. Leave the Launch Planner price at A$49 per month. Do not edit tax.
 */
import Stripe from "stripe";
import {
  OCTOBER_PROMO_CODE,
  OCTOBER_PROMO_EXPIRES_AT,
  assertPromoScriptKey,
  octoberCouponCreateParams,
  octoberPromotionCodeCreateParams,
} from "../src/lib/billing/trial";

const dryRun = process.argv.includes("--dry-run");
const allowLive = process.env.STRIPE_PROMO_ALLOW_LIVE?.trim().toLowerCase() === "yes";

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "resource_missing"
  );
}

async function main() {
  const coupon = octoberCouponCreateParams();
  const promotion = octoberPromotionCodeCreateParams();
  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          expiresAt: OCTOBER_PROMO_EXPIRES_AT.toISOString(),
          coupon,
          promotion,
          note: "Checkout must not attach this coupon. It replaces the 14-day trial with 30 days.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const decision = assertPromoScriptKey(process.env.STRIPE_SECRET_KEY, allowLive);
  if (!decision.ok) {
    console.error(decision.message);
    process.exitCode = 1;
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let couponId = coupon.id;
  try {
    const existing = await stripe.coupons.retrieve(coupon.id);
    couponId = existing.id;
    await stripe.coupons.update(existing.id, {
      name: coupon.name,
      metadata: coupon.metadata,
    });
    console.log(
      `Coupon ${existing.id} already exists. Metadata refreshed. Mode: ${decision.mode}.`,
    );
  } catch (error) {
    if (!isMissing(error)) throw error;
    const created = await stripe.coupons.create(coupon);
    couponId = created.id;
    console.log(`Created coupon ${created.id}. Mode: ${decision.mode}.`);
  }

  const existingCodes = await stripe.promotionCodes.list({
    code: OCTOBER_PROMO_CODE,
    coupon: couponId,
    limit: 1,
  });
  const found = existingCodes.data.find((item) => item.code.toUpperCase() === OCTOBER_PROMO_CODE);
  if (found) {
    if (!found.active) {
      await stripe.promotionCodes.update(found.id, { active: true, metadata: promotion.metadata });
    } else {
      await stripe.promotionCodes.update(found.id, { metadata: promotion.metadata });
    }
    const expiryMatches = found.expires_at === promotion.expires_at;
    console.log(
      `Promotion code ${found.code} (${found.id}) already exists. expires_at ${found.expires_at ?? "unset"}.`,
    );
    if (!expiryMatches) {
      console.log(
        `Stripe does not let this script change expires_at. Expected ${promotion.expires_at} (${OCTOBER_PROMO_EXPIRES_AT.toISOString()}). Deactivate ${found.id} in the Dashboard and create the code again if the expiry is wrong.`,
      );
    }
    return;
  }

  const createdCode = await stripe.promotionCodes.create({
    ...promotion,
    promotion: { type: "coupon", coupon: couponId },
  });
  console.log(
    `Created promotion code ${createdCode.code} (${createdCode.id}), expires ${OCTOBER_PROMO_EXPIRES_AT.toISOString()} (11:59:59 pm AEST on 15 Oct 2026).`,
  );
  console.log(
    "Do not apply this coupon to a subscription. Launch Planner uses the code only to set a 30-day trial.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
