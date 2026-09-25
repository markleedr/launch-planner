/**
 * Gross Realisation Value (GRV) and media-budget benchmarking.
 *
 * GRV is the total expected sales revenue of the project and is entered
 * directly. The average sell price per lot, unit or home is derived from it.
 */

import type { ProjectFinancials } from "./types";

/** Average sell price in cents = GRV ÷ units. 0 when either input is unusable. */
export function averageSellPriceCents(grvCents: number, units: number): number {
  if (!Number.isFinite(grvCents) || !Number.isFinite(units)) return 0;
  const u = Math.max(0, Math.trunc(units));
  const g = Math.max(0, Math.round(grvCents));
  return u > 0 ? Math.round(g / u) : 0;
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
  averageSellPriceCents: number;
  mediaBudgetCents: number;
  mediaBudgetPctOfGrv: number;
}

/** Roll a project's financial inputs into the headline summary numbers. */
export function summariseFinancials(f: ProjectFinancials): FinancialSummary {
  const grvCents = Number.isFinite(f.grvCents) ? Math.max(0, Math.round(f.grvCents)) : 0;
  return {
    grvCents,
    averageSellPriceCents: averageSellPriceCents(grvCents, f.units),
    mediaBudgetCents: f.mediaBudgetCents,
    mediaBudgetPctOfGrv: mediaBudgetPctOfGrv(f.mediaBudgetCents, grvCents),
  };
}
