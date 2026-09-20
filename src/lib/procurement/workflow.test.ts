import { describe, expect, test } from "bun:test";
import {
  canTransitionDelivery,
  canTransitionProposal,
  canTransitionVariation,
  proposalValuesToDeliverablePatch,
} from "./workflow";
import { emptyProposalValues } from "./pricing";

describe("proposal workflow", () => {
  test("allows revision before award but makes award terminal", () => {
    expect(canTransitionProposal("invited", "submitted")).toBe(true);
    expect(canTransitionProposal("submitted", "submitted")).toBe(true);
    expect(canTransitionProposal("submitted", "awarded")).toBe(true);
    expect(canTransitionProposal("awarded", "submitted")).toBe(false);
  });

  test("follows the approved delivery lifecycle", () => {
    expect(canTransitionDelivery("awarded", "in_progress")).toBe(true);
    expect(canTransitionDelivery("collateral_submitted", "changes_requested")).toBe(true);
    expect(canTransitionDelivery("changes_requested", "collateral_submitted")).toBe(true);
    expect(canTransitionDelivery("completed", "in_progress")).toBe(false);
  });

  test("requires a decision for submitted variations", () => {
    expect(canTransitionVariation("submitted", "approved")).toBe(true);
    expect(canTransitionVariation("approved", "rejected")).toBe(false);
  });

  test("maps an accepted proposal to deliverable cost fields", () => {
    expect(
      proposalValuesToDeliverablePatch({
        ...emptyProposalValues(),
        setupBusinessDays: 14.8,
        agencyOneOffCents: 100,
        agencyMonthlyCents: 20,
        productionUnitCents: 30,
        mediaOneOffCents: 40,
        mediaMonthlyCents: 50,
        quantity: 2.9,
        months: 4.9,
      }),
    ).toEqual({
      setupLeadDays: 14,
      agencyCostCents: 100,
      agencyMonthlyCostCents: 20,
      productionCostCents: 30,
      productionCostTbc: false,
      mediaCostCents: 40,
      mediaMonthlyCostCents: 50,
      quantity: 2,
      months: 4,
    });
  });
});
