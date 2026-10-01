import { describe, expect, test } from "bun:test";
import {
  defaultShareExpiry,
  maxShareExpiry,
  shareExpiryError,
  SHARE_LINK_DEFAULT_DAYS,
  SHARE_LINK_MAX_DAYS,
} from "./share-expiry";

const now = new Date("2026-10-01T00:00:00.000Z");

describe("share link expiry", () => {
  test("defaults to 30 days and caps at 90", () => {
    expect(SHARE_LINK_DEFAULT_DAYS).toBe(30);
    expect(SHARE_LINK_MAX_DAYS).toBe(90);
    expect(defaultShareExpiry(now).toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(maxShareExpiry(now).toISOString()).toBe("2026-12-30T00:00:00.000Z");
  });

  test("accepts a date inside the window and rejects the rest", () => {
    expect(shareExpiryError(defaultShareExpiry(now), now)).toBeNull();
    expect(shareExpiryError(maxShareExpiry(now), now)).toBeNull();
    expect(shareExpiryError(new Date(now.getTime() - 1000), now)).toBe(
      "Pick a time in the future.",
    );
    expect(shareExpiryError(new Date(maxShareExpiry(now).getTime() + 1000), now)).toBe(
      "Expiry can't be more than 90 days away.",
    );
    expect(shareExpiryError(new Date("not-a-date"), now)).toBe("Choose an expiry date.");
  });
});
