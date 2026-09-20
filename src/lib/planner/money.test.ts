import { describe, expect, test } from "bun:test";
import {
  formatAud,
  formatAudWhole,
  formatPercent,
  parseDollarsToCents,
  toCents,
  toDollars,
} from "./money";

describe("cents conversion", () => {
  test("toCents rounds to the nearest cent", () => {
    expect(toCents(12.345)).toBe(1235);
    expect(toCents(0.1)).toBe(10);
  });

  test("toDollars inverts toCents", () => {
    expect(toDollars(1235)).toBeCloseTo(12.35, 6);
  });
});

describe("formatAud", () => {
  test("formats cents as AUD currency", () => {
    expect(formatAud(123456)).toBe("$1,234.56");
  });

  test("whole-dollar formatting rounds", () => {
    expect(formatAudWhole(123456)).toBe("$1,235");
  });
});

describe("parseDollarsToCents", () => {
  test("strips currency symbols and separators", () => {
    expect(parseDollarsToCents("$1,234.56")).toBe(123456);
    expect(parseDollarsToCents("750000")).toBe(75_000_000);
  });

  test("empty / invalid input becomes 0", () => {
    expect(parseDollarsToCents("")).toBe(0);
    expect(parseDollarsToCents("abc")).toBe(0);
    expect(parseDollarsToCents(".")).toBe(0);
  });
});

describe("formatPercent", () => {
  test("formats a ratio", () => {
    expect(formatPercent(0.0234)).toBe("2.3%");
  });

  test("non-finite shows em dash", () => {
    expect(formatPercent(Infinity)).toBe("-");
  });
});
