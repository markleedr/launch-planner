/**
 * Native media-spend calculator - ported from the LaunchPlanner "Media Spend
 * Calculator" (property-sparkle-suite). It works backwards from a sales target
 * to the media budget required, given a cost-per-lead and per-channel
 * cost-per-sale, then paces the spend across the campaign (flat or ramping).
 *
 * Pure and framework-agnostic. Money here is in whole dollars (matching the
 * source); convert to cents with `toCents()` when feeding the planner budget.
 *
 * NOTE: the lead-capture / email-PDF flow from the original page is intentionally
 * omitted - that belongs to the public marketing site, not the planner.
 */

import { toCents } from "./money";
import type { Deliverable } from "./types";

export type MediaChannelKey = "meta" | "google" | "listing";

export interface MediaChannelDef {
  key: MediaChannelKey;
  label: string;
  /** Benchmark forecast cost per sale ($). */
  benchmark: number;
}

export const MEDIA_CHANNELS: MediaChannelDef[] = [
  { key: "meta", label: "Meta", benchmark: 9000 },
  { key: "google", label: "Google Ads", benchmark: 7000 },
  { key: "listing", label: "Listing Portals", benchmark: 12000 },
];

export interface MediaChannelInput {
  active: boolean;
  /** Forecast cost per sale for this channel ($). */
  cps: number;
  /** Budget share (0–100); normalised across active channels. */
  share: number;
}

export interface MediaCalcInputs {
  salesTarget: number;
  /** Target cost per lead ($). */
  costPerLead: number;
  campaignWeeks: number;
  /** Approximate sale price per unit ($). */
  pricePoint: number;
  /** Allowance for unqualified lead drop-off (%). */
  leadBuffer: number;
  /** Ramping pacing (spend grows weekly) vs flat. */
  useRamping: boolean;
  channels: Record<MediaChannelKey, MediaChannelInput>;
}

export interface MediaWeek {
  week: number;
  meta: number;
  google: number;
  listing: number;
  total: number;
  leads: number;
}

export interface MediaPlan {
  /** Blended cost per sale, weighted by budget share. */
  blendedCps: number;
  leadsPerSale: number;
  /** Total leads required including the buffer. */
  bufferedLeads: number;
  /** Total media budget required ($). */
  totalBudget: number;
  weeklySpend: number;
  channelTotals: Record<MediaChannelKey, number>;
  /** Gross development value = salesTarget × pricePoint. */
  gdv: number;
  /** Revenue / media spend. */
  roi: number;
  /** Media spend as a % of GDV. */
  mediaPctGdv: number;
  /** Lead → sale conversion rate (%). */
  conversionRate: number;
  weeks: MediaWeek[];
}

export const WEEKLY_GROWTH_RATE = 1.1;

