import type { Deliverable, DeliverableCategory } from "@/lib/planner";
import type { PortalContractorSpecialty } from "./types";

export type AssignmentGroupKey = PortalContractorSpecialty | "miscellaneous";

export interface DeliverableAssignmentGroup {
  key: AssignmentGroupKey;
  deliverables: Deliverable[];
  recommendedRole?: PortalContractorSpecialty;
}

const CATEGORY_SPECIALTY: Record<DeliverableCategory, PortalContractorSpecialty> = {
  brand: "creative_agency",
  brand_collateral: "creative_agency",
  call_tracking: "digital_agency",
  collateral: "creative_agency",
  content: "content_agency",
  digital_performance: "digital_agency",
  email_marketing: "content_agency",
  landing_page_website: "digital_agency",
  listing_portals: "digital_agency",
  outdoor: "media_agency",
  paid_social: "digital_agency",
  physical_display: "creative_agency",
  ppc_advertising: "digital_agency",
  pr_events: "content_agency",
  print_press: "media_agency",
  radio: "media_agency",
  render_photography: "creative_agency",
  site_signage: "creative_agency",
  sms_marketing: "content_agency",
  tv: "media_agency",
  website_build: "digital_agency",
};

const SPECIALTY_ORDER: PortalContractorSpecialty[] = [
  "creative_agency",
  "digital_agency",
  "content_agency",
  "media_agency",
  "production_agency",
];

export function recommendedContractorRole(
  category: DeliverableCategory,
): PortalContractorSpecialty {
  return CATEGORY_SPECIALTY[category];
}

/**
 * Sections follow specialties present on the project. Work whose recommended
 * specialty has not been added remains visible in a miscellaneous section.
 */
export function groupDeliverablesForContractors(
  deliverables: Deliverable[],
  availableRoles: Iterable<PortalContractorSpecialty>,
): DeliverableAssignmentGroup[] {
  const roles = new Set(availableRoles);
  const grouped = new Map<AssignmentGroupKey, Deliverable[]>();

  for (const deliverable of deliverables) {
    const recommendedRole = recommendedContractorRole(deliverable.category);
    const key: AssignmentGroupKey = roles.has(recommendedRole) ? recommendedRole : "miscellaneous";
    grouped.set(key, [...(grouped.get(key) ?? []), deliverable]);
  }

  const result: DeliverableAssignmentGroup[] = SPECIALTY_ORDER.flatMap((role) => {
    const items = grouped.get(role);
    return items?.length ? [{ key: role, recommendedRole: role, deliverables: items }] : [];
  });
  const miscellaneous = grouped.get("miscellaneous");
  if (miscellaneous?.length) {
    result.push({ key: "miscellaneous", deliverables: miscellaneous });
  }
  return result;
}
