import { expect, test } from "bun:test";
import { buildTeneriffeRiversideSnapshot, buildPlanSections } from "@/lib/planner";
import { renderSectionPdfBlob } from "./section-export-pdf";

test("each plan section renders a PDF", async () => {
  const sections = buildPlanSections(buildTeneriffeRiversideSnapshot());
  for (const section of Object.values(sections)) {
    const blob = await renderSectionPdfBlob(section);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
  }
});
