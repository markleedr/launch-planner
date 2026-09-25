export type PortalContractorSpecialty =
  | "creative_agency"
  | "digital_agency"
  | "content_agency"
  | "media_agency"
  | "production_agency";

export type ReferencePartyRole = "developer" | "architect" | "sales_team" | "builder";

export type ProjectPartyRole = PortalContractorSpecialty | ReferencePartyRole;

export interface DirectoryParty {
  id: string;
  ownerUserId?: string;
  organisationName: string;
  representativeName: string;
  email?: string;
  phone?: string;
  website?: string;
  role: ProjectPartyRole;
  portalEnabled: boolean;
  authUserId?: string;
}

export interface ProjectParty {
  id: string;
  contactId: string;
  role: ProjectPartyRole;
}

export type NotificationKind = "welcome" | "account_invitation";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  readAt?: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  projectId: string;
  providerName: string;
  url?: string;
  expiresAt?: string;
  revokedAt?: string;
  hiddenContactFields: Array<"representativeName" | "email" | "phone" | "website">;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  createdAt: string;
}
