/**
 * Budget rollups: group deliverables by category, subtotal production/media,
 * and compute grand totals and variance against the media budget and GRV.
 */

import { calculateProposalCost } from "../procurement";
import type { Deliverable, DeliverableCategory } from "./types";

export interface CategoryTotal {
  category: DeliverableCategory;
  productionCents: number;
  mediaCents: number;
  totalCents: number;
  count: number;
}

export interface BudgetSummary {
  categories: CategoryTotal[];
  productionTotalCents: number;
  mediaTotalCents: number;
  grandTotalCents: number;
  /** grandTotal - mediaBudget. Positive => over the media budget. */
  varianceVsMediaBudgetCents: number;
  /** grandTotal / GRV (0..1). 0 when GRV is 0. */
  totalPctOfGrv: number;
}

/**
 * Roll up deliverables into per-category subtotals and grand totals.
 *
 * Categories are returned in a stable, sorted order so the UI doesn't reshuffle
 * as deliverables are added. Only categories that have deliverables appear.
 */
export interface DeliverableCosts {
  /** Agency + third-party production, incl. monthly × months and quantity. */
  productionCents: number;
  /** Media placement, incl. one-off and monthly × months. */
  mediaCents: number;
  totalCents: number;
}

/**
 * Fully-resolved cost of a single deliverable. Unlike the raw one-off
 * `productionCostCents` / `mediaCostCents` fields, this includes agency and
 * media monthly rates × months and production × quantity, so it matches the
 * category subtotals shown in the plan.
 */
export function deliverableCosts(d: Deliverable): DeliverableCosts {
  const costs = calculateProposalCost({
    notes: "",
    setupBusinessDays: d.setupLeadDays,
    agencyOneOffCents: d.agencyCostCents ?? 0,
    agencyMonthlyCents: d.agencyMonthlyCostCents ?? 0,
    productionUnitCents: d.productionCostCents,
    productionToBeConfirmed: d.productionCostTbc ?? false,
    mediaOneOffCents: d.mediaCostCents,
    mediaMonthlyCents: d.mediaMonthlyCostCents ?? 0,
    quantity: d.quantity ?? 1,
    months: d.months ?? 0,
  });
  const productionCents = costs.agencyCents + costs.productionCents;
  return {
    productionCents,
    mediaCents: costs.mediaCents,
    totalCents: productionCents + costs.mediaCents,
  };
}

export function summariseBudget(
  deliverables: Deliverable[],
  opts: { mediaBudgetCents: number; grvCents: number },
): BudgetSummary {
  const byCategory = new Map<DeliverableCategory, CategoryTotal>();

  for (const d of deliverables) {
    const { productionCents: production, mediaCents: media } = deliverableCosts(d);
    const existing = byCategory.get(d.category);
    if (existing) {
      existing.productionCents += production;
      existing.mediaCents += media;
      existing.totalCents += production + media;
      existing.count += 1;
    } else {
      byCategory.set(d.category, {
        category: d.category,
        productionCents: production,
        mediaCents: media,
        totalCents: production + media,
        count: 1,
      });
    }
  }

  const categories = [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category));

  const productionTotalCents = categories.reduce((sum, c) => sum + c.productionCents, 0);
  const mediaTotalCents = categories.reduce((sum, c) => sum + c.mediaCents, 0);
  const grandTotalCents = productionTotalCents + mediaTotalCents;

  return {
    categories,
    productionTotalCents,
    mediaTotalCents,
    grandTotalCents,
    varianceVsMediaBudgetCents: grandTotalCents - opts.mediaBudgetCents,
    totalPctOfGrv: opts.grvCents > 0 ? grandTotalCents / opts.grvCents : 0,
  };
}
