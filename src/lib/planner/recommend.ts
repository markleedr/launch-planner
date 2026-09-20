/**
 * Recommendation engine (rules + templates). Pure and deterministic: given the
 * project intake, it returns a ranked channel mix, buyer personas, and suggested
 * catalog deliverables. The content lives in `recommendation-data.ts`.
 */

import { DELIVERABLE_CATALOG } from "./deliverable-catalog";
import {
  CHANNEL_RULES,
  CHANNEL_TO_CATALOG,
  DELIVERABLE_SUGGESTIONS,
  PERSONA_TEMPLATES,
} from "./recommendation-data";
import type { BuyerPersona, BuyerType, ChannelCode, ProjectType } from "./types";

export interface RecommendationInput {
  projectType: ProjectType;
  buyerTypes: BuyerType[];
  state?: string;
}

export interface RecommendedChannel {
  code: ChannelCode;
  rationale: string;
  /** How many rules matched this channel (higher = stronger). */
  weight: number;
}

export interface Recommendation {
  channels: RecommendedChannel[];
  personas: BuyerPersona[];
  suggestedCatalogIds: string[];
}

const CATALOG_IDS = new Set(DELIVERABLE_CATALOG.map((c) => c.catalogId));

/** Produce channel/persona/deliverable recommendations from the intake. */
export function recommend(input: RecommendationInput): Recommendation {
  const buyerSet = new Set(input.buyerTypes);

  // Channels: accumulate weight + first rationale from every matching rule.
  const channelMap = new Map<ChannelCode, { rationale: string; weight: number }>();
  for (const rule of CHANNEL_RULES) {
    const projectOk = !rule.projectTypes || rule.projectTypes.includes(input.projectType);
    const buyerOk = !rule.buyerTypes || rule.buyerTypes.some((b) => buyerSet.has(b));
    if (!projectOk || !buyerOk) continue;
    for (const code of rule.channels) {
      const existing = channelMap.get(code);
      if (existing) existing.weight += 1;
      else channelMap.set(code, { rationale: rule.rationale, weight: 1 });
    }
  }
  const channels: RecommendedChannel[] = [...channelMap.entries()]
    .map(([code, v]) => ({ code, rationale: v.rationale, weight: v.weight }))
    .sort((a, b) => b.weight - a.weight || a.code.localeCompare(b.code));

  // Personas: templates that match the project type AND at least one buyer type.
  const personas: BuyerPersona[] = PERSONA_TEMPLATES.filter(
    (p) =>
      p.appliesToProjectTypes.includes(input.projectType) &&
      p.appliesToBuyerTypes.some((b) => buyerSet.has(b)),
  ).map(({ id, name, description, motivations, suggestedChannels }) => ({
    id,
    name,
    description,
    motivations,
    suggestedChannels,
  }));

  // Deliverables: per-project-type suggestions + channel-derived items.
  const ids = new Set<string>(DELIVERABLE_SUGGESTIONS[input.projectType] ?? []);
  for (const { code } of channels) {
    const catalogId = CHANNEL_TO_CATALOG[code];
    if (catalogId) ids.add(catalogId);
  }
  const suggestedCatalogIds = [...ids].filter((id) => CATALOG_IDS.has(id));

  return { channels, personas, suggestedCatalogIds };
}
