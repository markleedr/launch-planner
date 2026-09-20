/**
 * Critical Path Method (CPM) engine.
 *
 * Builds a dependency DAG from deliverables, computes earliest/latest
 * start/finish and slack via forward/backward passes, and identifies the
 * critical path (tasks with zero slack). All times are in **days relative to
 * time 0** (the earliest any task with no predecessors can start).
 */

import { differenceInCalendarDays } from "date-fns";
import type { Deliverable } from "./types";

export interface CpmNode {
  id: string;
  durationDays: number;
  /** Earliest start / finish (days from time 0). */
  es: number;
  ef: number;
  /** Latest start / finish without delaying the project. */
  ls: number;
  lf: number;
  /** ls - es. Zero => on the critical path. */
  slack: number;
  critical: boolean;
}

export interface CpmResult {
  nodes: Map<string, CpmNode>;
  /** Total project duration in days (max earliest finish). */
  projectDurationDays: number;
  /** Critical-path deliverable ids in topological order. */
  criticalPath: string[];
  /** True if the dependency graph contained a cycle (result is then empty). */
  hasCycle: boolean;
}

/** Duration of a deliverable in days: lead time + active run length. */
export function deliverableDurationDays(d: Deliverable): number {
  const run = Math.max(0, differenceInCalendarDays(d.endDate, d.startDate));
  return Math.max(0, Math.trunc(d.setupLeadDays)) + run;
}

/**
 * Compute the critical path. Edges to unknown deliverable ids are ignored so a
 * stale dependency can't crash the schedule. On a cycle, returns an empty
 * result with `hasCycle = true` (the caller should reject the edit upstream).
 */
export function computeCpm(deliverables: Deliverable[]): CpmResult {
  const ids = new Set(deliverables.map((d) => d.id));
  const duration = new Map<string, number>();
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();

  for (const d of deliverables) {
    duration.set(d.id, deliverableDurationDays(d));
    preds.set(d.id, []);
    succs.set(d.id, []);
  }
  for (const d of deliverables) {
    for (const dep of d.dependsOn ?? []) {
      if (!ids.has(dep) || dep === d.id) continue;
      preds.get(d.id)!.push(dep);
      succs.get(dep)!.push(d.id);
    }
  }

  const order = topoSort(deliverables, succs);
  if (!order) {
    return {
      nodes: new Map(),
      projectDurationDays: 0,
      criticalPath: [],
      hasCycle: true,
    };
  }

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  // Forward pass (topological order): ES = max EF of predecessors.
  for (const id of order) {
    const start = Math.max(0, ...preds.get(id)!.map((p) => ef.get(p) ?? 0));
    es.set(id, start);
    ef.set(id, start + duration.get(id)!);
  }

  const projectDurationDays = Math.max(0, ...order.map((id) => ef.get(id)!));

  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  // Backward pass (reverse order): LF = min LS of successors, or project end.
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const successors = succs.get(id)!;
    const finish =
      successors.length === 0
        ? projectDurationDays
        : Math.min(...successors.map((s) => ls.get(s)!));
    lf.set(id, finish);
    ls.set(id, finish - duration.get(id)!);
  }

  const nodes = new Map<string, CpmNode>();
  for (const id of order) {
    const slack = ls.get(id)! - es.get(id)!;
    nodes.set(id, {
      id,
      durationDays: duration.get(id)!,
      es: es.get(id)!,
      ef: ef.get(id)!,
      ls: ls.get(id)!,
      lf: lf.get(id)!,
      slack,
      critical: slack === 0,
    });
  }

  const criticalPath = order.filter((id) => nodes.get(id)!.critical);

  return { nodes, projectDurationDays, criticalPath, hasCycle: false };
}

/**
 * Would setting `id`'s dependencies to `candidateDependsOn` create a cycle?
 * Used to reject invalid dependency edits before they're applied.
 */
export function dependencyWouldCreateCycle(
  deliverables: Deliverable[],
  id: string,
  candidateDependsOn: string[],
): boolean {
  const updated = deliverables.map((d) =>
    d.id === id ? { ...d, dependsOn: candidateDependsOn } : d,
  );
  return computeCpm(updated).hasCycle;
}

/** Kahn topological sort. Returns null if a cycle is present. */
function topoSort(deliverables: Deliverable[], succs: Map<string, string[]>): string[] | null {
  const indegree = new Map<string, number>();
  for (const d of deliverables) indegree.set(d.id, 0);
  for (const list of succs.values()) {
    for (const s of list) indegree.set(s, (indegree.get(s) ?? 0) + 1);
  }

  const queue = [...indegree.entries()].filter(([, deg]) => deg === 0).map(([id]) => id);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const s of succs.get(id) ?? []) {
      const deg = indegree.get(s)! - 1;
      indegree.set(s, deg);
      if (deg === 0) queue.push(s);
    }
  }

  return order.length === deliverables.length ? order : null;
}
