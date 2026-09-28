import { describe, expect, test } from "bun:test";
import { endDateForMonths, expandRecurrence, recurrenceFromMonths } from "./recurrence";
import type { RecurrenceRule } from "./types";

// 2026-06-01 is a Monday.
const MONDAY = new Date("2026-06-01T00:00:00");

describe("expandRecurrence", () => {
  test("no recurrence => single occurrence at start", () => {
    const occ = expandRecurrence(undefined, MONDAY, new Date("2026-12-31"));
    expect(occ).toHaveLength(1);
    expect(occ[0].date.getTime()).toBe(MONDAY.getTime());
  });

  test("'every Monday 8am for 6 weeks' => 6 consecutive Mondays at 08:00", () => {
    const rule: RecurrenceRule = {
      freq: "weekly",
      interval: 1,
      byWeekday: [1], // Monday
      byHour: 8,
      end: { kind: "count", count: 6 },
    };
    const occ = expandRecurrence(rule, MONDAY, new Date("2026-12-31"));
    expect(occ).toHaveLength(6);
    for (let i = 0; i < occ.length; i++) {
      expect(occ[i].date.getDay()).toBe(1); // Monday
      expect(occ[i].date.getHours()).toBe(8);
      const expected = new Date(MONDAY);
      expected.setDate(expected.getDate() + i * 7);
      expect(occ[i].date.getDate()).toBe(expected.getDate());
    }
  });

  test("daily with interval 2 within a range", () => {
    const rule: RecurrenceRule = { freq: "daily", interval: 2 };
    const occ = expandRecurrence(rule, MONDAY, new Date("2026-06-07T23:59:59"));
    // 1,3,5,7 June => 4 occurrences
    expect(occ.map((o) => o.date.getDate())).toEqual([1, 3, 5, 7]);
  });

  test("weekly with multiple weekdays", () => {
    const rule: RecurrenceRule = {
      freq: "weekly",
      interval: 1,
      byWeekday: [1, 3], // Mon + Wed
      end: { kind: "count", count: 4 },
    };
    const occ = expandRecurrence(rule, MONDAY, new Date("2026-12-31"));
    expect(occ.map((o) => o.date.getDay())).toEqual([1, 3, 1, 3]);
  });

  test("'until' end condition is respected", () => {
    const rule: RecurrenceRule = {
      freq: "weekly",
      interval: 1,
      byWeekday: [1],
      end: { kind: "until", until: new Date("2026-06-15") },
    };
    const occ = expandRecurrence(rule, MONDAY, new Date("2026-12-31"));
    // Mondays: 1, 8, 15 June
    expect(occ.map((o) => o.date.getDate())).toEqual([1, 8, 15]);
  });

  test("rangeEnd bounds the expansion even without an end rule", () => {
    const rule: RecurrenceRule = { freq: "weekly", interval: 1, byWeekday: [1] };
    const occ = expandRecurrence(rule, MONDAY, new Date("2026-06-20"));
    expect(occ.map((o) => o.date.getDate())).toEqual([1, 8, 15]);
  });

  test("monthly keeps the same day-of-month", () => {
    const rule: RecurrenceRule = {
      freq: "monthly",
      interval: 1,
      end: { kind: "count", count: 3 },
    };
    const start = new Date("2026-06-10T00:00:00");
    const occ = expandRecurrence(rule, start, new Date("2026-12-31"));
    expect(occ.map((o) => `${o.date.getMonth()}-${o.date.getDate()}`)).toEqual([
      "5-10", // June
      "6-10", // July
      "7-10", // August
    ]);
  });
});

describe("recurrenceFromMonths", () => {
  test("zero or unset is a one-off", () => {
    expect(recurrenceFromMonths(undefined)).toBeUndefined();
    expect(recurrenceFromMonths(0)).toBeUndefined();
    expect(recurrenceFromMonths(-3)).toBeUndefined();
  });

  test("a positive count is monthly on that many months", () => {
    expect(recurrenceFromMonths(1)).toEqual({
      freq: "monthly",
      interval: 1,
      end: { kind: "count", count: 1 },
    });
    expect(recurrenceFromMonths(12)).toEqual({
      freq: "monthly",
      interval: 1,
      end: { kind: "count", count: 12 },
    });
    expect(recurrenceFromMonths(6.9)).toEqual({
      freq: "monthly",
      interval: 1,
      end: { kind: "count", count: 6 },
    });
  });
});

describe("endDateForMonths", () => {
  test("zero or one month keeps a one-day bar", () => {
    expect(endDateForMonths(MONDAY, 0).getTime()).toBe(new Date("2026-06-02T00:00:00").getTime());
    expect(endDateForMonths(MONDAY, 1).getTime()).toBe(new Date("2026-06-02T00:00:00").getTime());
  });

  test("three months stretches to the same day two months later", () => {
    const end = endDateForMonths(new Date("2026-06-10T00:00:00"), 3);
    expect(`${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`).toBe("2026-8-10");
  });

  test("expandRecurrence sees every monthly mark inside that bar", () => {
    const start = new Date("2026-06-10T00:00:00");
    const months = 3;
    const occ = expandRecurrence(recurrenceFromMonths(months), start, endDateForMonths(start, months));
    expect(occ.map((o) => `${o.date.getMonth()}-${o.date.getDate()}`)).toEqual([
      "5-10",
      "6-10",
      "7-10",
    ]);
  });
});
