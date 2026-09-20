import { describe, expect, test } from "bun:test";
import {
  catalogItemToDeliverable,
  DELIVERABLE_CATALOG,
  setupTimeToBusinessDays,
} from "./deliverable-catalog";
import { deliverableDurationDays } from "./cpm";

describe("DELIVERABLE_CATALOG", () => {
  test("contains every approved and supplemental service with unique catalog ids", () => {
    expect(DELIVERABLE_CATALOG).toHaveLength(59);
    const ids = new Set(DELIVERABLE_CATALOG.map((c) => c.catalogId));
    expect(ids.size).toBe(DELIVERABLE_CATALOG.length);
  });

  test("includes every missing service from the original catalogue", () => {
    const names = new Set(DELIVERABLE_CATALOG.map((item) => item.name));
    for (const name of [
      "Billboard placement",
      "Transit advertising",
      "Finishes board",
      "Display suite fit-out",
      "Site Signage",
      "PR launch & media outreach",
      "Launch event",
      "Press advertising",
      "Brochure / collateral",
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });

  test("preserves costs, recurrence, media controls and notes", () => {
    const sms = DELIVERABLE_CATALOG.find(
      (item) => item.name === "SMS Marketing - Compliance Copywriting",
    )!;
    expect(sms.agencyMonthlyCents).toBe(22_000);
    expect(sms.mediaMonthlyCents).toBe(25_000);
    expect(sms.mediaLocked).toBe(true);
    expect(sms.recurrencePattern).toBe("monthly_third_monday");
    expect(sms.notes).toContain("5k sends");
  });

  test("classifies supplemental media and production costs correctly", () => {
    const billboard = DELIVERABLE_CATALOG.find((item) => item.name === "Billboard placement")!;
    const displaySuite = DELIVERABLE_CATALOG.find((item) => item.name === "Display suite fit-out")!;
    expect(billboard.mediaOneOffCents).toBe(9_600_000);
    expect(billboard.mediaEditable).toBe(true);
    expect(displaySuite.productionUnitCents).toBe(8_000_000);
  });

  test("uses the single revised landing page service", () => {
    expect(DELIVERABLE_CATALOG.some((item) => item.name === "Landing Page - Simple")).toBe(false);
    expect(DELIVERABLE_CATALOG.some((item) => item.name === "Landing Page - Complex")).toBe(false);
    const landingPage = DELIVERABLE_CATALOG.find((item) => item.name === "Landing Page")!;
    expect(landingPage.catalogId).toBe("landing_page");
    expect(landingPage.agencyOneOffCents).toBe(102_500);
  });

  test("converts weeks into business days for scheduling", () => {
    expect(setupTimeToBusinessDays(2, "weeks")).toBe(10);
    expect(setupTimeToBusinessDays(3, "business_days")).toBe(3);
  });
});

describe("catalogItemToDeliverable", () => {
  test("converts a catalog item to a valid deliverable", () => {
    const item = DELIVERABLE_CATALOG.find((c) => c.catalogId === "billboard")!;
    const d = catalogItemToDeliverable(item);
    expect(d.name).toBe("OOH Signage");
    expect(d.category).toBe("collateral");
    expect(d.agencyCostCents).toBe(150_000);
    expect(d.mediaCostEditable).toBe(true);
    expect(d.setupTimeValue).toBe(2);
    expect(d.setupTimeUnit).toBe("weeks");
    expect(deliverableDurationDays(d)).toBe(item.setupLeadDays + 1);
  });

  test("each conversion produces a unique id", () => {
    const item = DELIVERABLE_CATALOG[0];
    expect(catalogItemToDeliverable(item).id).not.toBe(catalogItemToDeliverable(item).id);
  });
});
