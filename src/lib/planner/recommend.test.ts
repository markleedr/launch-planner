import { describe, expect, test } from "bun:test";
import { recommend } from "./recommend";
import { DELIVERABLE_CATALOG } from "./deliverable-catalog";
import type { BuyerType, ProjectType } from "./types";

const CATALOG_IDS = new Set(DELIVERABLE_CATALOG.map((c) => c.catalogId));

describe("recommend", () => {
  test("is deterministic", () => {
    const a = recommend({ projectType: "multi_residential", buyerTypes: ["investor"] });
    const b = recommend({ projectType: "multi_residential", buyerTypes: ["investor"] });
    expect(a).toEqual(b);
  });

  test("ranks channels by how many rules match (weight desc)", () => {
    const r = recommend({
      projectType: "multi_residential",
      buyerTypes: ["investor", "first_home_buyer"],
    });
    // paid_social is hit by the base rule + investor + first-home rules.
    expect(r.channels[0].code).toBe("paid_social");
    for (let i = 1; i < r.channels.length; i++) {
      expect(r.channels[i - 1].weight).toBeGreaterThanOrEqual(r.channels[i].weight);
    }
  });

  test("channels carry a rationale", () => {
    const r = recommend({ projectType: "house_and_land", buyerTypes: ["owner_occupier"] });
    expect(r.channels.every((c) => c.rationale.length > 0)).toBe(true);
  });

  test("personas match project type and buyer type", () => {
    const r = recommend({ projectType: "multi_residential", buyerTypes: ["downsizer"] });
    expect(r.personas.some((p) => p.id === "persona-downsizer")).toBe(true);
    // The family upgrader does not apply to multi-residential.
    expect(r.personas.some((p) => p.id === "persona-upgrader")).toBe(false);
  });

  test("suggested deliverables all resolve to real catalog ids", () => {
    const r = recommend({ projectType: "house_and_land", buyerTypes: ["first_home_buyer"] });
    expect(r.suggestedCatalogIds.length).toBeGreaterThan(0);
    for (const id of r.suggestedCatalogIds) {
      expect(CATALOG_IDS.has(id)).toBe(true);
    }
  });

  test("recommended channels add their catalog deliverable (e.g. ooh -> billboard)", () => {
    const r = recommend({ projectType: "multi_residential", buyerTypes: ["owner_occupier"] });
    // multi_residential recommends ooh -> billboard should be suggested.
    expect(r.channels.some((c) => c.code === "ooh")).toBe(true);
    expect(r.suggestedCatalogIds).toContain("billboard");
  });

  test("no buyer types still yields base-rule channels", () => {
    const r = recommend({ projectType: "house_and_land", buyerTypes: [] });
    expect(r.channels.some((c) => c.code === "ppc")).toBe(true);
    expect(r.personas).toHaveLength(0);
  });

  test("every buyer type surfaces at least one channel and persona", () => {
    const buyerTypes: BuyerType[] = [
      "owner_occupier",
      "investor",
      "downsizer",
      "first_home_buyer",
      "upsizer",
    ];
    for (const bt of buyerTypes) {
      // Try each project type so buyer/project-scoped personas can match.
      const projectTypes: ProjectType[] = ["house_and_land", "multi_residential"];
      const anyPersona = projectTypes.some(
        (pt) => recommend({ projectType: pt, buyerTypes: [bt] }).personas.length > 0,
      );
      expect(anyPersona).toBe(true);
      const r = recommend({ projectType: "multi_residential", buyerTypes: [bt] });
      expect(r.channels.length).toBeGreaterThan(0);
    }
  });

  test("channels without an approved service do not add placeholder deliverables", () => {
    const r = recommend({ projectType: "multi_residential", buyerTypes: ["downsizer"] });
    expect(r.channels.some((c) => c.code === "pr")).toBe(true);
    expect(r.suggestedCatalogIds).not.toContain("pr_launch");
    expect(r.suggestedCatalogIds.every((id) => CATALOG_IDS.has(id))).toBe(true);
  });
});
