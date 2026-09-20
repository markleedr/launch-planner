/**
 * Gross Realisation Value (GRV) and media-budget benchmarking.
 *
 * GRV is the total expected sales revenue of the project. Per the agreed v1
 * financial model: GRV = number of units x sell price (per unit).
 */

import type { ProjectFinancials } from "./types";

/** GRV in cents = units x sell price. Negative/!finite inputs clamp to 0. */
export function computeGrvCents(units: number, sellPriceCents: number): number {
  if (!Number.isFinite(units) || !Number.isFinite(sellPriceCents)) return 0;
  const u = Math.max(0, Math.trunc(units));
  const p = Math.max(0, Math.round(sellPriceCents));
  return u * p;
}

/**
 * Media budget as a fraction of GRV (0..1). Returns 0 when GRV is 0 to avoid
 * dividing by zero (an undefined benchmark, shown as "-" at the UI edge).
 */
export function mediaBudgetPctOfGrv(mediaBudgetCents: number, grvCents: number): number {
  if (grvCents <= 0) return 0;
  return mediaBudgetCents / grvCents;
}

export interface FinancialSummary {
  grvCents: number;
  mediaBudgetCents: number;
  mediaBudgetPctOfGrv: number;
}

/** Roll a project's financial inputs into the headline summary numbers. */
export function summariseFinancials(f: ProjectFinancials): FinancialSummary {
  const grvCents = computeGrvCents(f.units, f.sellPriceCents);
  return {
    grvCents,
    mediaBudgetCents: f.mediaBudgetCents,
    mediaBudgetPctOfGrv: mediaBudgetPctOfGrv(f.mediaBudgetCents, grvCents),
  };
}
