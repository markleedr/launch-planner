/**
 * AUD money helpers. All amounts are stored as integer cents; these functions
 * are the only place that converts to/from display strings and dollars.
 */

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const AUD_WHOLE = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Convert dollars (possibly fractional) to integer cents, rounded. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert integer cents to a dollars number. */
export function toDollars(cents: number): number {
  return cents / 100;
}

/** Format cents as AUD, e.g. 123456 -> "$1,234.56". */
export function formatAud(cents: number): string {
  return AUD.format(toDollars(cents));
}

/** Format cents as AUD with no decimals, e.g. 123456 -> "$1,235". */
export function formatAudWhole(cents: number): string {
  return AUD_WHOLE.format(toDollars(cents));
}

/**
 * Parse a user-entered dollar string ("$1,234.56", "1234.5", "") into cents.
 * Returns 0 for empty/invalid input so the UI never produces NaN totals.
 */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? toCents(value) : 0;
}

/** Format a 0..1 ratio as a percentage string, e.g. 0.0234 -> "2.3%". */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return "-";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
