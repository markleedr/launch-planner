import { describe, expect, test } from "bun:test";
import { buildUrbanDeveloperDemoSnapshot } from "@/lib/planner/demos/urban-developer";
import { serializePlanner } from "@/lib/planner/persistence";
import {
  allowAndRecord,
  LEAD_EMAIL_LIMIT,
  LEAD_WINDOW_MS,
  MAX_PLAN_SNAPSHOT_BYTES,
  planSnapshotTooLarge,
} from "./lead-guard";

describe("lead guards", () => {
  test("accepts a full Urban Developer demo plan and rejects a huge snapshot", () => {
    const snapshot = serializePlanner(
      buildUrbanDeveloperDemoSnapshot({
        projectType: "multi_residential",
        units: 2000,
        launchDate: "2026-11-01",
        mediaBudget: 5_000_000,
      }),
    );
    expect(planSnapshotTooLarge(snapshot)).toBe(false);
    expect(planSnapshotTooLarge(null)).toBe(false);
    expect(MAX_PLAN_SNAPSHOT_BYTES).toBe(131072);
    expect(planSnapshotTooLarge({ padding: "x".repeat(MAX_PLAN_SNAPSHOT_BYTES) })).toBe(true);
  });

  test("allows five hits in an hour and blocks the sixth", () => {
    const start = 1_000_000;
    let stamps: number[] = [];
    for (let i = 0; i < LEAD_EMAIL_LIMIT; i += 1) {
      const result = allowAndRecord(stamps, start + i, LEAD_WINDOW_MS, LEAD_EMAIL_LIMIT);
      expect(result.allowed).toBe(true);
      stamps = result.timestamps;
    }
    expect(allowAndRecord(stamps, start + 10, LEAD_WINDOW_MS, LEAD_EMAIL_LIMIT).allowed).toBe(
      false,
    );
    expect(
      allowAndRecord(stamps, start + LEAD_WINDOW_MS + 1, LEAD_WINDOW_MS, LEAD_EMAIL_LIMIT).allowed,
    ).toBe(true);
  });
});
