/**
 * Human-readable labels for the planner's enums, plus a starter deliverables
 * seed. Pure data - no React, no I/O.
 */

import type {
  BuyerType,
  ChannelCode,
  Deliverable,
  DeliverableCategory,
  ProjectType,
} from "./types";
import { toCents } from "./money";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  house_and_land: "House & land",
  multi_residential: "Multi-residential building",
  retirement_living: "Retirement living",
  commercial: "Commercial",
  industrial: "Industrial",
};

/** The label for the "number of units" field varies by project type. */
export const UNIT_LABELS: Record<ProjectType, string> = {
  house_and_land: "Number of lots",
  multi_residential: "Number of apartments",
  retirement_living: "Number of dwellings",
  commercial: "Number of tenancies",
  industrial: "Number of units",
};

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  owner_occupier: "Owner-occupier",
  investor: "Investor",
  downsizer: "Downsizer",
  first_home_buyer: "First-home buyer",
  upsizer: "Upsizer",
};

export const CHANNEL_LABELS: Record<ChannelCode, string> = {
  ppc: "Search / PPC",
  paid_social: "Paid social",
  ooh: "Outdoor / billboards",
  radio: "Radio",
  tv: "TV",
  press: "Press",
  email: "Email",
  pr: "PR",
  signage: "Site signage",
};

export const CATEGORY_LABELS: Record<DeliverableCategory, string> = {
  digital_performance: "Digital & performance",
  outdoor: "Outdoor",
  print_press: "Press",
  brand_collateral: "Brand & collateral",
  physical_display: "Physical & display",
  website_build: "Website & digital build",
  pr_events: "PR & events",
  brand: "Brand",
  render_photography: "Render & photography",
  collateral: "Sales collateral",
  listing_portals: "Listing portals",
  content: "Content",
  ppc_advertising: "PPC advertising",
  paid_social: "Paid social",
  landing_page_website: "Landing page / website",
  call_tracking: "Call tracking",
  email_marketing: "Email",
  sms_marketing: "SMS marketing",
  site_signage: "Site signage",
  radio: "Radio",
  tv: "TV",
};

/** Display order for categories wherever the catalogue is listed. */
export const CATEGORY_ORDER: DeliverableCategory[] = [
  "brand",
  "content",
  "render_photography",
  "collateral",
  "landing_page_website",
  "ppc_advertising",
  "paid_social",
  "listing_portals",
  "call_tracking",
  "email_marketing",
  "sms_marketing",
  "outdoor",
  "site_signage",
  "physical_display",
  "print_press",
  "radio",
  "tv",
  "pr_events",
  "digital_performance",
  "website_build",
  "brand_collateral",
];

export const PROJECT_TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];
export const BUYER_TYPES = Object.keys(BUYER_TYPE_LABELS) as BuyerType[];
export const CHANNELS = Object.keys(CHANNEL_LABELS) as ChannelCode[];

/**
 * A starter set of deliverables to pre-populate a new project. Placeholder
 * costs/dates; the real catalog + benchmark costs are an outstanding business
 * input (see docs/project-planner/04-open-questions.md, item 3).
 */
export function seedDeliverables(): Deliverable[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Each item declares a lead time + an active run length (in days). The Gantt
  // repositions bars from the dependency graph, so the absolute start date here
  // only fixes the run length (endDate = today + runDays).
  const make = (
    id: string,
    name: string,
    category: DeliverableCategory,
    opts: {
      productionCost: number;
      mediaCost?: number;
      leadDays: number;
      runDays: number;
      dependsOn?: string[];
      recurrence?: Deliverable["recurrence"];
    },
  ): Deliverable => {
    const end = new Date(today);
    end.setDate(end.getDate() + opts.runDays);
    return {
      id,
      name,
      category,
      productionCostCents: toCents(opts.productionCost),
      mediaCostCents: toCents(opts.mediaCost ?? 0),
      setupLeadDays: opts.leadDays,
      startDate: today,
      endDate: end,
      dependsOn: opts.dependsOn,
      recurrence: opts.recurrence,
    };
  };

  return [
    make("brand_concept", "Brand & creative concept", "brand_collateral", {
      productionCost: 15_000,
      leadDays: 7,
      runDays: 14,
    }),
    make("website", "Project website", "website_build", {
      productionCost: 25_000,
      leadDays: 7,
      runDays: 35,
      dependsOn: ["brand_concept"],
    }),
    make("landing_page", "Launch landing page", "website_build", {
      productionCost: 8_000,
      leadDays: 3,
      runDays: 14,
      dependsOn: ["brand_concept"],
    }),
    make("finishes_board", "Finishes board", "physical_display", {
      productionCost: 7_500,
      leadDays: 10,
      runDays: 20,
      dependsOn: ["brand_concept"],
    }),
    make("billboard", "Billboard placement", "outdoor", {
      productionCost: 6_000,
      mediaCost: 90_000,
      leadDays: 21,
      runDays: 90,
      dependsOn: ["brand_concept"],
    }),
    make("press_ad", "Press advertising", "print_press", {
      productionCost: 5_000,
      mediaCost: 35_000,
      leadDays: 10,
      runDays: 56,
      dependsOn: ["brand_concept"],
      // Runs every Monday for 8 weeks once live.
      recurrence: { freq: "weekly", interval: 1, byWeekday: [1], byHour: 8 },
    }),
    make("ppc", "Search / PPC campaign", "digital_performance", {
      productionCost: 3_000,
      mediaCost: 40_000,
      leadDays: 5,
      runDays: 120,
      dependsOn: ["landing_page"],
    }),
    make("paid_social", "Paid social campaign", "digital_performance", {
      productionCost: 4_000,
      mediaCost: 30_000,
      leadDays: 5,
      runDays: 120,
      dependsOn: ["landing_page"],
    }),
  ];
}
