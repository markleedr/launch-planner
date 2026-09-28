import { describe, expect, test } from "bun:test";
import { summariseBudget } from "./budget";
import { buildTeneriffeRiversideSnapshot } from "./demos/teneriffe-riverside";
import { summariseFinancials } from "./grv";
import { formatAud, formatAudWhole, parseDollarsToCents } from "./money";
import { buildPlanSections, csvCell, sectionFilename, sectionToCsv } from "./section-export";
import type { Deliverable } from "./types";

describe("section csv", () => {
  test("quotes commas and neutralises formula text", () => {
    expect(csvCell('Acme, "North"')).toBe('"Acme, ""North"""');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+61 400")).toBe("'+61 400");
  });

  test("names each section file from the project", () => {
    const sections = buildPlanSections(buildTeneriffeRiversideSnapshot());
    expect(sectionFilename(sections.budget, "csv")).toBe("beachside-residences-budget.csv");
    expect(sectionFilename(sections.schedule, "pdf")).toBe("beachside-residences-schedule.pdf");
  });

  test("details include the financials shown on the plan", () => {
    const snapshot = buildTeneriffeRiversideSnapshot();
    const financials = summariseFinancials({
      units: snapshot.units,
      grvCents: parseDollarsToCents(snapshot.grv),
      mediaBudgetCents: parseDollarsToCents(snapshot.mediaBudget),
    });
    const csv = sectionToCsv(buildPlanSections(snapshot).details);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Section,Project details");
    expect(csv).toContain("Project type,Multi-residential building");
    expect(csv).toContain(`"${formatAudWhole(financials.grvCents)}"`);
    expect(csv).toContain(`"${formatAudWhole(financials.mediaBudgetCents)}"`);
    expect(csv).toContain("Launch date,15/03/2027");
    expect(csv).toContain("Location,Central Coast");
    expect(csv).toContain('"Owner-occupier, Investor, Downsizer"');
  });

  test("budget lists deliverables, subtotals and the grand total", () => {
    const snapshot = buildTeneriffeRiversideSnapshot();
    const financials = summariseFinancials({
      units: snapshot.units,
      grvCents: parseDollarsToCents(snapshot.grv),
      mediaBudgetCents: parseDollarsToCents(snapshot.mediaBudget),
    });
    const budget = summariseBudget(snapshot.deliverables, {
      mediaBudgetCents: financials.mediaBudgetCents,
      grvCents: financials.grvCents,
    });
    const csv = sectionToCsv(buildPlanSections(snapshot).budget);
    expect(csv).toContain("Category,Deliverable,Production,Media,Total");
    expect(csv).toContain("Meta media buy");
    expect(csv).toContain("Grand total");
    expect(csv).toContain(formatAud(budget.grandTotalCents));
    expect(csv).toContain("over media budget");
  });

  test("escapes a deliverable name that looks like a spreadsheet formula", () => {
    const snapshot = buildTeneriffeRiversideSnapshot();
    snapshot.deliverables = [
      { ...snapshot.deliverables[0]!, name: '=HYPERLINK("http://evil.test")' },
    ];
    const csv = sectionToCsv(buildPlanSections(snapshot).budget);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.test"")"`);
  });

  test("schedule exports the critical path and a circular dependency as a note", () => {
    const snapshot = buildTeneriffeRiversideSnapshot();
    const csv = sectionToCsv(buildPlanSections(snapshot).schedule);
    expect(csv).toContain("Vs launch date,");
    expect(csv).toContain("Critical,");
    expect(csv).toContain("Meta media buy");

    const cycled = buildTeneriffeRiversideSnapshot();
    const first = cycled.deliverables[0]!;
    const second = cycled.deliverables[1]!;
    cycled.deliverables = [
      { ...first, dependsOn: [second.id] },
      { ...second, dependsOn: [first.id] },
    ] satisfies Deliverable[];
    const blocked = sectionToCsv(buildPlanSections(cycled).schedule);
    expect(blocked).toContain("circular dependency");
    expect(blocked).not.toContain(first.name);
  });

  test("checklist marks seeded items open and high priority first", () => {
    const csv = sectionToCsv(buildPlanSections(buildTeneriffeRiversideSnapshot()).checklist);
    expect(csv).toContain("Marketing budget approved,High,Open");
    expect(csv).toContain("Reviewed,0 of");
    const openAt = csv.indexOf("Marketing budget approved,High,Open");
    const lowAt = csv.indexOf(",Low,Open");
    expect(openAt).toBeGreaterThan(-1);
    expect(lowAt).toBeGreaterThan(openAt);
  });

  test("team exports the directory and deliverable allocation", () => {
    const snapshot = buildTeneriffeRiversideSnapshot();
    snapshot.contacts = [
      {
        id: "owner-1",
        name: "Avery Chen",
        organisation: "North Agency",
        type: "agency_head",
        email: "avery@north.test",
      },
      {
        id: "supplier-1",
        name: "Print Co",
        type: "supplier",
        website: "https://print.test",
      },
    ];
    snapshot.deliverables = [
      {
        ...snapshot.deliverables[0]!,
        ownerContactId: "owner-1",
        supplierIds: ["supplier-1"],
      },
    ];
    const csv = sectionToCsv(buildPlanSections(snapshot).team);
    expect(csv).toContain("Directory");
    expect(csv).toContain("Avery Chen,North Agency,Agency / contractor");
    expect(csv).toContain("Allocation");
    expect(csv).toContain("Avery Chen,Print Co,Assigned");
  });
});
