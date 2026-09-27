import { describe, expect, test } from "bun:test";
import { redactSharedBudgets } from "./share-privacy";

describe("redactSharedBudgets", () => {
  test("clears the media budget and deliverable costs, and keeps the GRV", () => {
    const redacted = redactSharedBudgets({
      projectName: "Teneriffe",
      grv: "200000000",
      mediaBudget: "60000",
      deliverables: [
        {
          id: "brand",
          name: "Brand Strategy & Naming",
          agencyCostCents: 2_200_000,
          agencyMonthlyCostCents: 100,
          productionCostCents: 50,
          mediaCostCents: 75,
          mediaMonthlyCostCents: 1_000_000,
          quantity: 1,
          notes: "Scope stays visible",
        },
      ],
    }) as {
      grv: string;
      mediaBudget: string;
      deliverables: Array<Record<string, unknown>>;
    };

    expect(redacted.grv).toBe("200000000");
    expect(redacted.mediaBudget).toBe("");
    expect(redacted.deliverables[0]).toMatchObject({
      name: "Brand Strategy & Naming",
      notes: "Scope stays visible",
      agencyCostCents: 0,
      agencyMonthlyCostCents: 0,
      productionCostCents: 0,
      mediaCostCents: 0,
      mediaMonthlyCostCents: 0,
      quantity: 1,
    });
  });

  test("does not change the original snapshot", () => {
    const original = {
      mediaBudget: "60000",
      deliverables: [{ productionCostCents: 4000 }],
    };
    redactSharedBudgets(original);
    expect(original.mediaBudget).toBe("60000");
    expect(original.deliverables[0]?.productionCostCents).toBe(4000);
  });
});
