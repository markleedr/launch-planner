/**
 * Fabricated Teneriffe riverside multi-residential launch plan.
 *
 * Costs, timings and dependency guidance come from the Master Sheet price list
 * (`data/master-sheet-price-list.csv`) via the service catalogue. This snapshot
 * is intended for local hydrate / preview — never write it to production
 * Supabase as seed data.
 */

import { catalogItemToDeliverable, DELIVERABLE_CATALOG } from "../deliverable-catalog";
import { seedChecklist } from "../checklist";
import { recommend } from "../recommend";
import type { PlannerSnapshot } from "../persistence";
import type { CatalogItem } from "../deliverable-catalog";
import type { Deliverable } from "../types";

/** Campaign length from the Master Sheet campaign details. */
export const TENERIFFE_CAMPAIGN_MONTHS = 6;

/** Media spend from the Master Sheet ($10,000 / month × 6). */
export const TENERIFFE_MEDIA_BUDGET_DOLLARS = 60_000;

/** Gross realisation value for the 90-apartment riverside scheme. */
export const TENERIFFE_GRV_DOLLARS = 200_000_000;

/**
 * Catalogue ids that form a full multi-res launch for a riverfront
 * Teneriffe project. Brand strategy is chosen over visual identity
 * (mutually exclusive per the price list).
 */
export const TENERIFFE_CATALOG_IDS = [
  // Brand
  "brand_concept",
  // Renders & photography
  "hero_render",
  "external_render",
  "amenities_render",
  "renders",
  "drone_photography",
  "photography",
  "video_production",
  // Collateral & site presence
  "sales_book",
  "floorplans",
  "floorplates",
  "hoarding",
  "neighbourhood_map",
  "signage",
  "billboard",
  "digital_twin_app",
  "finishes_board",
  "display_suite_fit_out",
  // Listing portals
  "apartments_com_au_premium",
  "rea_project_profile",
  "domain_project_profile",
  // Content (Master Sheet TRUE selections + set-up)
  "social_media_content_set_up",
  "social_media_management_12_posts_month",
  "blog_post_monthly",
  // PPC
  "ppc_ads_set_up",
  "ppc",
  // Website & tracking
  "website",
  "call_tracking_number",
  // Email (Master Sheet TRUE selections + set-up)
  "email_set_up_enc_or_edm",
  "enc_automated_email_series",
  "edm",
  // Launch support
  "pr_launch_media_outreach",
  "billboard_placement",
] as const;

type TeneriffeCatalogId = (typeof TENERIFFE_CATALOG_IDS)[number];

function requireCatalogItem(catalogId: string): CatalogItem {
  const item = DELIVERABLE_CATALOG.find((entry) => entry.catalogId === catalogId);
  if (!item) throw new Error(`Missing catalogue item: ${catalogId}`);
  return item;
}

function stableDeliverable(catalogId: TeneriffeCatalogId, months: number): Deliverable {
  const item = requireCatalogItem(catalogId);
  const deliverable = catalogItemToDeliverable(item);
  const hasMonthly =
    (deliverable.agencyMonthlyCostCents ?? 0) > 0 || (deliverable.mediaMonthlyCostCents ?? 0) > 0;
  const start = new Date("2026-09-01T00:00:00");
  const end = new Date(start);
  end.setMonth(end.getMonth() + (hasMonthly ? months : 0));
  if (!hasMonthly) end.setDate(end.getDate() + 1);

  return {
    ...deliverable,
    // Deterministic ids so dependency wiring and tests stay stable.
    id: `teneriffe-${catalogId}`,
    months: hasMonthly ? months : 0,
    startDate: start,
    endDate: end,
  };
}

function notesSay(notes: string | undefined, ...needles: string[]): boolean {
  const haystack = (notes ?? "").toLowerCase();
  return needles.every((needle) => haystack.includes(needle.toLowerCase()));
}

/**
 * Wire `dependsOn` from Master Sheet dependency guidance onto concrete
 * deliverable instance ids in this plan.
 */
