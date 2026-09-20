import { describe, expect, test } from "bun:test";
import type { Deliverable, DeliverableCategory } from "@/lib/planner";
import { groupDeliverablesForContractors, recommendedContractorRole } from "./assignment";

function deliverable(id: string, category: DeliverableCategory): Deliverable {
  const date = new Date("2026-07-27");
  return {
    id,
    name: id,
    category,
    productionCostCents: 0,
    mediaCostCents: 0,
    setupLeadDays: 0,
    startDate: date,
    endDate: date,
  };
}

describe("contractor assignment grouping", () => {
  test("maps PPC work to a digital / PPC contractor", () => {
    expect(recommendedContractorRole("ppc_advertising")).toBe("digital_agency");
    expect(recommendedContractorRole("digital_performance")).toBe("digital_agency");
  });

  test("creates sections only for specialties added to the project", () => {
    const groups = groupDeliverablesForContractors(
      [
        deliverable("brand", "brand"),
        deliverable("ads", "ppc_advertising"),
        deliverable("billboard", "outdoor"),
      ],
      ["creative_agency", "media_agency"],
    );

    expect(groups.map((group) => group.key)).toEqual([
      "creative_agency",
      "media_agency",
      "miscellaneous",
    ]);
    expect(groups[0].deliverables.map((item) => item.id)).toEqual(["brand"]);
    expect(groups[1].deliverables.map((item) => item.id)).toEqual(["billboard"]);
    expect(groups[2].deliverables.map((item) => item.id)).toEqual(["ads"]);
  });

  test("moves digital work out of miscellaneous when a PPC contractor is added", () => {
    const groups = groupDeliverablesForContractors(
      [deliverable("ads", "ppc_advertising")],
      ["digital_agency"],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("digital_agency");
  });
});
