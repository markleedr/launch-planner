import { describe, expect, test } from "bun:test";
import { calculateProposalCost, emptyProposalValues } from "./pricing";

describe("calculateProposalCost", () => {
  test("uses the approved one-off, quantity and monthly formula", () => {
    const result = calculateProposalCost({
      ...emptyProposalValues(),
      agencyOneOffCents: 400_000,
      agencyMonthlyCents: 100_000,
      productionUnitCents: 75_000,
      mediaOneOffCents: 250_000,
      mediaMonthlyCents: 500_000,
      quantity: 3,
      months: 4,
    });

    expect(result).toEqual({
      agencyCents: 800_000,
      productionCents: 225_000,
      mediaCents: 2_250_000,
      totalCents: 3_275_000,
    });
  });

  test("treats third-party production marked TBC as zero", () => {
    const result = calculateProposalCost({
      ...emptyProposalValues(),
      productionUnitCents: 900_000,
      productionToBeConfirmed: true,
      quantity: 20,
    });

    expect(result.productionCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  test("clamps invalid and negative inputs", () => {
    const result = calculateProposalCost({
      ...emptyProposalValues(),
      agencyOneOffCents: Number.NaN,
      agencyMonthlyCents: -1,
      productionUnitCents: 100,
      mediaOneOffCents: -20,
      mediaMonthlyCents: 50,
      quantity: -3,
      months: 2.9,
    });

    expect(result).toEqual({
      agencyCents: 0,
      productionCents: 0,
      mediaCents: 100,
      totalCents: 100,
    });
  });
});
