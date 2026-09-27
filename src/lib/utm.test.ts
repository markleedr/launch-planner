import { describe, expect, test } from "bun:test";
import { emptyUtm, hasAnyUtm, parseUtmFromSearch } from "./utm";

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
