/**
 * Recommendation rules + templates. Deterministic (no AI).
 *
 * These are considered defaults grounded in Australian residential-development
 * marketing norms (off-the-plan apartments, house & land estates, and single
 * dwellings). They are intended to be tuned over time - edit the data below and
 * the engine in `recommend.ts` stays the same.
 *
 * How it fits together:
 *  - CHANNEL_RULES: each matching rule adds +1 weight to its channels, so a
 *    channel backed by several rules (project + buyer signals) ranks higher.
 *  - PERSONA_TEMPLATES: surfaced when they match the project type AND a selected
 *    buyer type.
 *  - DELIVERABLE_SUGGESTIONS / CHANNEL_TO_CATALOG: seed the plan with the
 *    catalog items that fit the project and the recommended channels.
 */

import type { BuyerPersona, BuyerType, ChannelCode, ProjectType } from "./types";

export interface ChannelRule {
  /** Applies to these project types (undefined = any). */
  projectTypes?: ProjectType[];
  /** Applies if any of these buyer types is selected (undefined = any). */
  buyerTypes?: BuyerType[];
  channels: ChannelCode[];
  rationale: string;
}

export const CHANNEL_RULES: ChannelRule[] = [
  // ----- Baseline (every launch) -----
  {
    channels: ["ppc", "paid_social"],
    rationale: "Search and paid social capture actively-looking buyers for any launch.",
  },

  // ----- By project type -----
  {
    projectTypes: ["multi_residential"],
    channels: ["ooh", "signage"],
    rationale: "Billboards and hoarding/site signage build awareness for apartment launches.",
  },
  {
    projectTypes: ["multi_residential"],
    channels: ["pr", "press"],
    rationale: "Off-the-plan apartments benefit from PR/editorial and quality press coverage.",
  },
  {
    projectTypes: ["house_and_land"],
    channels: ["press", "email"],
    rationale: "House-and-land buyers research estates via press and respond to email nurture.",
  },
  {
    projectTypes: ["house_and_land"],
    channels: ["signage", "ooh"],
    rationale: "Estate wayfinding signage and local outdoor drive display-village visits.",
  },
  {
    projectTypes: ["retirement_living"],
    channels: ["press", "pr", "email"],
    rationale: "Retirement buyers and their adult children respond to trusted press, PR and email.",
  },
  {
    projectTypes: ["retirement_living"],
    channels: ["radio", "signage"],
    rationale: "Local radio and on-site signage reach an older, less social-first audience.",
  },
  {
    projectTypes: ["commercial"],
    channels: ["press", "email"],
    rationale: "Commercial buyers and tenants research via industry press and direct email.",
  },
  {
    projectTypes: ["commercial"],
    channels: ["ppc", "signage"],
    rationale: "Search intent plus prominent site signage drive commercial enquiry.",
  },
  {
    projectTypes: ["industrial"],
    channels: ["email", "press"],
    rationale: "Industrial and logistics buyers respond to direct email and trade press.",
  },
  {
    projectTypes: ["industrial"],
    channels: ["ppc", "signage"],
    rationale: "Search captures active site seekers; signage converts passing trade traffic.",
  },

  // ----- By buyer type -----
  {
    buyerTypes: ["investor"],
    channels: ["paid_social", "email"],
    rationale: "Investors respond to targeted social and a considered email nurture sequence.",
  },
  {
    buyerTypes: ["investor"],
    channels: ["ppc"],
    rationale: "Investors search actively for yield and depreciation data.",
  },
  {
    buyerTypes: ["first_home_buyer"],
    channels: ["paid_social", "ppc"],
    rationale: "First-home buyers are reached efficiently on social and search.",
  },
  {
    buyerTypes: ["downsizer"],
    channels: ["press", "pr"],
    rationale: "Downsizers over-index on press and trusted PR/editorial.",
  },
  {
    buyerTypes: ["downsizer"],
    channels: ["radio", "email"],
    rationale: "Local radio and email reach an established, less social-first downsizer audience.",
  },
  {
    buyerTypes: ["owner_occupier", "upsizer"],
    channels: ["ppc", "ooh"],
    rationale: "Owner-occupiers respond to search intent plus local awareness.",
  },
  {
    buyerTypes: ["upsizer"],
    channels: ["email", "paid_social"],
    rationale: "Upsizing families nurture over a longer decision via email and social.",
  },
];

