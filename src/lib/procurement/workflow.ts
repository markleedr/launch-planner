import type {
  CollateralReviewStatus,
  DeliveryStatus,
  ProposalStatus,
  ProposalValues,
  VariationStatus,
} from "./types";

const PROPOSAL_TRANSITIONS: Record<ProposalStatus, ReadonlySet<ProposalStatus>> = {
  draft: new Set(["invited", "withdrawn"]),
  invited: new Set(["submitted", "expired", "withdrawn"]),
  submitted: new Set(["submitted", "awarded", "unsuccessful", "expired", "withdrawn"]),
  awarded: new Set(),
  unsuccessful: new Set(),
  withdrawn: new Set(),
  expired: new Set(["invited"]),
};

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, ReadonlySet<DeliveryStatus>> = {
  invitation_sent: new Set(["proposal_submitted"]),
  proposal_submitted: new Set(["awarded"]),
  awarded: new Set(["in_progress"]),
  in_progress: new Set(["collateral_requested"]),
  collateral_requested: new Set(["collateral_submitted"]),
  collateral_submitted: new Set(["changes_requested", "approved"]),
  changes_requested: new Set(["collateral_submitted"]),
  approved: new Set(["completed"]),
  completed: new Set(),
};

const VARIATION_TRANSITIONS: Record<VariationStatus, ReadonlySet<VariationStatus>> = {
  submitted: new Set(["approved", "rejected", "withdrawn"]),
  approved: new Set(),
  rejected: new Set(),
  withdrawn: new Set(),
};

export function canTransitionProposal(from: ProposalStatus, to: ProposalStatus): boolean {
  return PROPOSAL_TRANSITIONS[from].has(to);
}

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[from].has(to);
}

export function canTransitionVariation(from: VariationStatus, to: VariationStatus): boolean {
  return VARIATION_TRANSITIONS[from].has(to);
}

export function reviewStatusToDeliveryStatus(reviewStatus: CollateralReviewStatus): DeliveryStatus {
  if (reviewStatus === "changes_requested") return "changes_requested";
  if (reviewStatus === "approved") return "approved";
  return "collateral_submitted";
}

export interface AwardedDeliverablePatch {
  setupLeadDays: number;
  agencyCostCents: number;
  agencyMonthlyCostCents: number;
  productionCostCents: number;
  productionCostTbc: boolean;
  mediaCostCents: number;
  mediaMonthlyCostCents: number;
  quantity: number;
  months: number;
}

/** Values applied to the plan only after the owner awards/approves a proposal. */
export function proposalValuesToDeliverablePatch(values: ProposalValues): AwardedDeliverablePatch {
  return {
    setupLeadDays: Math.max(0, Math.trunc(values.setupBusinessDays)),
    agencyCostCents: Math.max(0, Math.round(values.agencyOneOffCents)),
    agencyMonthlyCostCents: Math.max(0, Math.round(values.agencyMonthlyCents)),
    productionCostCents: values.productionToBeConfirmed
      ? 0
      : Math.max(0, Math.round(values.productionUnitCents)),
    productionCostTbc: values.productionToBeConfirmed,
    mediaCostCents: Math.max(0, Math.round(values.mediaOneOffCents)),
    mediaMonthlyCostCents: Math.max(0, Math.round(values.mediaMonthlyCents)),
    quantity: Math.max(0, Math.trunc(values.quantity)),
    months: Math.max(0, Math.trunc(values.months)),
  };
}
