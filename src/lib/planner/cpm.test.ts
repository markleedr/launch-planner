import { describe, expect, test } from "bun:test";
import { computeCpm, deliverableDurationDays, dependencyWouldCreateCycle } from "./cpm";
import type { Deliverable } from "./types";

// Build a task whose duration equals `days` (zero-length run + lead time).
function task(id: string, days: number, dependsOn: string[] = []): Deliverable {
  const date = new Date("2026-06-01");
  return {
    id,
    name: id,
    category: "digital_performance",
    productionCostCents: 0,
    mediaCostCents: 0,
    setupLeadDays: days,
    startDate: date,
    endDate: date,
    dependsOn,
  };
}

describe("deliverableDurationDays", () => {
  test("lead time + active run", () => {
    const d = task("x", 0);
    d.setupLeadDays = 5;
    d.startDate = new Date("2026-06-01");
    d.endDate = new Date("2026-06-11"); // 10-day run
    expect(deliverableDurationDays(d)).toBe(15);
  });
});

describe("computeCpm", () => {
  // A(3) ─▶ C(4) ─▶ E(1)
  // B(2) ─▶ D(2) ─▶ E
  const network: Deliverable[] = [
    task("A", 3),
    task("B", 2),
    task("C", 4, ["A"]),
    task("D", 2, ["B"]),
    task("E", 1, ["C", "D"]),
  ];
  const result = computeCpm(network);

  test("project duration is the longest path", () => {
    expect(result.projectDurationDays).toBe(8); // A(3)+C(4)+E(1)
  });

  test("earliest start/finish from the forward pass", () => {
    expect(result.nodes.get("C")!.es).toBe(3);
    expect(result.nodes.get("C")!.ef).toBe(7);
    expect(result.nodes.get("E")!.es).toBe(7);
    expect(result.nodes.get("E")!.ef).toBe(8);
  });

  test("slack identifies non-critical tasks", () => {
    expect(result.nodes.get("B")!.slack).toBe(3);
    expect(result.nodes.get("D")!.slack).toBe(3);
    expect(result.nodes.get("A")!.slack).toBe(0);
  });

  test("critical path is A -> C -> E", () => {
    expect(result.criticalPath).toEqual(["A", "C", "E"]);
    expect(result.hasCycle).toBe(false);
  });

  test("detects cycles", () => {
    const cyclic: Deliverable[] = [task("A", 1, ["B"]), task("B", 1, ["A"])];
    const r = computeCpm(cyclic);
    expect(r.hasCycle).toBe(true);
    expect(r.criticalPath).toHaveLength(0);
  });

  test("ignores edges to unknown deliverable ids", () => {
    const r = computeCpm([task("A", 2, ["ghost"])]);
    expect(r.hasCycle).toBe(false);
    expect(r.nodes.get("A")!.es).toBe(0);
    expect(r.projectDurationDays).toBe(2);
  });

  test("empty input is handled", () => {
    const r = computeCpm([]);
    expect(r.projectDurationDays).toBe(0);
    expect(r.criticalPath).toHaveLength(0);
  });
});

describe("dependencyWouldCreateCycle", () => {
  const base = [task("A", 1), task("B", 1, ["A"]), task("C", 1, ["B"])];

  test("flags a dependency that closes a loop", () => {
    // A depends on C would make A->...->C->...->A
    expect(dependencyWouldCreateCycle(base, "A", ["C"])).toBe(true);
  });

  test("allows a valid new dependency", () => {
    // C also depending on A is still acyclic.
    expect(dependencyWouldCreateCycle(base, "C", ["B", "A"])).toBe(false);
  });
});
