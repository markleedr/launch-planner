/**
 * Critical-issue checklist: a curated, editable list of risks/considerations to
 * review before launch. Seeded by project type with PLACEHOLDER content - the
 * real list is an outstanding business input (see
 * docs/project-planner/04-open-questions.md, item 4).
 */

import type { ProjectType } from "./types";

export type Severity = "low" | "medium" | "high";

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  severity: Severity;
  done: boolean;
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Sort order so high-severity items surface first. */
export const SEVERITY_RANK: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

interface Seed {
  title: string;
  severity: Severity;
  description?: string;
}

const COMMON: Seed[] = [
  {
    title: "Marketing budget approved",
    severity: "high",
    description: "Total campaign budget signed off against the project GRV.",
  },
  {
    title: "Sales agency / team appointed",
    severity: "high",
  },
  {
    title: "Legal: contracts and disclosure ready",
    severity: "high",
  },
  {
    title: "Display suite / sales office ready before launch",
    severity: "high",
  },
  {
    title: "Branding and creative approved",
    severity: "medium",
  },
  {
    title: "Pricing and price list finalised",
    severity: "medium",
  },
  {
    title: "Photography / renders delivered",
    severity: "medium",
  },
  {
    title: "CRM / enquiry capture in place",
    severity: "low",
  },
];

const BY_TYPE: Record<ProjectType, Seed[]> = {
  house_and_land: [
    { title: "Land titles / registration timeline confirmed", severity: "high" },
    { title: "House & land package pricing aligned with builder", severity: "medium" },
  ],
  multi_residential: [
    { title: "Planning / development approval secured", severity: "high" },
    { title: "Display apartment or virtual tour ready", severity: "high" },
    { title: "Owners corporation / strata budget prepared", severity: "low" },
  ],
  retirement_living: [
    { title: "Retirement village / aged-care approvals confirmed", severity: "high" },
    { title: "Display dwelling and care-offering walkthrough ready", severity: "medium" },
    { title: "Contract type (loan/licence) and fees documented", severity: "medium" },
  ],
  commercial: [
    { title: "Zoning / planning permit for commercial use confirmed", severity: "high" },
    { title: "Anchor tenant or pre-lease commitments documented", severity: "medium" },
    { title: "Outgoings and incentive structure prepared", severity: "low" },
  ],
  industrial: [
    { title: "Zoning / planning permit for industrial use confirmed", severity: "high" },
    { title: "Site access, hardstand and services confirmed", severity: "medium" },
    { title: "Clear-height, load and power specifications documented", severity: "low" },
  ],
};

/** Seed a checklist for the given project type. */
export function seedChecklist(projectType: ProjectType): ChecklistItem[] {
  return [...COMMON, ...BY_TYPE[projectType]].map((s, i) => ({
    id: `chk-${i}-${slug(s.title)}`,
    title: s.title,
    description: s.description,
    severity: s.severity,
    done: false,
  }));
}

export interface ChecklistProgress {
  done: number;
  total: number;
  /** Fraction complete, 0..1 (0 when empty). */
  pct: number;
  /** Count of not-done items by severity. */
  openHigh: number;
}

export function checklistProgress(items: ChecklistItem[]): ChecklistProgress {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const openHigh = items.filter((i) => !i.done && i.severity === "high").length;
  return { done, total, pct: total > 0 ? done / total : 0, openHigh };
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
