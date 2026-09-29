import { describe, expect, test } from "bun:test";
import { emptyUtm, hasAnyUtm, parseUtmFromSearch, retainCampaignSearch } from "./utm";

describe("utm helpers", () => {
  test("parses UTM params from a query string", () => {
    const params = new URLSearchParams(
      "utm_source=tud&utm_medium=banner&utm_campaign=oct2026&utm_content=hero&utm_term=apartments&other=x",
    );
    const utm = parseUtmFromSearch(params);
    expect(utm).toEqual({
      utm_source: "tud",
      utm_medium: "banner",
      utm_campaign: "oct2026",
      utm_content: "hero",
      utm_term: "apartments",
    });
    expect(hasAnyUtm(utm)).toBe(true);
  });

  test("returns nulls when UTMs are absent", () => {
    const utm = parseUtmFromSearch(new URLSearchParams("ref=home"));
    expect(utm).toEqual(emptyUtm());
    expect(hasAnyUtm(utm)).toBe(false);
  });
});

describe("retainCampaignSearch", () => {
  const retain = retainCampaignSearch();

  test("copies landing UTMs onto a navigation that replaces search", () => {
    expect(
      retain({
        search: {
          utm_source: "theurbandeveloper",
          utm_medium: "banner",
          utm_campaign: "tud-oct-nov-2026",
          utm_content: "  ",
          other: "drop-me",
        },
        next: () => ({ projectId: "abc" }),
      }),
    ).toEqual({
      projectId: "abc",
      utm_source: "theurbandeveloper",
      utm_medium: "banner",
      utm_campaign: "tud-oct-nov-2026",
    });
  });

  test("does not invent UTM keys that were not on the current URL", () => {
    expect(
      retain({
        search: { sample: "teneriffe" },
        next: () => ({}),
      }),
    ).toEqual({});
  });

  test("keeps a UTM the next search already set", () => {
    expect(
      retain({
        search: { utm_source: "theurbandeveloper" },
        next: () => ({ utm_source: "kept" }),
      }),
    ).toEqual({ utm_source: "kept" });
  });
});
