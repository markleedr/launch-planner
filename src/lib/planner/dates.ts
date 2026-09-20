/**
 * AU date helpers. Dates are displayed DD/MM/YYYY per the agreed locale.
 */

import { addDays, differenceInCalendarDays, format } from "date-fns";

/** Format a date as DD/MM/YYYY (AU). */
export function formatAuDate(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

/** Format a date+time as DD/MM/YYYY h:mma (AU), e.g. "02/06/2026 8:00am". */
export function formatAuDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy h:mmaaa");
}

/** Inclusive day count between two dates (>= 0). */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, differenceInCalendarDays(to, from));
}

export { addDays };
