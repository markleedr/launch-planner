import { describe, expect, test } from "bun:test";
import { computeCpm } from "../cpm";
import { summariseBudget } from "../budget";
import { parseDollarsToCents } from "../money";
import {
  buildTeneriffeRiversideSnapshot,
  TENERIFFE_CAMPAIGN_MONTHS,
  TENERIFFE_CATALOG_IDS,
  TENERIFFE_GRV_DOLLARS,
  TENERIFFE_MEDIA_BUDGET_DOLLARS,
  wireTeneriffeDependencies,
} from "./teneriffe-riverside";
import { catalogItemToDeliverable, DELIVERABLE_CATALOG } from "../deliverable-catalog";

describe("buildTeneriffeRiversideSnapshot", () => {
  test("sets Teneriffe riverside multi-res facts from the brief", () => {
    const snap = buildTeneriffeRiversideSnapshot();
    expect(snap.projectType).toBe("multi_residential");
    expect(snap.units).toBe(90);
    expect(snap.grv).toBe(String(TENERIFFE_GRV_DOLLARS));
    expect(snap.mediaBudget).toBe(String(TENERIFFE_MEDIA_BUDGET_DOLLARS));
    expect(snap.address).toEqual({
      street: "88 Skyring Terrace",
      suburb: "Teneriffe",
      state: "QLD",
      postcode: "4005",
    });
    expect(snap.location).toBe("Teneriffe");
  });

  test("includes Master Sheet catalogue services plus media allocation", () => {
    const snap = buildTeneriffeRiversideSnapshot();
    const templateIds = new Set(snap.deliverables.map((d) => d.serviceTemplateId).filter(Boolean));
    for (const catalogId of TENERIFFE_CATALOG_IDS) {
      expect(templateIds.has(catalogId)).toBe(true);
    }
    expect(snap.deliverables.some((d) => d.id.startsWith("teneriffe-media-"))).toBe(true);
  });

  test("applies the six-month campaign length to monthly services", () => {
    const snap = buildTeneriffeRiversideSnapshot();
    const social = snap.deliverables.find(
      (d) => d.serviceTemplateId === "social_media_management_12_posts_month",
    )!;
    const blog = snap.deliverables.find((d) => d.serviceTemplateId === "blog_post_monthly")!;
    const edm = snap.deliverables.find((d) => d.serviceTemplateId === "edm")!;
    expect(social.months).toBe(TENERIFFE_CAMPAIGN_MONTHS);
    expect(blog.months).toBe(TENERIFFE_CAMPAIGN_MONTHS);
    expect(edm.months).toBe(TENERIFFE_CAMPAIGN_MONTHS);
    expect(social.agencyMonthlyCostCents).toBe(155_900);
    expect(blog.agencyMonthlyCostCents).toBe(45_000);
    expect(edm.agencyMonthlyCostCents).toBe(49_000);
  });

  test("wires brand / asset / email dependencies without cycles", () => {
    const snap = buildTeneriffeRiversideSnapshot();
    const byId = new Map(snap.deliverables.map((d) => [d.id, d]));
    const website = byId.get("teneriffe-website")!;
    const edm = byId.get("teneriffe-edm")!;
    const brand = byId.get("teneriffe-brand_concept")!;

    expect(brand.dependsOn ?? []).toEqual([]);
    expect(website.dependsOn).toEqual(
      expect.arrayContaining([
        "teneriffe-brand_concept",
        "teneriffe-renders",
        "teneriffe-photography",
      ]),
    );
    expect(edm.dependsOn).toEqual(["teneriffe-email_set_up_enc_or_edm"]);

    const cpm = computeCpm(snap.deliverables);
    expect(cpm.hasCycle).toBe(false);
    expect(cpm.criticalPath.length).toBeGreaterThan(0);
  });

  test("keeps total media allocation at the Master Sheet $60k pool", () => {
    const snap = buildTeneriffeRiversideSnapshot();
    const budget = summariseBudget(snap.deliverables, {
      mediaBudgetCents: parseDollarsToCents(snap.mediaBudget),
      grvCents: parseDollarsToCents(snap.grv),
    });
    const mediaOnly = snap.deliverables
      .filter((d) => d.id.startsWith("teneriffe-media-"))
      .reduce((sum, d) => sum + (d.mediaMonthlyCostCents ?? 0) * (d.months ?? 0), 0);
    expect(mediaOnly).toBe(TENERIFFE_MEDIA_BUDGET_DOLLARS * 100);
    expect(budget.mediaTotalCents).toBeGreaterThanOrEqual(mediaOnly);
    expect(budget.totalPctOfGrv).toBeGreaterThan(0);
    expect(budget.totalPctOfGrv).toBeLessThan(0.05);
  });
});

describe("wireTeneriffeDependencies", () => {
  test("leaves services with no dependency notes without dependsOn", () => {
    const hero = catalogItemToDeliverable(
      DELIVERABLE_CATALOG.find((c) => c.catalogId === "hero_render")!,
    );
    hero.id = "teneriffe-hero_render";
    const wired = wireTeneriffeDependencies([hero]);
    expect(wired[0].dependsOn).toBeUndefined();
  });
});
