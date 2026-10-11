import { describe, expect, test } from "bun:test";
import { BOOKING_URL } from "./booking";
import {
  leadNextLaunchField,
  leadRoleField,
  LEAD_NEXT_LAUNCHES,
  LEAD_ROLES,
} from "./qualification";

describe("qualification fields", () => {
  test("accepts every allowed value", () => {
    for (const role of LEAD_ROLES) expect(leadRoleField.parse(role)).toBe(role);
    for (const option of LEAD_NEXT_LAUNCHES) {
      expect(leadNextLaunchField.parse(option)).toBe(option);
    }
  });

  test("saves blank, null and missing as null", () => {
    for (const blank of ["", null, undefined]) {
      expect(leadRoleField.parse(blank)).toBeNull();
      expect(leadNextLaunchField.parse(blank)).toBeNull();
    }
  });

  test("rejects values outside the allowed list", () => {
    expect(() => leadRoleField.parse("CEO")).toThrow();
    expect(() => leadNextLaunchField.parse("Tomorrow")).toThrow();
  });
});

describe("booking url", () => {
  test("carries the campaign UTMs", () => {
    const url = new URL(BOOKING_URL);
    expect(url.origin + url.pathname).toBe("https://projectprofile.online/book/mark-4358");
    expect(url.searchParams.get("utm_source")).toBe("launchplanner");
    expect(url.searchParams.get("utm_medium")).toBe("app");
    expect(url.searchParams.get("utm_campaign")).toBe("tud_lp_oct26");
  });
});
