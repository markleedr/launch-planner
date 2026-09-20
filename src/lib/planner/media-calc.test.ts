import { describe, expect, test } from "bun:test";
import {
  computeMediaPlan,
  DEFAULT_MEDIA_INPUTS,
  generateGrowthWeights,
  mediaPlanToDeliverables,
} from "./media-calc";

describe("generateGrowthWeights", () => {
  test("single week is all weight", () => {
    expect(generateGrowthWeights(1)).toEqual([1]);
  });

  test("weights grow 10% per week and sum to 1", () => {
    const w = generateGrowthWeights(8);
    expect(w).toHaveLength(8);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(w[1] / w[0]).toBeCloseTo(1.1, 6);
  });
});

describe("computeMediaPlan - default inputs", () => {
  const plan = computeMediaPlan(DEFAULT_MEDIA_INPUTS);

  test("blended cost per sale weighted by share", () => {
    // 0.6*9000 + 0.4*7000 = 8200
    expect(plan.blendedCps).toBeCloseTo(8200, 6);
  });

  test("leads and total budget", () => {
    expect(plan.leadsPerSale).toBeCloseTo(164, 6); // 8200 / 50
    expect(plan.bufferedLeads).toBe(4920); // ceil(164*25*1.2)
    expect(plan.totalBudget).toBe(246_000); // 4920 * 50
    expect(plan.weeklySpend).toBeCloseTo(246_000 / 52, 6); // 246000 / 52
  });

  test("per-channel totals reconcile to the budget", () => {
    expect(plan.channelTotals.meta).toBeCloseTo(147_600, 4); // 60%
    expect(plan.channelTotals.google).toBeCloseTo(98_400, 4); // 40%
    expect(plan.channelTotals.listing).toBe(0);
    expect(
      plan.channelTotals.meta + plan.channelTotals.google + plan.channelTotals.listing,
    ).toBeCloseTo(plan.totalBudget, 4);
  });

  test("GDV, ROI, media % of GDV and conversion rate", () => {
    expect(plan.gdv).toBe(62_500_000); // 25 * 2,500,000
    expect(plan.roi).toBeCloseTo(62_500_000 / 246_000, 6);
    expect(plan.mediaPctGdv).toBeCloseTo((246_000 / 62_500_000) * 100, 6);
    expect(plan.conversionRate).toBeCloseTo((1 / 164) * 100, 6);
  });

  test("weekly schedule reconciles to totals", () => {
    expect(plan.weeks).toHaveLength(52);
    expect(plan.weeks.reduce((s, w) => s + w.leads, 0)).toBe(plan.bufferedLeads);
    expect(plan.weeks.reduce((s, w) => s + w.total, 0)).toBeCloseTo(plan.totalBudget, 2);
  });

  test("ramping spends less in week 1 than week 52", () => {
    expect(plan.weeks[0].total).toBeLessThan(plan.weeks[51].total);
  });
});

describe("computeMediaPlan - edge cases", () => {
  test("flat pacing spreads evenly", () => {
    const plan = computeMediaPlan({ ...DEFAULT_MEDIA_INPUTS, useRamping: false });
    expect(plan.weeks[0].total).toBeCloseTo(plan.weeks[7].total, 6);
  });

  test("no active channels yields a zero plan", () => {
    const plan = computeMediaPlan({
      ...DEFAULT_MEDIA_INPUTS,
      channels: {
        meta: { active: false, cps: 9000, share: 0 },
        google: { active: false, cps: 7000, share: 0 },
        listing: { active: false, cps: 12000, share: 0 },
      },
    });
    expect(plan.totalBudget).toBe(0);
    expect(plan.blendedCps).toBe(0);
  });

  test("shares are normalised even if they don't sum to 100", () => {
    const plan = computeMediaPlan({
      ...DEFAULT_MEDIA_INPUTS,
      channels: {
        meta: { active: true, cps: 9000, share: 3 }, // 3:1 -> 75/25
        google: { active: true, cps: 7000, share: 1 },
        listing: { active: false, cps: 12000, share: 0 },
      },
    });
    expect(plan.blendedCps).toBeCloseTo(0.75 * 9000 + 0.25 * 7000, 6);
  });
});

describe("mediaPlanToDeliverables", () => {
  test("creates editable deliverables only for active channels", () => {
    const input = {
      ...DEFAULT_MEDIA_INPUTS,
      campaignWeeks: 9,
    };
    const plan = computeMediaPlan(input);
    const deliverables = mediaPlanToDeliverables(input, plan, new Date("2026-07-01T00:00:00Z"));

    expect(deliverables).toHaveLength(2);
    expect(deliverables.map((item) => item.name)).toEqual([
      "Meta media campaign",
      "Google Ads campaign",
    ]);
    expect(deliverables[0].mediaCostCents).toBe(Math.round(plan.channelTotals.meta * 100));
    expect(deliverables[0].months).toBe(3);
    expect(deliverables[0].quantity).toBe(1);
    expect(deliverables[0].requiredFormats).toContain("Monthly performance report");
  });
});