/** Normalised weekly weights for ramping pacing (grow 10%/week, sum to 1). */
export function generateGrowthWeights(weeks: number): number[] {
  if (weeks <= 1) return [1];
  const raw = Array.from({ length: weeks }, (_, i) => Math.pow(WEEKLY_GROWTH_RATE, i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

export const DEFAULT_MEDIA_INPUTS: MediaCalcInputs = {
  salesTarget: 25,
  costPerLead: 50,
  campaignWeeks: 52,
  pricePoint: 2_500_000,
  leadBuffer: 20,
  useRamping: true,
  channels: {
    meta: { active: true, cps: 9000, share: 60 },
    google: { active: true, cps: 7000, share: 40 },
    listing: { active: false, cps: 12000, share: 0 },
  },
};

const KEYS: MediaChannelKey[] = ["meta", "google", "listing"];

/** Compute the full media plan from inputs. Shares are normalised across the
 *  active channels, so they don't need to sum to exactly 100. */
export function computeMediaPlan(input: MediaCalcInputs): MediaPlan {
  const weeks = Math.max(1, Math.trunc(input.campaignWeeks));
  const activeKeys = KEYS.filter((k) => input.channels[k].active);

  const zeroChannels = (): Record<MediaChannelKey, number> => ({
    meta: 0,
    google: 0,
    listing: 0,
  });

  // Effective (normalised) share per active channel.
  const eff = zeroChannels();
  if (activeKeys.length > 0) {
    const shareSum = activeKeys.reduce((s, k) => s + Math.max(0, input.channels[k].share), 0);
    for (const k of activeKeys) {
      eff[k] =
        shareSum > 0 ? Math.max(0, input.channels[k].share) / shareSum : 1 / activeKeys.length;
    }
  }

  const blendedCps = activeKeys.reduce((s, k) => s + eff[k] * input.channels[k].cps, 0);
  const leadsPerSale = blendedCps > 0 && input.costPerLead > 0 ? blendedCps / input.costPerLead : 0;
  const baseLeads = leadsPerSale * input.salesTarget;
  const bufferedLeads = Math.ceil(baseLeads * (1 + input.leadBuffer / 100));
  const totalBudget = bufferedLeads * input.costPerLead;
  const weeklySpend = totalBudget / weeks;

  const channelTotals = zeroChannels();
  for (const k of activeKeys) channelTotals[k] = totalBudget * eff[k];

  const gdv = input.salesTarget * input.pricePoint;
  const roi = totalBudget > 0 ? gdv / totalBudget : 0;
  const mediaPctGdv = gdv > 0 ? (totalBudget / gdv) * 100 : 0;
  const conversionRate = leadsPerSale > 0 ? (1 / leadsPerSale) * 100 : 0;

  const growthWeights = generateGrowthWeights(weeks);
  const weekRows: MediaWeek[] = Array.from({ length: weeks }, (_, i) => {
    const weekTotal = input.useRamping ? totalBudget * growthWeights[i] : weeklySpend;
    const row: MediaWeek = {
      week: i + 1,
      meta: 0,
      google: 0,
      listing: 0,
      total: weekTotal,
      leads: Math.round(bufferedLeads * growthWeights[i]),
    };
    for (const k of activeKeys) row[k] = weekTotal * eff[k];
    return row;
  });

  // Fix integer rounding so the weekly leads sum back to bufferedLeads.
  const leadsSum = weekRows.reduce((s, w) => s + w.leads, 0);
  const diff = bufferedLeads - leadsSum;
  if (diff !== 0 && weekRows.length > 0) {
    weekRows[weekRows.length - 1].leads += diff;
  }

  return {
    blendedCps,
    leadsPerSale,
    bufferedLeads,
    totalBudget,
    weeklySpend,
    channelTotals,
    gdv,
    roi,
    mediaPctGdv,
    conversionRate,
    weeks: weekRows,
  };
}

const MEDIA_DELIVERABLES: Record<
  MediaChannelKey,
  Pick<Deliverable, "name" | "category"> & { requirements: string }
> = {
  meta: {
    name: "Meta media campaign",
    category: "digital_performance",
    requirements: "Paid social media placement across the approved Meta campaign.",
  },
  google: {
    name: "Google Ads campaign",
    category: "digital_performance",
    requirements: "Paid search and display placement across the approved Google campaign.",
  },
  listing: {
    name: "Property listing portal campaign",
    category: "digital_performance",
    requirements: "Approved property-listing portal placement for the campaign duration.",
  },
};

/** Convert an accepted calculator result into editable planner deliverables. */
export function mediaPlanToDeliverables(
  input: MediaCalcInputs,
  plan: MediaPlan,
  startDate = new Date(),
): Deliverable[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, Math.trunc(input.campaignWeeks)) * 7);
  const months = Math.max(1, Math.ceil(input.campaignWeeks / 4.345));

  return MEDIA_CHANNELS.filter((channel) => input.channels[channel.key].active).map((channel) => {
    const definition = MEDIA_DELIVERABLES[channel.key];
    return {
      id: `media-${channel.key}-${crypto.randomUUID()}`,
      name: definition.name,
      description: definition.requirements,
      requirements: definition.requirements,
      requiredFormats: ["Campaign plan", "Monthly performance report"],
      category: definition.category,
      agencyCostCents: 0,
      agencyMonthlyCostCents: 0,
      productionCostCents: 0,
      mediaCostCents: toCents(plan.channelTotals[channel.key]),
      mediaMonthlyCostCents: 0,
      quantity: 1,
      months,
      setupLeadDays: 5,
      startDate: new Date(start),
      endDate: new Date(end),
    };
  });
}
