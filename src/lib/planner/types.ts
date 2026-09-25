/**
 * Shared domain types for the Project Planner core.
 *
 * The core (`src/lib/planner`) is framework-agnostic and pure: it has no React,
 * no Supabase, and no I/O. Everything here can run on the client or server and
 * is unit-tested in isolation.
 *
 * Money is always represented in integer **cents** (AUD) to avoid floating
 * point rounding errors. Format to a display string only at the UI edge.
 */

export type ProjectType =
  | "house_and_land"
  | "multi_residential"
  | "retirement_living"
  | "commercial"
  | "industrial";

/** A purchaser segment the campaign targets. */
export type BuyerType =
  | "owner_occupier"
  | "investor"
  | "downsizer"
  | "first_home_buyer"
  | "upsizer";

/** A medium used to reach buyers. */
export type ChannelCode =
  | "ppc"
  | "paid_social"
  | "ooh"
  | "radio"
  | "tv"
  | "press"
  | "email"
  | "pr"
  | "signage";

/** Top-level grouping for deliverables; drives budget subtotals. */
export type DeliverableCategory =
  | "digital_performance"
  | "outdoor"
  | "print_press"
  | "brand_collateral"
  | "physical_display"
  | "website_build"
  | "pr_events"
  | "brand"
  | "render_photography"
  | "collateral"
  | "listing_portals"
  | "content"
  | "ppc_advertising"
  | "paid_social"
  | "landing_page_website"
  | "call_tracking"
  | "email_marketing"
  | "sms_marketing"
  | "site_signage"
  | "radio"
  | "tv";

export type SetupTimeUnit = "business_days" | "weeks";

/** How often a media placement repeats. */
export type RecurrenceFreq = "none" | "daily" | "weekly" | "monthly";

/** End condition for a recurrence. */
export type RecurrenceEnd = { kind: "count"; count: number } | { kind: "until"; until: Date };

/**
 * An RRULE-like recurrence description, deliberately limited to the cases the
 * product supports. `byWeekday` uses 0=Sun … 6=Sat (matches `Date.getDay()`).
 */
export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** Repeat every `interval` units of `freq` (>= 1). */
  interval: number;
  /** For weekly rules: which days of the week the placement runs. */
  byWeekday?: number[];
  /** Hour of day (0–23) the placement runs, for display/scheduling. */
  byHour?: number;
  /** When the recurrence stops. Omit for an open-ended rule bounded by end date. */
  end?: RecurrenceEnd;
}

/** A single materialised occurrence of a recurring placement. */
export interface Occurrence {
  date: Date;
}

/** A marketing/production item created to help sell the project. */
export interface Deliverable {
  id: string;
  /** Stable source-template id when this item was added from the service catalogue. */
  serviceTemplateId?: string;
  name: string;
  description?: string;
  category: DeliverableCategory;
  /** Owner-authored scope that becomes immutable for an issued brief revision. */
  requirements?: string;
  /** File extensions or human-readable output formats required at delivery. */
  requiredFormats?: string[];
  /** One-off agency/design/creation/delivery-management cost. */
  agencyCostCents?: number;
  /** Ongoing agency-management cost per month. */
  agencyMonthlyCostCents?: number;
  /** One-off cost to create/produce the item (design, printing, build). */
  productionCostCents: number;
  /** Third-party production is unknown and deliberately counts as $0 for now. */
  productionCostTbc?: boolean;
  /** Cost to run/place the item over time (e.g. 6 months of billboard). */
  mediaCostCents: number;
  /** Ongoing media placement cost per month. */
  mediaMonthlyCostCents?: number;
  /** Number of third-party production units. */
  quantity?: number;
  /** Number of months applied to monthly agency/media costs. */
  months?: number;
  /** User-facing set-up quantity retained independently from its schedule conversion. */
  setupTimeValue?: number;
  /** Unit selected for the user-facing set-up quantity. */
  setupTimeUnit?: SetupTimeUnit;
  /** Lead time (days) to set up/produce before it can go live. */
  setupLeadDays: number;
  /** Template guidance that helps the owner choose a concrete linked dependency. */
  dependencyNotes?: string;
  /** Source recurrence preset, including supported monthly placement patterns. */
  recurrencePattern?: string;
  /** Operational notes supplied by the owner or service template. */
  notes?: string;
  /** Whether the media allowance is intended to be edited for this service. */
  mediaCostEditable?: boolean;
  /** Whether the supplied media rate is fixed by the template. */
  mediaCostLocked?: boolean;
  startDate: Date;
  endDate: Date;
  recurrence?: RecurrenceRule;
  /** IDs of deliverables that must finish before this one can start. */
  dependsOn?: string[];
  /** Contact id of the owning agency / department head. */
  ownerContactId?: string;
  /** Contact ids of suppliers allocated to produce this deliverable. */
  supplierIds?: string[];
  /** Awarded portal contractor party id, if procurement has completed. */
  awardedContractorPartyId?: string;
  /** Date collateral must be supplied for this deliverable. */
  collateralCutoffDate?: Date;
}

/** Inputs that define a project's financial envelope. */
export interface ProjectFinancials {
  units: number;
  /** Gross realisation value: total expected sales revenue, entered directly. */
  grvCents: number;
  mediaBudgetCents: number;
}

export interface ProjectAddress {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
}

/** A recommended buyer segment - "who the buyers will be". */
export interface BuyerPersona {
  id: string;
  name: string;
  description: string;
  motivations: string;
  suggestedChannels: ChannelCode[];
}
