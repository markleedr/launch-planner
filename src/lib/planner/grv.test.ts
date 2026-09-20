import { describe, expect, test } from "bun:test";
import { computeGrvCents, mediaBudgetPctOfGrv, summariseFinancials } from "./grv";
import { toCents } from "./money";

describe("computeGrvCents", () => {
  test("GRV = units x sell price", () => {
    // 20 apartments at $750,000 => $15,000,000
    expect(computeGrvCents(20, toCents(750_000))).toBe(toCents(15_000_000));
  });

  test("single house", () => {
    expect(computeGrvCents(1, toCents(1_200_000))).toBe(toCents(1_200_000));
  });

  test("clamps negative and non-finite inputs to 0", () => {
    expect(computeGrvCents(-5, toCents(100))).toBe(0);
    expect(computeGrvCents(5, -100)).toBe(0);
    expect(computeGrvCents(NaN, 100)).toBe(0);
    expect(computeGrvCents(5, Infinity)).toBe(0);
  });

  test("truncates fractional unit counts", () => {
    expect(computeGrvCents(2.9, toCents(100))).toBe(toCents(200));
  });
});

describe("mediaBudgetPctOfGrv", () => {
  test("budget as a fraction of GRV", () => {
    expect(mediaBudgetPctOfGrv(toCents(300_000), toCents(15_000_000))).toBeCloseTo(0.02, 6);
  });

  test("returns 0 when GRV is 0 (no divide-by-zero)", () => {
    expect(mediaBudgetPctOfGrv(toCents(300_000), 0)).toBe(0);
  });
});

describe("summariseFinancials", () => {
  test("rolls up GRV and benchmark", () => {
    const s = summariseFinancials({
      units: 10,
      sellPriceCents: toCents(900_000),
      mediaBudgetCents: toCents(180_000),
    });
    expect(s.grvCents).toBe(toCents(9_000_000));
    expect(s.mediaBudgetPctOfGrv).toBeCloseTo(0.02, 6);
  });
});
