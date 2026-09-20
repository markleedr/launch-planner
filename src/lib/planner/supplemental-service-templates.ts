import type { CatalogItem } from "./deliverable-catalog";

const base = {
  agencyOneOffCents: 0,
  agencyMonthlyCents: 0,
  productionUnitCents: 0,
  mediaOneOffCents: 0,
  mediaMonthlyCents: 0,
  mediaEditable: false,
  mediaLocked: false,
  setupTimeUnit: "business_days" as const,
  dependencyNotes: "",
  recurrencePattern: "",
  notes: "",
};

/**
 * Services retained from the original Launch Planner catalogue that are not
 * present in the imported service-template CSV.
 */
export const SUPPLEMENTAL_SERVICE_TEMPLATES: CatalogItem[] = [
  {
    ...base,
    catalogId: "billboard_placement",
    name: "Billboard placement",
    description:
      "Media placement for a project billboard campaign, with locations and campaign dates confirmed in the final brief.",
    category: "outdoor",
    mediaOneOffCents: 9_600_000,
    mediaEditable: true,
    setupTimeValue: 15,
    setupLeadDays: 15,
  },
  {
    ...base,
    catalogId: "transit_advertising",
    name: "Transit advertising",
    description:
      "Media placement across selected transit formats such as bus, rail or shelter advertising.",
    category: "outdoor",
    mediaOneOffCents: 5_000_000,
    mediaEditable: true,
    setupTimeValue: 15,
    setupLeadDays: 15,
  },
  {
    ...base,
    catalogId: "finishes_board",
    name: "Finishes board",
    description:
      "Design and production of a finishes board presenting the approved project materials, fixtures and colour selections.",
    category: "physical_display",
    productionUnitCents: 750_000,
    setupTimeValue: 15,
    setupLeadDays: 15,
  },
  {
    ...base,
    catalogId: "display_suite_fit_out",
    name: "Display suite fit-out",
    description:
      "Design, coordination and fit-out of the project display suite, subject to final site and construction requirements.",
    category: "physical_display",
    productionUnitCents: 8_000_000,
    setupTimeValue: 30,
    setupLeadDays: 30,
  },
  {
    ...base,
    catalogId: "pr_launch_media_outreach",
    name: "PR launch & media outreach",
    description:
      "Launch announcement, media release, journalist outreach and campaign coordination.",
    category: "pr_events",
    agencyOneOffCents: 1_000_000,
    setupTimeValue: 15,
    setupLeadDays: 15,
  },
  {
    ...base,
    catalogId: "launch_event",
    name: "Launch event",
    description:
      "Planning and delivery of a project launch event, including supplier coordination and event management.",
    category: "pr_events",
    agencyOneOffCents: 2_000_000,
    setupTimeValue: 30,
    setupLeadDays: 30,
  },
  {
    ...base,
    catalogId: "press_advertising",
    name: "Press advertising",
    description: "Paid press advertising placement across selected print publications.",
    category: "print_press",
    mediaOneOffCents: 4_000_000,
    mediaEditable: true,
    setupTimeValue: 10,
    setupLeadDays: 10,
  },
  {
    ...base,
    catalogId: "brochure_collateral",
    name: "Brochure / collateral",
    description: "Design and production of a project brochure or supporting sales collateral.",
    category: "print_press",
    agencyOneOffCents: 900_000,
    setupTimeValue: 15,
    setupLeadDays: 15,
  },
];
