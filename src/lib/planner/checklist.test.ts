import { describe, expect, test } from "bun:test";
import { checklistProgress, seedChecklist } from "./checklist";

describe("seedChecklist", () => {
  test("includes common items plus type-specific ones", () => {
    const multi = seedChecklist("multi_residential");
    const houseLand = seedChecklist("house_and_land");
    expect(multi.some((i) => i.title.includes("Planning / development approval"))).toBe(true);
    expect(houseLand.some((i) => i.title.includes("Land titles"))).toBe(true);
    // Common item present in both.
    expect(multi.some((i) => i.title === "Marketing budget approved")).toBe(true);
    expect(houseLand.some((i) => i.title === "Marketing budget approved")).toBe(true);
  });

  test("ids are unique and items start not done", () => {
    const items = seedChecklist("house_and_land");
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
    expect(items.every((i) => i.done === false)).toBe(true);
  });
});

describe("checklistProgress", () => {
  test("counts done, total and open high-severity items", () => {
    const items = seedChecklist("multi_residential");
    const before = checklistProgress(items);
    expect(before.done).toBe(0);
    expect(before.total).toBe(items.length);
    expect(before.pct).toBe(0);
    expect(before.openHigh).toBeGreaterThan(0);

    // Mark all high-severity items done.
    const updated = items.map((i) => (i.severity === "high" ? { ...i, done: true } : i));
    const after = checklistProgress(updated);
    expect(after.openHigh).toBe(0);
    expect(after.done).toBeGreaterThan(0);
    expect(after.pct).toBeCloseTo(after.done / after.total, 6);
  });

  test("empty checklist has 0 progress, not NaN", () => {
    const p = checklistProgress([]);
    expect(p.total).toBe(0);
    expect(p.pct).toBe(0);
  });
});
