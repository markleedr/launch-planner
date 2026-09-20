import { describe, expect, test } from "bun:test";
import { safeLocalRedirect } from "./redirect";

describe("safeLocalRedirect", () => {
  test("accepts same-site paths, query strings and hashes", () => {
    expect(safeLocalRedirect("/planner/new?step=2#deliverables")).toBe(
      "/planner/new?step=2#deliverables",
    );
  });

  test.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "\\\\example.com",
    "/projects\u0000",
    undefined,
  ])("rejects unsafe redirect %p", (value) => {
    expect(safeLocalRedirect(value)).toBe("/projects");
  });
});
