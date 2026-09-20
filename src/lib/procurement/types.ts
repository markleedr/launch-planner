export type PortalContractorSpecialty =
  | "creative_agency"
  | "digital_agency"
  | "content_agency"
  | "media_agency";

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

export type ProposalStatus =
  | "draft"
  | "invited"
  | "submitted"
  | "awarded"
  | "unsuccessful"
  | "withdrawn"
  | "expired";

export interface ProposalValues {
  notes: string;
  setupBusinessDays: number;
  agencyOneOffCents: number;
  agencyMonthlyCents: number;
  productionUnitCents: number;
  productionToBeConfirmed: boolean;
  mediaOneOffCents: number;
  mediaMonthlyCents: number;
  quantity: number;
  months: number;
}

export interface ProposalRevision {
  id: string;
  proposalId: string;
  revision: number;
  values: ProposalValues;
  submittedAt: string;
  submittedBy: string;
}

export interface Proposal {
  id: string;
  projectId: string;
  deliverableId: string;
  contractorPartyId: string;
  contractorName: string;
  status: ProposalStatus;
  submissionDeadline: string;
  currentRevision: number;
  revisions: ProposalRevision[];
  awardedAt?: string;
}

export type VariationStatus = "submitted" | "approved" | "rejected" | "withdrawn";

export interface Variation {
  id: string;
  proposalId: string;
  revision: number;
  values: ProposalValues;
  reason: string;
  status: VariationStatus;
  submittedAt: string;
  decidedAt?: string;
}

export type DeliveryStatus =
  | "invitation_sent"
  | "proposal_submitted"
  | "awarded"
  | "in_progress"
  | "collateral_requested"
  | "collateral_submitted"
  | "changes_requested"
  | "approved"
  | "completed";

export type CollateralReviewStatus = "submitted" | "changes_requested" | "approved";

export interface DeliverableMessage {
  id: string;
  proposalId: string;
  senderUserId: string;
  body: string;
  attachmentNames: string[];
  createdAt: string;
}

export interface CollateralVersion {
  id: string;
  proposalId: string;
  version: number;
  status: CollateralReviewStatus;
  fileNames: string[];
  notes: string;
  submittedAt: string;
  reviewedAt?: string;
}

export type NotificationKind =
  | "welcome"
  | "account_invitation"
  | "proposal_invitation"
  | "deadline_changed"
  | "deadline_approaching"
  | "proposal_submitted"
  | "proposal_revised"
  | "proposal_awarded"
  | "proposal_unsuccessful"
  | "delivery_started"
  | "message_received"
  | "variation_submitted"
  | "variation_approved"
  | "variation_rejected"
  | "collateral_requested"
  | "collateral_submitted"
  | "changes_requested"
  | "collateral_approved"
  | "deliverable_completed";

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
