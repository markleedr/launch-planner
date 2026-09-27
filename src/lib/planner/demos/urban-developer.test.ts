import { describe, expect, test } from "bun:test";
import { buildUrbanDeveloperDemoSnapshot } from "./urban-developer";

describe("buildUrbanDeveloperDemoSnapshot", () => {
  test("builds a multi-res plan from demo inputs", () => {
    const snap = buildUrbanDeveloperDemoSnapshot({
      projectType: "multi_residential",
      units: 48,
      launchDate: "2026-11-15",
      mediaBudget: 120_000,
    });

    expect(snap.projectType).toBe("multi_residential");
    expect(snap.units).toBe(48);
    expect(snap.launchDate).toBe("2026-11-15");
    expect(snap.mediaBudget).toBe("120000");
    expect(snap.channels.length).toBeGreaterThan(0);
    expect(snap.deliverables.length).toBeGreaterThan(3);
    expect(snap.checklist.length).toBeGreaterThan(0);
    expect(Number(snap.grv)).toBe(48 * 850_000);
  });

  test("clamps units and budget to sane ranges", () => {
    const snap = buildUrbanDeveloperDemoSnapshot({
      projectType: "house_and_land",
      units: 0,
      launchDate: "not-a-date",
      mediaBudget: -10,
    });

    expect(snap.units).toBe(1);
    expect(Number(snap.mediaBudget)).toBeGreaterThanOrEqual(5_000);
    expect(snap.launchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snap.projectType).toBe("house_and_land");
  });

  test("includes media buy line items that sum near the budget", () => {
    const budget = 60_000;
    const snap = buildUrbanDeveloperDemoSnapshot({
      projectType: "multi_residential",
      units: 30,
      launchDate: "2027-03-01",
      mediaBudget: budget,
    });

    const mediaLines = snap.deliverables.filter((d) => d.id.startsWith("tud-demo-media-"));
    expect(mediaLines.length).toBe(3);
    const months = mediaLines[0]?.months ?? 0;
    expect(months).toBeGreaterThan(0);
    const totalCents = mediaLines.reduce(
      (sum, d) => sum + (d.mediaMonthlyCostCents ?? 0) * months,
      0,
    );
    expect(totalCents).toBeGreaterThan(budget * 100 * 0.95);
    expect(totalCents).toBeLessThan(budget * 100 * 1.05);
  });
});