export function wireTeneriffeDependencies(deliverables: Deliverable[]): Deliverable[] {
  const byTemplate = new Map(
    deliverables
      .filter((d) => d.serviceTemplateId)
      .map((d) => [d.serviceTemplateId!, d.id] as const),
  );

  const brandId = byTemplate.get("brand_concept");
  const rendersId = byTemplate.get("renders");
  const photographyId = byTemplate.get("photography");
  const emailSetupId = byTemplate.get("email_set_up_enc_or_edm");
  const ppcSetupId = byTemplate.get("ppc_ads_set_up");

  return deliverables.map((d) => {
    const notes = d.dependencyNotes ?? "";
    const dependsOn: string[] = [];

    if (notesSay(notes, "either brand strategy or visual identity")) {
      // Root brand item — no predecessor.
    } else if (notesSay(notes, "email set up")) {
      if (emailSetupId) dependsOn.push(emailSetupId);
    } else if (notesSay(notes, "ppc ads set up") || notesSay(notes, "depends on ppc")) {
      if (ppcSetupId) dependsOn.push(ppcSetupId);
    } else if (
      notesSay(notes, "brand") &&
      (notesSay(notes, "render") || notesSay(notes, "photography"))
    ) {
      if (brandId) dependsOn.push(brandId);
      if (rendersId) dependsOn.push(rendersId);
      if (photographyId) dependsOn.push(photographyId);
    } else if (
      notesSay(notes, "brand") ||
      notesSay(notes, "visual identity") ||
      notesSay(notes, "brand must")
    ) {
      if (brandId) dependsOn.push(brandId);
    }

    // Display suite / PR / billboard placement are not in the Master Sheet but
    // still need brand before they can go live on a coordinated launch.
    if (
      !dependsOn.length &&
      (d.serviceTemplateId === "display_suite_fit_out" ||
        d.serviceTemplateId === "pr_launch_media_outreach" ||
        d.serviceTemplateId === "finishes_board" ||
        d.serviceTemplateId === "billboard_placement")
    ) {
      if (brandId) dependsOn.push(brandId);
    }

    return dependsOn.length ? { ...d, dependsOn } : { ...d, dependsOn: undefined };
  });
}

/** Build the full Teneriffe riverside planner snapshot. */
export function buildTeneriffeRiversideSnapshot(
  opts: { campaignMonths?: number; launchDate?: string } = {},
): PlannerSnapshot {
  const campaignMonths = opts.campaignMonths ?? TENERIFFE_CAMPAIGN_MONTHS;
  const launchDate = opts.launchDate ?? "2027-03-15";
  const buyerTypes = ["owner_occupier", "investor", "downsizer"] as const;
  const recommendation = recommend({
    projectType: "multi_residential",
    buyerTypes: [...buyerTypes],
    state: "QLD",
  });

  const deliverables = wireTeneriffeDependencies(
    TENERIFFE_CATALOG_IDS.map((catalogId) => stableDeliverable(catalogId, campaignMonths)),
  );

  // Allocate the Master Sheet media pool across active media channels so the
  // plan shows both creative/management costs and the $60k media buy.
  const mediaStart = new Date("2026-09-15T00:00:00");
  const mediaEnd = new Date(mediaStart);
  mediaEnd.setMonth(mediaEnd.getMonth() + campaignMonths);
  const mediaMonthlyCents = Math.round(
    (TENERIFFE_MEDIA_BUDGET_DOLLARS * 100) / Math.max(1, campaignMonths),
  );
  const mediaShare = [
    { id: "teneriffe-media-meta", name: "Meta media buy", share: 0.45 },
    { id: "teneriffe-media-google", name: "Google Ads media buy", share: 0.35 },
    { id: "teneriffe-media-listing", name: "Listing portal media buy", share: 0.2 },
  ].map((channel) => {
    const monthly = Math.round(mediaMonthlyCents * channel.share);
    return {
      id: channel.id,
      name: channel.name,
      description: `Master Sheet campaign media allocation (${campaignMonths} months).`,
      category: "digital_performance" as const,
      agencyCostCents: 0,
      agencyMonthlyCostCents: 0,
      productionCostCents: 0,
      mediaCostCents: 0,
      mediaMonthlyCostCents: monthly,
      quantity: 1,
      months: campaignMonths,
      setupLeadDays: 5,
      setupTimeValue: 1,
      setupTimeUnit: "weeks" as const,
      dependencyNotes: "depends on brand or visual identity, renders, photography",
      dependsOn: ["teneriffe-brand_concept", "teneriffe-renders", "teneriffe-photography"],
      startDate: new Date(mediaStart),
      endDate: new Date(mediaEnd),
    } satisfies Deliverable;
  });

  return {
    projectName: "Teneriffe Riverside Residences",
    projectBlurb:
      "A 90-apartment riverfront multi-residential launch on the Brisbane River at Teneriffe, planned from the Master Sheet price list with a six-month campaign and $200 million GRV.",
    projectType: "multi_residential",
    units: 90,
    grv: String(TENERIFFE_GRV_DOLLARS),
    mediaBudget: String(TENERIFFE_MEDIA_BUDGET_DOLLARS),
    launchDate,
    location: "Teneriffe",
    address: {
      street: "88 Skyring Terrace",
      suburb: "Teneriffe",
      state: "QLD",
      postcode: "4005",
    },
    heroImageId: "apartments",
    heroImageUrl: "",
    projectParties: [],
    standardCollectionBusinessDays: 10,
    buyerTypes: [...buyerTypes],
    channels: recommendation.channels.map((channel) => channel.code),
    personas: recommendation.personas,
    deliverables: [...deliverables, ...mediaShare],
    checklist: seedChecklist("multi_residential"),
    contacts: [],
  };
}
