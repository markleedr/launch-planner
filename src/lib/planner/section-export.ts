/**
 * Tabular exports for each plan section. The rows match the figures on the
 * planner screen. CSV encoding lives here; PDF rendering is separate so this
 * module stays free of React.
 */

import { differenceInCalendarDays } from "date-fns";
import { deliverableCosts, summariseBudget } from "./budget";
import { checklistProgress, SEVERITY_LABELS, SEVERITY_RANK } from "./checklist";
import { CONTACT_TYPE_LABELS } from "./contacts";
import { formatAuDate } from "./dates";
import { summariseFinancials } from "./grv";
import { BUYER_TYPE_LABELS, CATEGORY_LABELS, PROJECT_TYPE_LABELS, UNIT_LABELS } from "./labels";
import { formatAud, formatAudWhole, formatPercent, parseDollarsToCents } from "./money";
import type { PlannerSnapshot } from "./persistence";
import { buildScheduleForLaunch } from "./schedule";
import type { Deliverable, DeliverableCategory } from "./types";

export type PlanSectionId = "details" | "budget" | "schedule" | "checklist" | "team";

export interface SectionTable {
  /** Optional label written above the header when a section has more than one table. */
  title?: string;
  columns: string[];
  rows: string[][];
}

export interface SectionExport {
  id: PlanSectionId;
  title: string;
  projectName: string;
  tables: SectionTable[];
  notes: string[];
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Encode one cell so Excel opens commas, quotes, and formula-like text as data. */
export function csvCell(value: string): string {
  let text = value ?? "";
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

/** UTF-8 CSV with a BOM so spreadsheet apps keep the AU currency symbols. */
export function sectionToCsv(section: SectionExport): string {
  const lines: string[][] = [
    ["Project", section.projectName],
    ["Section", section.title],
  ];
  for (const note of section.notes) lines.push(["Note", note]);
  for (const table of section.tables) {
    lines.push([]);
    if (table.title) lines.push([table.title]);
    lines.push(table.columns);
    for (const row of table.rows) lines.push(row);
  }
  const body = lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${body}\r\n`;
}

export function sectionFilename(section: SectionExport, extension: "csv" | "pdf"): string {
  const slug = section.projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "project"}-${section.id}.${extension}`;
}

export function buildPlanSections(snapshot: PlannerSnapshot): Record<PlanSectionId, SectionExport> {
  return {
    details: detailsSection(snapshot),
    budget: budgetSection(snapshot),
    schedule: scheduleSection(snapshot),
    checklist: checklistSection(snapshot),
    team: teamSection(snapshot),
  };
}

function detailsSection(snapshot: PlannerSnapshot): SectionExport {
  const financials = summariseFinancials({
    units: snapshot.units,
    grvCents: parseDollarsToCents(snapshot.grv),
    mediaBudgetCents: parseDollarsToCents(snapshot.mediaBudget),
  });
  const budget = summariseBudget(snapshot.deliverables, {
    mediaBudgetCents: financials.mediaBudgetCents,
    grvCents: financials.grvCents,
  });
  const average =
    snapshot.units > 0 && financials.grvCents > 0
      ? formatAudWhole(financials.averageSellPriceCents)
      : "Not set";
  const buyers = snapshot.buyerTypes.map((type) => BUYER_TYPE_LABELS[type]);

  return {
    id: "details",
    title: "Project details",
    projectName: snapshot.projectName,
    notes: [],
    tables: [
      {
        columns: ["Field", "Value"],
        rows: [
          ["Project name", snapshot.projectName || "Untitled project"],
          ["Project type", PROJECT_TYPE_LABELS[snapshot.projectType]],
          [UNIT_LABELS[snapshot.projectType], String(snapshot.units)],
          ["Gross realisation value (GRV)", formatAudWhole(financials.grvCents)],
          ["Average price", average],
          ["Media budget", formatAudWhole(financials.mediaBudgetCents)],
          ["Media budget as % of GRV", formatPercent(financials.mediaBudgetPctOfGrv)],
          ["Planned spend", formatAudWhole(budget.grandTotalCents)],
          ["Planned spend as % of GRV", formatPercent(budget.totalPctOfGrv)],
          ["Against media budget", varianceLabel(budget.varianceVsMediaBudgetCents)],
          ["Launch date", snapshot.launchDate ? formatLaunch(snapshot.launchDate) : "Not set"],
          ["Materials lead time", `${snapshot.standardCollectionBusinessDays} business days`],
          ["Location", snapshot.location.trim() || "Not set"],
          ["Buyer type", buyers.length > 0 ? buyers.join(", ") : "Not set"],
        ],
      },
    ],
  };
}

function budgetSection(snapshot: PlannerSnapshot): SectionExport {
  const financials = summariseFinancials({
    units: snapshot.units,
    grvCents: parseDollarsToCents(snapshot.grv),
    mediaBudgetCents: parseDollarsToCents(snapshot.mediaBudget),
  });
  const budget = summariseBudget(snapshot.deliverables, {
    mediaBudgetCents: financials.mediaBudgetCents,
    grvCents: financials.grvCents,
  });
  const rows: string[][] = [];
  for (const group of groupByCategory(snapshot.deliverables)) {
    const subtotal = budget.categories.find((category) => category.category === group.category);
    for (const deliverable of group.items) {
      const costs = deliverableCosts(deliverable);
      rows.push([
        CATEGORY_LABELS[group.category],
        deliverable.name,
        formatAud(costs.productionCents),
        formatAud(costs.mediaCents),
        formatAud(costs.totalCents),
      ]);
    }
    rows.push([
      CATEGORY_LABELS[group.category],
      "Subtotal",
      formatAud(subtotal?.productionCents ?? 0),
      formatAud(subtotal?.mediaCents ?? 0),
      formatAud(subtotal?.totalCents ?? 0),
    ]);
  }
  if (snapshot.deliverables.length > 0) {
    rows.push([
      "",
      "Grand total",
      formatAud(budget.productionTotalCents),
      formatAud(budget.mediaTotalCents),
      formatAud(budget.grandTotalCents),
    ]);
  }

  return {
    id: "budget",
    title: "Deliverables & budget",
    projectName: snapshot.projectName,
    notes:
      snapshot.deliverables.length === 0
        ? ["No deliverables yet."]
        : [
            `${varianceLabel(budget.varianceVsMediaBudgetCents)}. Totals include monthly rates and quantities.`,
          ],
    tables: [
      {
        columns: ["Category", "Deliverable", "Production", "Media", "Total"],
        rows,
      },
    ],
  };
}

function scheduleSection(snapshot: PlannerSnapshot): SectionExport {
  const launchDate = snapshot.launchDate ? new Date(`${snapshot.launchDate}T00:00:00`) : null;
  const schedule = buildScheduleForLaunch(snapshot.deliverables, launchDate);
  if (schedule.hasCycle) {
    return {
      id: "schedule",
      title: "Marketing schedule",
      projectName: snapshot.projectName,
      notes: ["The deliverables contain a circular dependency, so a schedule can't be computed."],
      tables: [
        {
          columns: [
            "Deliverable",
            "Category",
            "Start",
            "Finish",
            "Duration (days)",
            "Lead time (days)",
            "Slack (days)",
            "Critical",
            "Cost",
            "Placements",
          ],
          rows: [],
        },
      ],
    };
  }

  const names = new Map(schedule.items.map((item) => [item.id, item.name]));
  const critical = schedule.criticalPath.map((id) => names.get(id) ?? id);
  const daysLate = launchDate ? differenceInCalendarDays(schedule.projectEnd, launchDate) : null;
  const weeks = (schedule.projectDurationDays / 7).toFixed(1);

  return {
    id: "schedule",
    title: "Marketing schedule",
    projectName: snapshot.projectName,
    notes: [],
    tables: [
      {
        title: "Summary",
        columns: ["Field", "Value"],
        rows: [
          ["Schedule length", `${schedule.projectDurationDays} days (${weeks} weeks)`],
          ["Starts", formatAuDate(schedule.projectStart)],
          ["Earliest completion", formatAuDate(schedule.projectEnd)],
          ["Vs launch date", launchComparison(daysLate)],
          ["Critical path", critical.length > 0 ? critical.join(" → ") : "None"],
        ],
      },
      {
        title: "Deliverables",
        columns: [
          "Deliverable",
          "Category",
          "Start",
          "Finish",
          "Duration (days)",
          "Lead time (days)",
          "Slack (days)",
          "Critical",
          "Cost",
          "Placements",
        ],
        rows:
          schedule.items.length === 0
            ? []
            : schedule.items.map((item) => [
                item.name,
                CATEGORY_LABELS[item.category],
                formatAuDate(item.start),
                formatAuDate(item.end),
                String(item.durationDays),
                String(item.setupLeadDays),
                String(item.slack),
                item.critical ? "Yes" : "No",
                formatAud(item.costCents),
                String(item.occurrences.length),
              ]),
      },
    ],
  };
}

function checklistSection(snapshot: PlannerSnapshot): SectionExport {
  const progress = checklistProgress(snapshot.checklist);
  const items = [...snapshot.checklist].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  });

