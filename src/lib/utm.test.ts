import { afterEach, describe, expect, test } from "bun:test";
import {
  captureUtmFromWindow,
  emptyUtm,
  hasAnyUtm,
  parseUtmFromSearch,
  retainCampaignSearch,
} from "./utm";

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

describe("captureUtmFromWindow across the Urban Developer pages", () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.sessionStorage;

  afterEach(() => {
    globalThis.window = previousWindow;
    globalThis.sessionStorage = previousStorage;
  });

  function visit(search: string) {
    globalThis.window = { location: { search } } as Window & typeof globalThis;
  }

  test("keeps the landing UTMs on later pages that have none in the URL", () => {
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;

    visit("?utm_source=theurbandeveloper&utm_medium=banner&utm_campaign=tud_oct&utm_content=hero");
    const landing = captureUtmFromWindow();
    expect(landing.utm_source).toBe("theurbandeveloper");

    for (const page of ["", "?projectId=abc"]) {
      visit(page);
      expect(captureUtmFromWindow()).toEqual({
        utm_source: "theurbandeveloper",
        utm_medium: "banner",
        utm_campaign: "tud_oct",
        utm_content: "hero",
        utm_term: null,
      });
    }
  });
});
