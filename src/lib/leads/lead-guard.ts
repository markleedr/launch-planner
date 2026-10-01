/** A marketing plan snapshot is capped so a public form cannot store an arbitrary document. */
export const MAX_PLAN_SNAPSHOT_BYTES = 128 * 1024;

export const LEAD_EMAIL_LIMIT = 5;
export const LEAD_IP_LIMIT = 20;
export const LEAD_WINDOW_MS = 60 * 60 * 1000;

export function planSnapshotBytes(snapshot: unknown): number {
  if (snapshot == null) return 0;
  return new TextEncoder().encode(JSON.stringify(snapshot)).length;
}

export function planSnapshotTooLarge(snapshot: unknown): boolean {
  return planSnapshotBytes(snapshot) > MAX_PLAN_SNAPSHOT_BYTES;
}

/**
 * Sliding-window limiter. `timestamps` are previous hit times in milliseconds.
 * Returns the timestamps to keep, including this attempt when it is allowed.
 */
export function allowAndRecord(
  timestamps: number[],
  now: number,
  windowMs: number,
  limit: number,
): { allowed: boolean; timestamps: number[] } {
  const fresh = timestamps.filter((hit) => now - hit < windowMs);
  if (fresh.length >= limit) return { allowed: false, timestamps: fresh };
  return { allowed: true, timestamps: [...fresh, now] };
}
