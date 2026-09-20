import { describe, expect, test } from "bun:test";
import {
  isSubscriptionActive,
  normaliseSubscriptionStatus,
  type SubscriptionRecord,
} from "./subscription";

const now = new Date("2026-07-23T00:00:00Z");
const future = new Date("2026-08-23T00:00:00Z");
const past = new Date("2026-06-23T00:00:00Z");

describe("isSubscriptionActive", () => {
  test("null / undefined record is inactive", () => {
    expect(isSubscriptionActive(null, now)).toBe(false);
    expect(isSubscriptionActive(undefined, now)).toBe(false);
  });

  test("active within the current period is active", () => {
    const rec: SubscriptionRecord = { status: "active", currentPeriodEnd: future };
    expect(isSubscriptionActive(rec, now)).toBe(true);
  });

  test("trialing within the current period is active", () => {
    const rec: SubscriptionRecord = { status: "trialing", currentPeriodEnd: future };
    expect(isSubscriptionActive(rec, now)).toBe(true);
  });

  test("active but period elapsed is inactive", () => {
    const rec: SubscriptionRecord = { status: "active", currentPeriodEnd: past };
    expect(isSubscriptionActive(rec, now)).toBe(false);
  });

  test("missing period end fails closed", () => {
    const rec: SubscriptionRecord = { status: "trialing", currentPeriodEnd: null };
    expect(isSubscriptionActive(rec, now)).toBe(false);
  });

  test.each([
    "inactive",
    "past_due",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "unpaid",
    "paused",
  ] as const)("%s status is inactive even with a future period", (status) => {
    expect(isSubscriptionActive({ status, currentPeriodEnd: future }, now)).toBe(false);
  });
});

describe("normaliseSubscriptionStatus", () => {
  test("preserves known Stripe statuses", () => {
    expect(normaliseSubscriptionStatus("active")).toBe("active");
    expect(normaliseSubscriptionStatus("unpaid")).toBe("unpaid");
  });

  test("fails closed for a future unknown status", () => {
    expect(normaliseSubscriptionStatus("future_status")).toBe("inactive");
  });
});
