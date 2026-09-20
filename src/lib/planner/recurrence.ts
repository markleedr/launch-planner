/**
 * Recurrence expansion: turn an RRULE-like rule into concrete occurrences over
 * a date range. Deliberately limited to the cases the product supports
 * (none / daily / weekly+weekdays / monthly), so it's hand-rolled and has no
 * external dependency.
 */

import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { Deliverable, Occurrence, RecurrenceRule } from "./types";

/** Hard cap so a malformed rule can never produce an unbounded loop. */
const MAX_OCCURRENCES = 1000;
const MAX_DAYS_SCANNED = 366 * 5; // 5 years

/**
 * Expand a recurrence rule into occurrences within [start, rangeEnd].
 *
 * - `none`: a single occurrence at `start` (if within range).
 * - `daily`: every `interval` days from `start`.
 * - `weekly`: on `byWeekday` days (default: start's weekday) every `interval` weeks.
 * - `monthly`: same day-of-month as `start`, every `interval` months.
 *
 * Bounded by `rangeEnd`, by `rule.end` (count or until), and by hard caps.
 */
export function expandRecurrence(
  rule: RecurrenceRule | undefined,
  start: Date,
  rangeEnd: Date,
): Occurrence[] {
  const interval = Math.max(1, Math.trunc(rule?.interval ?? 1));
  const byHour = rule?.byHour;
  const withHour = (d: Date): Date => {
    if (byHour === undefined) return d;
    const copy = new Date(d);
    copy.setHours(clampHour(byHour), 0, 0, 0);
    return copy;
  };

  // No recurrence: a single occurrence at the start.
  if (!rule || rule.freq === "none") {
    return start <= rangeEnd ? [{ date: withHour(start) }] : [];
  }

  const untilCap = rule.end?.kind === "until" ? endOfDay(rule.end.until) : undefined;
  const countCap = rule.end?.kind === "count" ? rule.end.count : undefined;
  const hardEnd = untilCap && untilCap < rangeEnd ? untilCap : rangeEnd;

  const occurrences: Occurrence[] = [];
  const weekdays =
    rule.freq === "weekly" ? normaliseWeekdays(rule.byWeekday, start.getDay()) : null;

  const startDay = startOfDay(start);
  const startWeek = startOfWeek(start, { weekStartsOn: 0 });

  let cursor = startDay;
  let scanned = 0;
  while (cursor <= hardEnd && scanned < MAX_DAYS_SCANNED) {
    if (matches(rule.freq, cursor, startDay, startWeek, interval, weekdays)) {
      occurrences.push({ date: withHour(cursor) });
      if (countCap !== undefined && occurrences.length >= countCap) break;
      if (occurrences.length >= MAX_OCCURRENCES) break;
    }
    cursor = addDays(cursor, 1);
    scanned += 1;
  }

  return occurrences;
}

/** Convenience: expand a deliverable's placement over its own start/end dates. */
export function deliverableOccurrences(d: Deliverable): Occurrence[] {
  return expandRecurrence(d.recurrence, d.startDate, d.endDate);
}

function matches(
  freq: RecurrenceRule["freq"],
  day: Date,
  startDay: Date,
  startWeek: Date,
  interval: number,
  weekdays: number[] | null,
): boolean {
  switch (freq) {
    case "daily":
      return differenceInCalendarDays(day, startDay) % interval === 0;
    case "weekly": {
      if (weekdays && !weekdays.includes(day.getDay())) return false;
      const weekIndex = Math.floor(
        differenceInCalendarDays(startOfWeek(day, { weekStartsOn: 0 }), startWeek) / 7,
      );
      return weekIndex % interval === 0;
    }
    case "monthly": {
      if (day.getDate() !== startDay.getDate()) return false;
      return differenceInCalendarMonths(day, startDay) % interval === 0;
    }
    default:
      return false;
  }
}

function normaliseWeekdays(byWeekday: number[] | undefined, fallback: number): number[] {
  const days = (byWeekday && byWeekday.length > 0 ? byWeekday : [fallback])
    .map((d) => ((d % 7) + 7) % 7)
    .filter((d, i, arr) => arr.indexOf(d) === i);
  return days;
}

function clampHour(hour: number): number {
  return Math.min(23, Math.max(0, Math.trunc(hour)));
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
