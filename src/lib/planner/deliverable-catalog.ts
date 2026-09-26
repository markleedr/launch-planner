/**
 * Approved service catalogue generated from the Launch Planner service-template
 * CSV. Money is retained in integer cents and template guidance is carried
 * through to each editable project deliverable.
 */

import { RAW_SERVICE_TEMPLATES } from "./service-templates.generated";
import { SUPPLEMENTAL_SERVICE_TEMPLATES } from "./supplemental-service-templates";
import type { Deliverable, DeliverableCategory, RecurrenceRule, SetupTimeUnit } from "./types";

export interface RawServiceTemplate {
  category: string;
  service: string;
  description: string;
  oneOffCostCents: number;
  monthlyCostCents: number;
  mediaMonthlyCostCents: number;
  mediaEditable: boolean;
  mediaLocked: boolean;
  deliveryQuantity: number;
  deliveryUnit: string;
  dependencies: string;
  recurrencePattern: string;
  note: string;
}

export interface CatalogItem {
  catalogId: string;
  name: string;
  description: string;
  category: DeliverableCategory;
  agencyOneOffCents: number;
  agencyMonthlyCents: number;
  productionUnitCents: number;
  mediaOneOffCents: number;
  mediaMonthlyCents: number;
  mediaEditable: boolean;
  mediaLocked: boolean;
  setupTimeValue: number;
  setupTimeUnit: SetupTimeUnit;
  setupLeadDays: number;
  dependencyNotes: string;
  recurrencePattern: string;
  notes: string;
}

const CATEGORY_MAP: Record<string, DeliverableCategory> = {
  BRAND: "brand",
  "RENDER AND PHOTOGRAPHY": "render_photography",
  COLLATERAL: "collateral",
  "LISTING PORTALS": "listing_portals",
  CONTENT: "content",
  "PPC ADVERTISING": "ppc_advertising",
  "LANDING PAGE / WEBSITE": "landing_page_website",
  "CALL TRACKING": "call_tracking",
  EMAIL: "email_marketing",
  "SMS MARKETING": "sms_marketing",
};

/** Keep recommendation ids stable where the approved list has an equivalent service. */
const RECOMMENDATION_IDS: Record<string, string> = {
  "Brand Strategy & Naming": "brand_concept",
  "Full Apartment Render": "renders",
  "Photography: Lifestyle & Location": "photography",
  "OOH Signage": "billboard",
  "Site Signage": "signage",
  "PPC Campaign": "ppc",
  "Boosting Posts": "paid_social",
  "Landing Page": "landing_page",
  Website: "website",
  "EDM - Monthly": "edm",
};

/** Services filed under a different category in the planner than in the approved list. */
const CATEGORY_OVERRIDES: Record<string, DeliverableCategory> = {
  "Boosting Posts": "paid_social",
  "Site Signage": "site_signage",
  Hoarding: "site_signage",
  "OOH Signage": "outdoor",
};

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function setupUnit(value: string): SetupTimeUnit {
  return value === "weeks" ? "weeks" : "business_days";
}

/** Convert a display timing to the business-day value used by the schedule. */
export function setupTimeToBusinessDays(value: number, unit: SetupTimeUnit): number {
  const quantity = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  return unit === "weeks" ? quantity * 5 : quantity;
}

function recurrenceFromPattern(pattern: string): RecurrenceRule | undefined {
  if (!pattern) return undefined;
  return { freq: "monthly", interval: 1 };
}

const IMPORTED_SERVICE_CATALOG: CatalogItem[] = RAW_SERVICE_TEMPLATES.filter(
  (template) => template.service !== "Landing Page - Simple",
).map((rawTemplate) => {
  const template =
    rawTemplate.service === "Landing Page - Complex"
      ? {
          ...rawTemplate,
          service: "Landing Page",
          // Master Sheet: $1,000 production + $49/mo management.
          oneOffCostCents: 100_000,
          monthlyCostCents: 4_900,
        }
      : rawTemplate;
  const category = CATEGORY_OVERRIDES[template.service] ?? CATEGORY_MAP[template.category];
  if (!category) throw new Error(`Unknown service category: ${template.category}`);
  const unit = setupUnit(template.deliveryUnit);
  const setupValue = template.deliveryQuantity;

  return {
    catalogId: RECOMMENDATION_IDS[template.service] ?? slugify(template.service),
    name: template.service,
    description: template.description,
    category,
    agencyOneOffCents: template.oneOffCostCents,
    agencyMonthlyCents: template.monthlyCostCents,
    productionUnitCents: 0,
    mediaOneOffCents: 0,
    mediaMonthlyCents: template.mediaMonthlyCostCents,
    mediaEditable: template.mediaEditable,
    mediaLocked: template.mediaLocked,
    setupTimeValue: setupValue,
    setupTimeUnit: unit,
    setupLeadDays: setupTimeToBusinessDays(setupValue, unit),
    dependencyNotes: template.dependencies.toLowerCase() === "none" ? "" : template.dependencies,
    recurrencePattern: template.recurrencePattern,
    notes: template.note,
  };
});

export const DELIVERABLE_CATALOG: CatalogItem[] = [
  ...IMPORTED_SERVICE_CATALOG,
  ...SUPPLEMENTAL_SERVICE_TEMPLATES,
];

/** Convert a catalog item into a fresh, fully editable deliverable. */
export function catalogItemToDeliverable(item: CatalogItem): Deliverable {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (item.recurrencePattern ? 30 : 1));
  const hasMonthlyCost = item.agencyMonthlyCents > 0 || item.mediaMonthlyCents > 0;

  return {
    id: `cat-${item.catalogId}-${crypto.randomUUID()}`,
    serviceTemplateId: item.catalogId,
    name: item.name,
    description: item.description,
    category: item.category,
    agencyCostCents: item.agencyOneOffCents,
    agencyMonthlyCostCents: item.agencyMonthlyCents,
    productionCostCents: item.productionUnitCents,
    mediaCostCents: item.mediaOneOffCents,
    mediaMonthlyCostCents: item.mediaMonthlyCents,
    mediaCostEditable: item.mediaEditable,
    mediaCostLocked: item.mediaLocked,
    quantity: 1,
    months: hasMonthlyCost ? 1 : 0,
    setupTimeValue: item.setupTimeValue,
    setupTimeUnit: item.setupTimeUnit,
    setupLeadDays: item.setupLeadDays,
    dependencyNotes: item.dependencyNotes,
    recurrencePattern: item.recurrencePattern,
    recurrence: recurrenceFromPattern(item.recurrencePattern),
    notes: item.notes,
    startDate: start,
    endDate: end,
  };
}
