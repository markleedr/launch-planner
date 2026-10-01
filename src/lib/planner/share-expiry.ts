/** Provider share links expire. The form defaults to 30 days and refuses more than 90. */
export const SHARE_LINK_DEFAULT_DAYS = 30;
export const SHARE_LINK_MAX_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultShareExpiry(now = new Date()): Date {
  return new Date(now.getTime() + SHARE_LINK_DEFAULT_DAYS * DAY_MS);
}

export function maxShareExpiry(now = new Date()): Date {
  return new Date(now.getTime() + SHARE_LINK_MAX_DAYS * DAY_MS);
}

/** Returns a message when the expiry cannot be saved, or null when it is allowed. */
export function shareExpiryError(expiresAt: Date, now = new Date()): string | null {
  if (Number.isNaN(expiresAt.getTime())) return "Choose an expiry date.";
  if (expiresAt.getTime() <= now.getTime()) return "Pick a time in the future.";
  if (expiresAt.getTime() > maxShareExpiry(now).getTime()) {
    return "Expiry can't be more than 90 days away.";
  }
  return null;
}

/** Value for an `<input type="datetime-local">`. */
export function toDatetimeLocalValue(date: Date): string {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  const offsetMs = copy.getTimezoneOffset() * 60_000;
  return new Date(copy.getTime() - offsetMs).toISOString().slice(0, 16);
}