  return {
    id: "checklist",
    title: "Critical issues checklist",
    projectName: snapshot.projectName,
    notes: items.length === 0 ? ["No checklist items yet."] : [],
    tables: [
      {
        title: "Progress",
        columns: ["Field", "Value"],
        rows: [
          ["Reviewed", `${progress.done} of ${progress.total}`],
          ["High-priority open", String(progress.openHigh)],
        ],
      },
      {
        title: "Items",
        columns: ["Item", "Priority", "Status", "Due", "Description"],
        rows: items.map((item) => [
          item.title,
          SEVERITY_LABELS[item.severity],
          item.done ? "Reviewed" : "Open",
          item.dueDate ? formatAuDate(item.dueDate) : "",
          item.description ?? "",
        ]),
      },
    ],
  };
}

function teamSection(snapshot: PlannerSnapshot): SectionExport {
  const names = new Map(snapshot.contacts.map((contact) => [contact.id, contact.name]));
  const notes: string[] = [];
  if (snapshot.contacts.length === 0) notes.push("No contacts yet.");
  if (snapshot.deliverables.length === 0) notes.push("No deliverables to assign.");

  return {
    id: "team",
    title: "Team & suppliers",
    projectName: snapshot.projectName,
    notes,
    tables: [
      {
        title: "Directory",
        columns: ["Name", "Organisation", "Type", "Role", "Email", "Website"],
        rows: snapshot.contacts.map((contact) => [
          contact.name,
          contact.organisation ?? "",
          CONTACT_TYPE_LABELS[contact.type],
          contact.roleCategory ?? "",
          contact.email ?? "",
          contact.website ?? "",
        ]),
      },
      {
        title: "Allocation",
        columns: ["Deliverable", "Owner", "Suppliers", "Status"],
        rows: snapshot.deliverables.map((deliverable) => {
          const assignment = assignmentOf(deliverable, names);
          return [deliverable.name, assignment.owner, assignment.suppliers, assignment.status];
        }),
      },
    ],
  };
}

