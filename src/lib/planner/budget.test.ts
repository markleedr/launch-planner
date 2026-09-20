import { describe, expect, test } from "bun:test";
import { deliverableCosts, summariseBudget } from "./budget";
import { toCents } from "./money";
import type { Deliverable } from "./types";

function deliverable(partial: Partial<Deliverable>): Deliverable {
  return {
    id: partial.id ?? "d",
    name: partial.name ?? "Item",
    category: partial.category ?? "digital_performance",
    productionCostCents: partial.productionCostCents ?? 0,
    mediaCostCents: partial.mediaCostCents ?? 0,
    setupLeadDays: partial.setupLeadDays ?? 0,
    startDate: partial.startDate ?? new Date("2026-06-01"),
    endDate: partial.endDate ?? new Date("2026-06-30"),
    recurrence: partial.recurrence,
    dependsOn: partial.dependsOn,
    agencyCostCents: partial.agencyCostCents,
    agencyMonthlyCostCents: partial.agencyMonthlyCostCents,
    mediaMonthlyCostCents: partial.mediaMonthlyCostCents,
    productionCostTbc: partial.productionCostTbc,
    quantity: partial.quantity,
    months: partial.months,
  };
}

describe("summariseBudget", () => {
  const deliverables: Deliverable[] = [
    deliverable({
      id: "ppc",
      category: "digital_performance",
      productionCostCents: toCents(2_000),
      mediaCostCents: toCents(20_000),
    }),
    deliverable({
      id: "social",
      category: "digital_performance",
      productionCostCents: toCents(3_000),
      mediaCostCents: toCents(10_000),
    }),
    deliverable({
      id: "billboard",
      category: "outdoor",
      productionCostCents: toCents(5_000),
      mediaCostCents: toCents(60_000),
    }),
  ];

  const summary = summariseBudget(deliverables, {
    mediaBudgetCents: toCents(100_000),
    grvCents: toCents(15_000_000),
  });

  test("groups by category with subtotals", () => {
    const digital = summary.categories.find((c) => c.category === "digital_performance")!;
    expect(digital.count).toBe(2);
    expect(digital.productionCents).toBe(toCents(5_000));
    expect(digital.mediaCents).toBe(toCents(30_000));
    expect(digital.totalCents).toBe(toCents(35_000));
  });

  test("categories are returned in stable sorted order", () => {
    expect(summary.categories.map((c) => c.category)).toEqual(["digital_performance", "outdoor"]);
  });

  test("grand totals reconcile with category subtotals", () => {
    const sumOfCategories = summary.categories.reduce((acc, c) => acc + c.totalCents, 0);
    expect(summary.grandTotalCents).toBe(sumOfCategories);
    expect(summary.grandTotalCents).toBe(summary.productionTotalCents + summary.mediaTotalCents);
    expect(summary.grandTotalCents).toBe(toCents(100_000));
  });

  test("variance vs media budget (positive => over)", () => {
    expect(summary.varianceVsMediaBudgetCents).toBe(0);
    const over = summariseBudget(deliverables, {
      mediaBudgetCents: toCents(80_000),
      grvCents: toCents(15_000_000),
    });
    expect(over.varianceVsMediaBudgetCents).toBe(toCents(20_000));
  });

  test("total as % of GRV", () => {
    // 100,000 / 15,000,000 ≈ 0.6667%
    expect(summary.totalPctOfGrv).toBeCloseTo(100_000 / 15_000_000, 6);
  });

  test("deliverableCosts includes monthly rates x months (not just one-off)", () => {
    const d = deliverable({
      productionCostCents: 0,
      mediaCostCents: 0,
      agencyMonthlyCostCents: toCents(1_559),
      mediaMonthlyCostCents: toCents(2_400),
      months: 9,
      quantity: 1,
    });
    const costs = deliverableCosts(d);
    // Media 2,400/mo x 9 = 21,600; agency 1,559/mo x 9 = 14,031 production.
    expect(costs.mediaCents).toBe(toCents(21_600));
    expect(costs.productionCents).toBe(toCents(14_031));
    expect(costs.totalCents).toBe(toCents(21_600 + 14_031));
    // The raw one-off fields alone would have shown zero.
    expect(d.mediaCostCents + d.productionCostCents).toBe(0);
  });

  test("empty list yields zeroed summary", () => {
    const empty = summariseBudget([], {
      mediaBudgetCents: toCents(50_000),
      grvCents: 0,
    });
    expect(empty.grandTotalCents).toBe(0);
    expect(empty.categories).toHaveLength(0);
    expect(empty.totalPctOfGrv).toBe(0);
    expect(empty.varianceVsMediaBudgetCents).toBe(toCents(-50_000));
  });
});
