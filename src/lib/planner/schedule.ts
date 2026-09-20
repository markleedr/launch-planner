/**
 * Scheduling layer: combine the CPM engine, deliverable durations and
 * recurrence rules into a calendar-anchored schedule the Gantt can render.
 *
 * Bars are positioned from the CPM forward pass (earliest start/finish) anchored
 * to a project start date, so the schedule is internally consistent with the
 * dependency graph and the critical path. Pure and unit-tested.
 */

import { addDays, subDays } from "date-fns";
import { calculateProposalCost } from "../procurement";
import { computeCpm } from "./cpm";
import { expandRecurrence } from "./recurrence";
import type { Deliverable } from "./types";

export interface ScheduledItem {
  id: string;
  name: string;
  category: Deliverable["category"];
  /** Scheduled start (project start + earliest start). */
  start: Date;
  /** End of the setup/lead-in portion. */
  leadInEnd: Date;
  /** Scheduled finish (project start + earliest finish). */
  end: Date;
  durationDays: number;
  setupLeadDays: number;
  slack: number;
  critical: boolean;
  costCents: number;
  /** Concrete recurrence occurrences within the active window. */
  occurrences: Date[];
}

export interface Schedule {
  items: ScheduledItem[];
  projectStart: Date;
  projectEnd: Date;
  projectDurationDays: number;
  /** Critical-path deliverable ids in order. */
  criticalPath: string[];
  hasCycle: boolean;
}

/**
 * Build a schedule for the given deliverables anchored at `projectStart`.
 * Returns `hasCycle: true` with no items if the dependency graph is cyclic.
 */
export function buildSchedule(deliverables: Deliverable[], projectStart: Date): Schedule {
  const cpm = computeCpm(deliverables);

  if (cpm.hasCycle) {
    return {
      items: [],
      projectStart,
      projectEnd: projectStart,
      projectDurationDays: 0,
      criticalPath: [],
      hasCycle: true,
    };
  }

  const items: ScheduledItem[] = deliverables.map((d) => {
    const node = cpm.nodes.get(d.id)!;
    const start = addDays(projectStart, node.es);
    const end = addDays(projectStart, node.ef);
    const lead = Math.max(0, Math.trunc(d.setupLeadDays));
    const leadInEnd = addDays(start, Math.min(lead, node.durationDays));
    const occurrences = expandRecurrence(d.recurrence, leadInEnd, end).map((o) => o.date);
    return {
      id: d.id,
      name: d.name,
      category: d.category,
      start,
      leadInEnd,
      end,
      durationDays: node.durationDays,
      setupLeadDays: lead,
      slack: node.slack,
      critical: node.critical,
      costCents: calculateProposalCost({
        notes: "",
        setupBusinessDays: d.setupLeadDays,
        agencyOneOffCents: d.agencyCostCents ?? 0,
        agencyMonthlyCents: d.agencyMonthlyCostCents ?? 0,
        productionUnitCents: d.productionCostCents,
        productionToBeConfirmed: d.productionCostTbc ?? false,
        mediaOneOffCents: d.mediaCostCents,
        mediaMonthlyCents: d.mediaMonthlyCostCents ?? 0,
        quantity: d.quantity ?? 1,
        months: d.months ?? 0,
      }).totalCents,
      occurrences,
    };
  });

  // Keep critical items first within their start, then by start date, so the
  // Gantt reads top-to-bottom roughly in schedule order.
  items.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    items,
    projectStart,
    projectEnd: addDays(projectStart, cpm.projectDurationDays),
    projectDurationDays: cpm.projectDurationDays,
    criticalPath: cpm.criticalPath,
    hasCycle: false,
  };
}

/**
 * Build a delivery schedule that finishes on the nominated launch date. When
 * no launch date is supplied, the schedule begins at the fallback date.
 */
export function buildScheduleForLaunch(
  deliverables: Deliverable[],
  launchDate: Date | null,
  fallbackStart: Date = new Date(),
): Schedule {
  const start = atStartOfDay(fallbackStart);
  if (!launchDate || Number.isNaN(launchDate.getTime())) {
    return buildSchedule(deliverables, start);
  }
  const cpm = computeCpm(deliverables);
  const launch = atStartOfDay(launchDate);
  if (cpm.hasCycle) return buildSchedule(deliverables, launch);
  return buildSchedule(deliverables, subDays(launch, cpm.projectDurationDays));
}

function atStartOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}