function assignmentOf(
  deliverable: Deliverable,
  names: Map<string, string>,
): { owner: string; suppliers: string; status: string } {
  const owner = deliverable.ownerContactId
    ? (names.get(deliverable.ownerContactId) ?? "Removed contact")
    : "Unassigned";
  const suppliers = deliverable.supplierNotApplicable
    ? "Not required"
    : (deliverable.supplierIds ?? []).map((id) => names.get(id) ?? "Removed contact").join("; ");
  const hasSupplier =
    (deliverable.supplierIds?.length ?? 0) > 0 || Boolean(deliverable.supplierNotApplicable);
  const status = deliverable.ownerContactId
    ? hasSupplier
      ? "Assigned"
      : "Owner only"
    : "Unassigned";
  return { owner, suppliers, status };
}

function groupByCategory(
  deliverables: Deliverable[],
): { category: DeliverableCategory; items: Deliverable[] }[] {
  const map = new Map<DeliverableCategory, Deliverable[]>();
  for (const deliverable of deliverables) {
    const list = map.get(deliverable.category) ?? [];
    list.push(deliverable);
    map.set(deliverable.category, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, items]) => ({ category, items }));
}

function varianceLabel(varianceCents: number): string {
  if (varianceCents > 0) return `${formatAudWhole(varianceCents)} over media budget`;
  return `${formatAudWhole(-varianceCents)} under media budget`;
}

function formatLaunch(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : formatAuDate(date);
}

function launchComparison(daysLate: number | null): string {
  if (daysLate === null) return "No launch date set";
  if (daysLate > 0) return `${daysLate} days late`;
  if (daysLate === 0) return "On time";
  return `${Math.abs(daysLate)} days buffer`;
}
