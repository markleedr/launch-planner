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
  /**
   * Optional cover image shown in the welcome banner.
   * When set, image + CTA button link to `demoUrl`.
   */
  coverImageSrc?: string;
  coverImageAlt?: string;
  /** Absolute or site-root URL the cover image and CTA open */
  demoUrl?: string;
  /** Copy explaining how Launch Planner was used in the webinar */
  webinarReferenceCopy?: string;
  /** Short free-access note shown beside the CTA */
  freeAccessNote?: string;
  /** CTA button label */
  ctaLabel?: string;
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
    "Plan your project launch. Free to try for webinar attendees until the end of November 2026, no account required.",
  workspaceBlurb:
    "Free for webinar attendees until the end of November 2026, no account required. Open the example project or start your own. Email only if you want to export a PDF.",
  pageTitle: "Welcome, webinar attendees. - Launch Planner",
  metaDescription:
    "Free for webinar attendees until the end of November 2026, no account required. Try Launch Planner: open an example project or create your own.",
  coverImageSrc: "/webinar/cover.jpg",
  coverImageAlt: "Launch Planner homepage: plan, scope and cost your property project.",
  demoUrl: "https://launchplanner.com.au/webinar-23-sept",
  webinarReferenceCopy:
    "In the webinar we used Launch Planner live to scope a property project, build the deliverable plan, cost the media mix and walk the schedule. Open the workspace below to try the same flow on the Beachside sample or your own project.",
  freeAccessNote:
    "Free to use for webinar attendees until the end of November 2026. No account required.",
  ctaLabel: "Open Launch Planner",
};

export function guestPath(
  basePath: GuestDemoBasePath,
  suffix: "" | "/new" | "/plan" | "/summary" = "",
): string {
  return `${basePath}${suffix}`;
}
