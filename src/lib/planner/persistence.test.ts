import { describe, expect, test } from "bun:test";
import { deserializePlanner, serializePlanner, type PlannerSnapshot } from "./persistence";
import { seedChecklist } from "./checklist";
import { seedContacts } from "./contacts";
import { seedDeliverables } from "./labels";

function snapshot(): PlannerSnapshot {
  return {
    projectName: "Test project",
    projectBlurb: "A test project.",
    projectType: "multi_residential",
    units: 20,
    grv: "15000000",
    mediaBudget: "300000",
    launchDate: "2026-09-01",
    location: "Brisbane, QLD",
    address: {
      street: "1 Test Street",
      suburb: "Brisbane",
      state: "QLD",
      postcode: "4000",
    },
    heroImageId: "apartments",
    heroImageUrl: "",
    projectParties: [],
    standardCollectionBusinessDays: 10,
    buyerTypes: ["investor", "owner_occupier"],
    channels: ["ppc", "paid_social"],
    personas: [
      {
        id: "p1",
        name: "Rentvestor",
        description: "d",
        motivations: "m",
        suggestedChannels: ["paid_social"],
      },
    ],
    deliverables: seedDeliverables(),
    checklist: seedChecklist("multi_residential"),
    contacts: seedContacts(),
  };
}

describe("planner persistence round-trip", () => {
  test("serialize then deserialize preserves the snapshot", () => {
    const original = snapshot();
    const stored = serializePlanner(original);
    // Simulate a JSONB round-trip through the database.
    const roundTripped = JSON.parse(JSON.stringify(stored));
    const restored = deserializePlanner(roundTripped);

    expect(restored).not.toBeNull();
    expect(restored!.projectName).toBe(original.projectName);
    expect(restored!.units).toBe(original.units);
    expect(restored!.buyerTypes).toEqual(original.buyerTypes);
    expect(restored!.deliverables.length).toBe(original.deliverables.length);
  });

  test("deliverable Dates survive as Date objects with the same time", () => {
    const original = snapshot();
    const restored = deserializePlanner(JSON.parse(JSON.stringify(serializePlanner(original))))!;
    const a = original.deliverables[0];
    const b = restored.deliverables[0];
    expect(b.startDate).toBeInstanceOf(Date);
    expect(b.endDate).toBeInstanceOf(Date);
    expect(b.startDate.getTime()).toBe(a.startDate.getTime());
    expect(b.endDate.getTime()).toBe(a.endDate.getTime());
  });

  test("a recurrence 'until' date is revived to a Date", () => {
    const original = snapshot();
    original.deliverables[0].recurrence = {
      freq: "weekly",
      interval: 1,
      byWeekday: [1],
      end: { kind: "until", until: new Date("2026-10-01T00:00:00.000Z") },
    };
    const restored = deserializePlanner(JSON.parse(JSON.stringify(serializePlanner(original))))!;
    const end = restored.deliverables[0].recurrence!.end!;
    expect(end.kind).toBe("until");
    if (end.kind === "until") {
      expect(end.until).toBeInstanceOf(Date);
      expect(end.until.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    }
  });

  test("invalid / empty input returns null", () => {
    expect(deserializePlanner(null)).toBeNull();
    expect(deserializePlanner({})).toBeNull();
    expect(deserializePlanner("nope")).toBeNull();
  });

  test("round-trips the GRV as typed", () => {
    const restored = deserializePlanner(serializePlanner(snapshot()));
    expect(restored?.grv).toBe("15000000");
  });

  test("converts a pre-v3 per-unit sell price into a GRV", () => {
    const stored = serializePlanner(snapshot()) as Record<string, unknown>;
    delete stored.grv;
    stored.sellPrice = "$750,000";
    expect(deserializePlanner(stored)?.grv).toBe("15000000");
    stored.sellPrice = "";
    expect(deserializePlanner(stored)?.grv).toBe("");
  });

  test("preserves a zero-day collateral collection lead time", () => {
    const original = snapshot();
    original.standardCollectionBusinessDays = 0;
    const restored = deserializePlanner(serializePlanner(original));
    expect(restored?.standardCollectionBusinessDays).toBe(0);
  });
});
