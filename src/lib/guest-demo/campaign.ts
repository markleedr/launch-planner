export type GuestDemoBasePath = "/urban-developer" | "/webinar-23-sept";

export interface GuestDemoCampaign {
  id: string;
  basePath: GuestDemoBasePath;
  /** Stored on leads.source */
  leadSource: string;
  /** Short line in sidebar / header */
  brandLine: string;
  /** Welcome banner eyebrow */
  bannerEyebrow: string;
  /** Welcome banner heading */
  bannerHeading: string;
  /** Welcome banner supporting sentence */
  bannerSubhead: string;
  /** Projects page blurb */
  workspaceBlurb: string;
  pageTitle: string;
  metaDescription: string;
}

export const URBAN_DEVELOPER_CAMPAIGN: GuestDemoCampaign = {
  id: "urban-developer",
  basePath: "/urban-developer",
  leadSource: "urban-developer",
  brandLine: "for The Urban Developer readers.",
  bannerEyebrow: "The Urban Developer",
  bannerHeading: "Welcome, The Urban Developer readers.",
  bannerSubhead:
    "Plan your project launch. Free to try for The Urban Developer readers, no account required.",
  workspaceBlurb:
    "Free to try for The Urban Developer readers, no account required. Open the example project or start your own. Email only if you want to export a PDF.",
  pageTitle: "for The Urban Developer readers. - Launch Planner",
  metaDescription:
    "Free to try for The Urban Developer readers, no account required. Try Launch Planner: open an example project or create your own. Email only required to export a PDF.",
};

export const WEBINAR_23_SEPT_CAMPAIGN: GuestDemoCampaign = {
  id: "webinar-23-sept",
  basePath: "/webinar-23-sept",
  leadSource: "webinar-23-sept",
  brandLine: "for webinar attendees.",
  bannerEyebrow: "Launch Planner webinar",
  bannerHeading: "Welcome, webinar attendees.",
  bannerSubhead:
    "Plan your project launch. Free to try for webinar attendees, no account required.",
  workspaceBlurb:
    "Free to try for webinar attendees, no account required. Open the example project or start your own. Email only if you want to export a PDF.",
  pageTitle: "Welcome, webinar attendees. - Launch Planner",
  metaDescription:
    "Free to try for webinar attendees, no account required. Try Launch Planner: open an example project or create your own. Email only required to export a PDF.",
};

export function guestPath(
  basePath: GuestDemoBasePath,
  suffix: "" | "/new" | "/plan" | "/summary" = "",
): string {
  return `${basePath}${suffix}`;
}