export interface PersonaTemplate extends BuyerPersona {
  appliesToBuyerTypes: BuyerType[];
  appliesToProjectTypes: ProjectType[];
}

const ALL_PROJECT_TYPES: ProjectType[] = ["house_and_land", "multi_residential"];

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: "persona-rentvestor",
    name: "The Rentvestor",
    description: "Younger investor buying for yield and long-term growth, often interstate.",
    motivations: "Rental yield, depreciation, capital growth, low hassle.",
    suggestedChannels: ["paid_social", "email", "ppc"],
    appliesToBuyerTypes: ["investor"],
    appliesToProjectTypes: ALL_PROJECT_TYPES,
  },
  {
    id: "persona-self-managed-investor",
    name: "The SMSF Investor",
    description:
      "Established investor buying through a self-managed super fund for a stable, tenantable asset.",
    motivations: "Depreciation schedule, rental demand, low-maintenance stock, compliance.",
    suggestedChannels: ["email", "press", "ppc"],
    appliesToBuyerTypes: ["investor"],
    appliesToProjectTypes: ["multi_residential", "house_and_land"],
  },
  {
    id: "persona-first-home",
    name: "The First-Home Buyer",
    description: "Couple or individual entering the market, budget-conscious and grant-aware.",
    motivations: "Affordability, grants/incentives, location, move-in ready.",
    suggestedChannels: ["paid_social", "ppc"],
    appliesToBuyerTypes: ["first_home_buyer"],
    appliesToProjectTypes: ALL_PROJECT_TYPES,
  },
  {
    id: "persona-downsizer",
    name: "The Downsizer",
    description: "Older owner-occupier moving from a larger home to low-maintenance living.",
    motivations: "Lock-up-and-leave, quality finishes, location, community.",
    suggestedChannels: ["press", "pr", "email"],
    appliesToBuyerTypes: ["downsizer"],
    appliesToProjectTypes: ["multi_residential", "retirement_living"],
  },
  {
    id: "persona-upgrader",
    name: "The Family Upgrader",
    description: "Growing family moving up to more space in a good school catchment.",
    motivations: "Space, schools, backyard, long-term family home.",
    suggestedChannels: ["ppc", "ooh", "paid_social"],
    appliesToBuyerTypes: ["owner_occupier", "upsizer"],
    appliesToProjectTypes: ["house_and_land"],
  },
  {
    id: "persona-professional-owner",
    name: "The Professional Owner-Occupier",
    description: "Established professional or couple buying a quality apartment to live in.",
    motivations: "Design and finishes, lifestyle location, amenity, walkability.",
    suggestedChannels: ["paid_social", "press", "ppc"],
    appliesToBuyerTypes: ["owner_occupier"],
    appliesToProjectTypes: ["multi_residential"],
  },
  {
    id: "persona-apartment-upsizer",
    name: "The Apartment Upsizer",
    description:
      "Growing household moving from a smaller property into a larger apartment for more space.",
    motivations: "Extra bedrooms, larger floorplan, storage, staying close to existing lifestyle.",
    suggestedChannels: ["paid_social", "ppc", "press"],
    appliesToBuyerTypes: ["upsizer"],
    appliesToProjectTypes: ["multi_residential"],
  },
];

/**
 * Catalog ids to suggest per project type. Channel-derived suggestions are added
 * automatically by the engine (e.g. a recommended `ooh` channel adds a billboard).
 */
export const DELIVERABLE_SUGGESTIONS: Record<ProjectType, string[]> = {
  house_and_land: ["brand_concept", "website", "renders", "signage", "paid_social", "edm"],
  multi_residential: [
    "brand_concept",
    "website",
    "renders",
    "photography",
    "billboard",
    "signage",
    "paid_social",
  ],
  retirement_living: [
    "brand_concept",
    "website",
    "renders",
    "display_suite",
    "signage",
    "press_ad",
    "edm",
  ],
  commercial: ["brand_concept", "website", "renders", "signage", "press_ad", "edm"],
  industrial: ["brand_concept", "website", "signage", "press_ad", "edm"],
};

/** Which catalog item best represents a recommended channel. */
export const CHANNEL_TO_CATALOG: Partial<Record<ChannelCode, string>> = {
  ppc: "ppc",
  paid_social: "paid_social",
  ooh: "billboard",
  email: "edm",
  signage: "signage",
};
