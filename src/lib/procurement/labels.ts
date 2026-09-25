import type { PortalContractorSpecialty, ProjectPartyRole, ReferencePartyRole } from "./types";

export const PROJECT_PARTY_ROLE_LABELS: Record<ProjectPartyRole, string> = {
  developer: "Developer",
  architect: "Architect",
  builder: "Builder",
  creative_agency: "Creative agency",
  digital_agency: "Digital / PPC agency",
  content_agency: "Content agency",
  media_agency: "Media agency",
  production_agency: "Production / Printing",
  sales_team: "Sales team",
};

export const PROJECT_PARTY_ROLES = Object.keys(PROJECT_PARTY_ROLE_LABELS) as ProjectPartyRole[];

export const PORTAL_CONTRACTOR_ROLES: PortalContractorSpecialty[] = [
  "creative_agency",
  "digital_agency",
  "content_agency",
  "media_agency",
  "production_agency",
];

export const REFERENCE_PARTY_ROLES: ReferencePartyRole[] = [
  "developer",
  "architect",
  "sales_team",
  "builder",
];
