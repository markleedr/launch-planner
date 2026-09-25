import { describe, expect, test } from "bun:test";
import { averageSellPriceCents, mediaBudgetPctOfGrv, summariseFinancials } from "./grv";
import { toCents } from "./money";

describe("averageSellPriceCents", () => {
  test("average = GRV / units", () => {
    // $15,000,000 across 20 apartments => $750,000 each
    expect(averageSellPriceCents(toCents(15_000_000), 20)).toBe(toCents(750_000));
  });

  test("single house", () => {
    expect(averageSellPriceCents(toCents(1_200_000), 1)).toBe(toCents(1_200_000));
  });

  test("rounds to whole cents", () => {
    expect(averageSellPriceCents(toCents(1_000_000), 3)).toBe(33_333_333);
  });

  test("returns 0 for zero, negative or non-finite inputs", () => {
    expect(averageSellPriceCents(toCents(100), 0)).toBe(0);
    expect(averageSellPriceCents(toCents(100), -5)).toBe(0);
    expect(averageSellPriceCents(-100, 5)).toBe(0);
    expect(averageSellPriceCents(NaN, 5)).toBe(0);
    expect(averageSellPriceCents(toCents(100), Infinity)).toBe(0);
  });

  test("truncates fractional unit counts", () => {
    expect(averageSellPriceCents(toCents(200), 2.9)).toBe(toCents(100));
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
  test("rolls up GRV, average price and benchmark", () => {
    const s = summariseFinancials({
      units: 10,
      grvCents: toCents(9_000_000),
      mediaBudgetCents: toCents(180_000),
    });
    expect(s.grvCents).toBe(toCents(9_000_000));
    expect(s.averageSellPriceCents).toBe(toCents(900_000));
    expect(s.mediaBudgetPctOfGrv).toBeCloseTo(0.02, 6);
  });

  test("clamps a negative or non-finite GRV to 0", () => {
    expect(summariseFinancials({ units: 4, grvCents: -1, mediaBudgetCents: 0 }).grvCents).toBe(0);
    expect(summariseFinancials({ units: 4, grvCents: NaN, mediaBudgetCents: 0 }).grvCents).toBe(0);
  });
});
