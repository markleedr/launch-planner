import { describe, expect, test } from "bun:test";
import {
  LAUNCH_PLANNER_APP,
  classifyOwnership,
  configuredPriceIds,
  configuredProductIds,
  extractBillingSignals,
} from "./launch-planner-billing";

const LP_PRICE = "price_launch_planner_monthly";
const CP_PRICE = "price_content_proof_pro";

describe("Launch Planner billing recognition", () => {
  test("keeps STRIPE_PRICE_ID and adds extras from the environment", () => {
    const ids = configuredPriceIds({
      STRIPE_PRICE_ID: `  ${LP_PRICE}  `,
      LAUNCH_PLANNER_PRICE_IDS: " price_extra , ,price_second ",
    });
    expect(ids.has(LP_PRICE)).toBe(true);
    expect(ids.has("price_extra")).toBe(true);
    expect(ids.has("price_second")).toBe(true);
    expect(configuredProductIds({ LAUNCH_PLANNER_PRODUCT_IDS: " prod_lp , prod_other " })).toEqual(
      new Set(["prod_lp", "prod_other"]),
    );
  });

  test("treats the configured price as ours and any other price as foreign", () => {
    const prices = configuredPriceIds({ STRIPE_PRICE_ID: LP_PRICE });
    const ours = extractBillingSignals({
      items: { data: [{ price: { id: LP_PRICE, product: "prod_lp" } }] },
    });
    const foreign = extractBillingSignals({
      items: { data: [{ price: { id: CP_PRICE, product: "prod_cp" } }] },
      metadata: { app: "contentproof", user_id: "someone-else" },
    });
    expect(classifyOwnership(ours, prices, new Set())).toBe("ours");
    expect(classifyOwnership(foreign, prices, new Set())).toBe("foreign");
  });

  test("reads a newer invoice line price", () => {
    const signals = extractBillingSignals({
      lines: {
        data: [{ pricing: { price_details: { price: CP_PRICE, product: "prod_cp" } } }],
      },
    });
    const prices = configuredPriceIds({ STRIPE_PRICE_ID: LP_PRICE });
    expect(classifyOwnership(signals, prices, new Set())).toBe("foreign");
  });

  test("uses the app tag only when the event has no price", () => {
    const prices = configuredPriceIds({ STRIPE_PRICE_ID: LP_PRICE });
    const ours = extractBillingSignals({ metadata: { app: LAUNCH_PLANNER_APP } });
    const foreign = extractBillingSignals({
      metadata: { app: "contentproof", user_id: "cp-user" },
    });
    expect(classifyOwnership(ours, prices, new Set())).toBe("ours");
    expect(classifyOwnership(foreign, prices, new Set())).toBe("foreign");
  });

  test("does not call every price foreign when no price is configured", () => {
    const signals = extractBillingSignals({
      items: { data: [{ price: { id: CP_PRICE, product: "prod_cp" } }] },
    });
    expect(classifyOwnership(signals, new Set(), new Set())).toBe("unknown");
  });

  test("lets an extra product id recognise an event when configured", () => {
    const signals = extractBillingSignals({
      items: { data: [{ price: { id: "price_unknown", product: "prod_lp" } }] },
    });
    const products = configuredProductIds({ LAUNCH_PLANNER_PRODUCT_IDS: "prod_lp" });
    expect(classifyOwnership(signals, new Set(), products)).toBe("ours");
  });
});
