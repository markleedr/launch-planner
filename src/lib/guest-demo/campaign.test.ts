import { describe, expect, test } from "bun:test";
import { RETARGETING_CAMPAIGN, URBAN_DEVELOPER_CAMPAIGN, type GuestDemoCampaign } from "./campaign";

const PARTNER_MENTION = /urban developer|\btud\b/i;

function publicCopy(campaign: GuestDemoCampaign): string[] {
  return [
    campaign.brandLine,
    campaign.bannerEyebrow,
    campaign.bannerHeading,
    campaign.bannerSubhead,
    campaign.workspaceBlurb,
    campaign.pageTitle,
    campaign.metaDescription,
  ];
}

describe("retargeting campaign", () => {
  test("uses /start and tags leads retargeting", () => {
    expect(RETARGETING_CAMPAIGN.basePath).toBe("/start");
    expect(RETARGETING_CAMPAIGN.leadSource).toBe("retargeting");
    expect(RETARGETING_CAMPAIGN.id).toBe("retargeting");
  });

  test("states the October offer without a partner name", () => {
    for (const line of publicCopy(RETARGETING_CAMPAIGN)) {
      expect(line).not.toMatch(PARTNER_MENTION);
    }
    const copy = publicCopy(RETARGETING_CAMPAIGN).join(" ");
    expect(copy).toContain("Free for 30 days, ends October 31st");
    expect(copy).toContain("OCT15FREE");
  });

  test("leaves the Urban Developer campaign copy alone", () => {
    expect(URBAN_DEVELOPER_CAMPAIGN.leadSource).toBe("urban-developer");
    expect(URBAN_DEVELOPER_CAMPAIGN.bannerHeading).toContain("The Urban Developer");
  });
});
