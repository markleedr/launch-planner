import type { ProposalValues } from "./types";

function safeCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export interface ProposalCostBreakdown {
  agencyCents: number;
  productionCents: number;
  mediaCents: number;
  totalCents: number;
}

/**
 * Approved proposal formula:
 * agency one-off + production × quantity + media one-off +
 * (agency monthly + media monthly) × months.
 */
export function calculateProposalCost(values: ProposalValues): ProposalCostBreakdown {
  const months = safeCount(values.months);
  const quantity = safeCount(values.quantity);
  const agencyCents =
    safeCents(values.agencyOneOffCents) + safeCents(values.agencyMonthlyCents) * months;
  const productionCents = values.productionToBeConfirmed
    ? 0
    : safeCents(values.productionUnitCents) * quantity;
  const mediaCents =
    safeCents(values.mediaOneOffCents) + safeCents(values.mediaMonthlyCents) * months;

  return {
    agencyCents,
    productionCents,
    mediaCents,
    totalCents: agencyCents + productionCents + mediaCents,
  };
}

export function emptyProposalValues(): ProposalValues {
  return {
    notes: "",
    setupBusinessDays: 0,
    agencyOneOffCents: 0,
    agencyMonthlyCents: 0,
    productionUnitCents: 0,
    productionToBeConfirmed: false,
    mediaOneOffCents: 0,
    mediaMonthlyCents: 0,
    quantity: 1,
    months: 0,
  };
}

export function proposalValuesFromRow(row: Record<string, unknown>): ProposalValues {
  return {
    notes: String(row.notes ?? ""),
    setupBusinessDays: Number(row.setup_business_days) || 0,
    agencyOneOffCents: Number(row.agency_one_off_cents) || 0,
    agencyMonthlyCents: Number(row.agency_monthly_cents) || 0,
    productionUnitCents: Number(row.production_unit_cents) || 0,
    productionToBeConfirmed: Boolean(row.production_to_be_confirmed),
    mediaOneOffCents: Number(row.media_one_off_cents) || 0,
    mediaMonthlyCents: Number(row.media_monthly_cents) || 0,
    quantity: Number(row.quantity) || 0,
    months: Number(row.months) || 0,
  };
}
