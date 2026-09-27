/**
 * Build a client-side sample launch plan for the Urban Developer demo.
 * Uses the recommend engine + catalogue — never writes to Supabase.
 */

import { catalogItemToDeliverable, DELIVERABLE_CATALOG } from "../deliverable-catalog";
import { seedChecklist } from "../checklist";
import { generateProjectBlurb } from "../project-copy";
import { HERO_IMAGE_LIBRARY } from "../hero-images";
import { recommend } from "../recommend";
import type { PlannerSnapshot } from "../persistence";
import type { BuyerType, Deliverable, ProjectType } from "../types";

export interface UrbanDeveloperDemoInput {
  projectType: ProjectType;
  units: number;
  launchDate: string;
  /** Rough marketing budget in whole AUD dollars. */
  mediaBudget: number;
  projectName?: string;
}

const DEFAULT_BUYERS: Record<ProjectType, BuyerType[]> = {
  house_and_land: ["owner_occupier", "first_home_buyer", "investor"],
  multi_residential: ["owner_occupier", "investor", "downsizer"],
  retirement_living: ["downsizer", "owner_occupier"],
  commercial: ["investor"],
  industrial: ["investor"],
};

/** Rough AUD average sale price used only to seed a plausible GRV. */
const AVG_PRICE_AUD: Record<ProjectType, number> = {
  house_and_land: 750_000,
  multi_residential: 850_000,
  retirement_living: 650_000,
  commercial: 1_200_000,
  industrial: 900_000,
};

const DEMO_NAMES: Record<ProjectType, string> = {
  house_and_land: "Sample Estate Launch",
  multi_residential: "Sample Apartment Launch",
  retirement_living: "Sample Retirement Launch",
  commercial: "Sample Commercial Launch",
  industrial: "Sample Industrial Launch",
};

function pickHeroImageId(projectType: ProjectType): string {
  const match = HERO_IMAGE_LIBRARY.find((h) => h.recommendedFor.includes(projectType));
  return match?.id ?? "apartments";
}

function campaignMonthsFromBudget(mediaBudget: number): number {
  if (mediaBudget >= 200_000) return 6;
  if (mediaBudget >= 100_000) return 4;
  if (mediaBudget >= 40_000) return 3;
  return 2;
}

function scheduleDeliverable(
  catalogId: string,
  launchDate: Date,
  campaignMonths: number,
): Deliverable | null {
  const item = DELIVERABLE_CATALOG.find((c) => c.catalogId === catalogId);
  if (!item) return null;
  const deliverable = catalogItemToDeliverable(item);
  const hasMonthly =
    (deliverable.agencyMonthlyCostCents ?? 0) > 0 || (deliverable.mediaMonthlyCostCents ?? 0) > 0;

  // Place production/setup work before launch; media/ongoing runs through campaign.
  const start = new Date(launchDate);
  start.setDate(start.getDate() - Math.max(14, deliverable.setupLeadDays + 7));
  const end = new Date(launchDate);
  if (hasMonthly) {
    end.setMonth(end.getMonth() + campaignMonths);
  } else {
    end.setDate(end.getDate() + 1);
  }

  return {
    ...deliverable,
    id: `tud-demo-${catalogId}`,
    months: hasMonthly ? campaignMonths : 0,
    startDate: start,
    endDate: end,
  };
}

function mediaBuyDeliverables(
  mediaBudgetDollars: number,
  campaignMonths: number,
  launchDate: Date,
  brandId: string | undefined,
): Deliverable[] {
  if (mediaBudgetDollars <= 0) return [];
  const mediaStart = new Date(launchDate);
  mediaStart.setDate(mediaStart.getDate() - 7);
  const mediaEnd = new Date(launchDate);
  mediaEnd.setMonth(mediaEnd.getMonth() + campaignMonths);
  const monthlyCents = Math.round((mediaBudgetDollars * 100) / Math.max(1, campaignMonths));

  const shares = [
    { id: "tud-demo-media-meta", name: "Meta media buy", share: 0.4 },
    { id: "tud-demo-media-google", name: "Google Ads media buy", share: 0.35 },
    { id: "tud-demo-media-listing", name: "Listing portal media buy", share: 0.25 },
  ];

  return shares.map((channel) => ({
    id: channel.id,
    name: channel.name,
    description: `Sample media allocation across a ${campaignMonths}-month launch campaign.`,
    category: "digital_performance" as const,
    agencyCostCents: 0,
    agencyMonthlyCostCents: 0,
    productionCostCents: 0,
    mediaCostCents: 0,
    mediaMonthlyCostCents: Math.round(monthlyCents * channel.share),
    quantity: 1,
    months: campaignMonths,
    setupLeadDays: 5,
    setupTimeValue: 1,
    setupTimeUnit: "weeks" as const,
    dependsOn: brandId ? [brandId] : undefined,
    startDate: new Date(mediaStart),
    endDate: new Date(mediaEnd),
  }));
}

/** Generate a full planner snapshot from the Urban Developer demo form. */
export function buildUrbanDeveloperDemoSnapshot(input: UrbanDeveloperDemoInput): PlannerSnapshot {
  const units = Math.max(1, Math.min(2000, Math.trunc(input.units) || 1));
  const mediaBudget = Math.max(5_000, Math.min(5_000_000, Math.round(input.mediaBudget) || 50_000));
  const projectType = input.projectType;
  const projectName = input.projectName?.trim() || DEMO_NAMES[projectType];
  const buyerTypes = DEFAULT_BUYERS[projectType];
  const campaignMonths = campaignMonthsFromBudget(mediaBudget);
  const launchDate =
    input.launchDate && !Number.isNaN(Date.parse(input.launchDate))
      ? input.launchDate
      : defaultLaunchDate();

  const recommendation = recommend({ projectType, buyerTypes });
  const catalogIds = recommendation.suggestedCatalogIds;
  const launch = new Date(`${launchDate}T00:00:00`);

  const deliverables = catalogIds
    .map((id) => scheduleDeliverable(id, launch, campaignMonths))
    .filter((d): d is Deliverable => Boolean(d));

  const brandId = deliverables.find((d) => d.serviceTemplateId === "brand_concept")?.id;
  const mediaBuys = mediaBuyDeliverables(mediaBudget, campaignMonths, launch, brandId);

  const address = { street: "", suburb: "", state: "", postcode: "" };
  const grv = String(units * AVG_PRICE_AUD[projectType]);

  return {
    projectName,
    projectBlurb: generateProjectBlurb({
      name: projectName,
      projectType,
      units,
      address,
    }),
    projectType,
    units,
    grv,
    mediaBudget: String(mediaBudget),
    launchDate,
    location: "",
    address,
    heroImageId: pickHeroImageId(projectType),
    heroImageUrl: "",
    projectParties: [],
    standardCollectionBusinessDays: 10,
    buyerTypes,
    channels: recommendation.channels.map((c) => c.code),
    personas: recommendation.personas,
    deliverables: [...deliverables, ...mediaBuys],
    checklist: seedChecklist(projectType),
    contacts: [],
  };
}

function defaultLaunchDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 4);
  d.setDate(15);
  return d.toISOString().slice(0, 10);
}
