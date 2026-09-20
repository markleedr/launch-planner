import { describe, expect, test } from "bun:test";
import { buildSchedule, buildScheduleForLaunch } from "./schedule";
import { differenceInCalendarDays } from "date-fns";
import type { Deliverable } from "./types";

const PROJECT_START = new Date("2026-07-01T00:00:00");

// duration = leadDays + runDays
function task(
  id: string,
  leadDays: number,
  runDays: number,
  dependsOn: string[] = [],
  recurrence?: Deliverable["recurrence"],
): Deliverable {
  const start = new Date("2026-07-01T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + runDays);
  return {
    id,
    name: id,
    category: "digital_performance",
    productionCostCents: 1000,
    mediaCostCents: 2000,
    setupLeadDays: leadDays,
    startDate: start,
    endDate: end,
    dependsOn,
    recurrence,
  };
}

describe("buildSchedule", () => {
  // A(dur 3) -> B(dur 4) ; C(dur 2) independent
  const deliverables = [
    task("A", 1, 2), // duration 3
    task("B", 1, 3, ["A"]), // duration 4
    task("C", 0, 2), // duration 2
  ];
  const schedule = buildSchedule(deliverables, PROJECT_START);

  test("anchors earliest start/finish to the project start date", () => {
    const a = schedule.items.find((i) => i.id === "A")!;
    const b = schedule.items.find((i) => i.id === "B")!;
    expect(differenceInCalendarDays(a.start, PROJECT_START)).toBe(0);
    expect(differenceInCalendarDays(a.end, PROJECT_START)).toBe(3);
    // B starts after A finishes (day 3) and runs 4 days -> finishes day 7.
    expect(differenceInCalendarDays(b.start, PROJECT_START)).toBe(3);
    expect(differenceInCalendarDays(b.end, PROJECT_START)).toBe(7);
  });

  test("lead-in portion is reflected", () => {
    const a = schedule.items.find((i) => i.id === "A")!;
    expect(differenceInCalendarDays(a.leadInEnd, a.start)).toBe(1);
  });

  test("project duration is the critical chain length", () => {
    expect(schedule.projectDurationDays).toBe(7);
    expect(differenceInCalendarDays(schedule.projectEnd, PROJECT_START)).toBe(7);
  });

  test("critical path is A -> B", () => {
    expect(schedule.criticalPath).toEqual(["A", "B"]);
    const c = schedule.items.find((i) => i.id === "C")!;
    expect(c.critical).toBe(false);
    expect(c.slack).toBeGreaterThan(0);
  });

  test("items are ordered by start date", () => {
    const starts = schedule.items.map((i) => i.start.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  test("recurrence occurrences fall within the active window", () => {
    const weekly = buildSchedule(
      [task("R", 0, 28, [], { freq: "weekly", interval: 1, byWeekday: [3] })],
      PROJECT_START,
    );
    const r = weekly.items[0];
    expect(r.occurrences.length).toBeGreaterThan(0);
    for (const occ of r.occurrences) {
      expect(occ.getTime()).toBeGreaterThanOrEqual(r.leadInEnd.getTime());
      expect(occ.getTime()).toBeLessThanOrEqual(r.end.getTime());
      expect(occ.getDay()).toBe(3); // Wednesday
    }
  });

  test("a cyclic graph yields no schedule", () => {
    const cyclic = [task("X", 1, 1, ["Y"]), task("Y", 1, 1, ["X"])];
    const result = buildSchedule(cyclic, PROJECT_START);
    expect(result.hasCycle).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  test("can schedule backwards so the project finishes on launch day", () => {
    const launch = new Date("2026-09-30T00:00:00");
    const result = buildScheduleForLaunch(deliverables, launch, PROJECT_START);
    expect(differenceInCalendarDays(result.projectEnd, launch)).toBe(0);
    expect(differenceInCalendarDays(result.projectStart, launch)).toBe(-7);
  });

  test("uses the fallback start when no launch date is supplied", () => {
    const result = buildScheduleForLaunch(deliverables, null, PROJECT_START);
    expect(differenceInCalendarDays(result.projectStart, PROJECT_START)).toBe(0);
  });
});
