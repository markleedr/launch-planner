/**
 * Client-only project store for the Urban Developer guest demo.
 * Persists to sessionStorage. Never writes to Supabase.
 */

import {
  buildTeneriffeRiversideSnapshot,
  deserializePlanner,
  serializePlanner,
  type PlannerSnapshot,
} from "@/lib/planner";
import type { ProjectRow } from "@/lib/project-store";

const STORAGE_KEY = "launch-planner:tud-guest-projects";
export const EXAMPLE_TENERIFFE_ID = "example-teneriffe";

export interface GuestProjectRecord {
  id: string;
  name: string;
  updated_at: string;
  data: Record<string, unknown>;
}

function readAll(): GuestProjectRecord[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GuestProjectRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: GuestProjectRecord[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // private mode / quota
  }
}

function snapshotToRow(
  id: string,
  name: string,
  updatedAt: string,
  snap: PlannerSnapshot,
): ProjectRow {
  return {
    id,
    name,
    updated_at: updatedAt,
    projectType: snap.projectType,
    heroImageId: snap.heroImageId || "apartments",
    heroImageUrl: snap.heroImageUrl || "",
    units: snap.units,
    grv: snap.grv,
    mediaBudget: snap.mediaBudget,
    launchDate: snap.launchDate,
    suburb: snap.address.suburb || snap.location || "",
    state: snap.address.state || "",
  };
}

/** Fabricated Teneriffe example shown on every guest dashboard. */
export function exampleTeneriffeRow(): ProjectRow {
  const snap = buildTeneriffeRiversideSnapshot();
  return snapshotToRow(EXAMPLE_TENERIFFE_ID, snap.projectName, new Date().toISOString(), snap);
}

export function loadExampleTeneriffeSnapshot(): PlannerSnapshot {
  return buildTeneriffeRiversideSnapshot();
}

/** Guest-created projects only (excludes the built-in example). */
export function listGuestProjects(): ProjectRow[] {
  return readAll()
    .map((row) => {
      const snap = deserializePlanner(row.data);
      if (!snap) return null;
      return snapshotToRow(row.id, row.name, row.updated_at, snap);
    })
    .filter((row): row is ProjectRow => Boolean(row))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** Dashboard list: example first, then any guest-created projects. */
export function listGuestDashboardProjects(): ProjectRow[] {
  return [exampleTeneriffeRow(), ...listGuestProjects()];
}

export function loadGuestProject(id: string): { name: string; snapshot: PlannerSnapshot } | null {
  if (id === EXAMPLE_TENERIFFE_ID) {
    const snapshot = loadExampleTeneriffeSnapshot();
    return { name: snapshot.projectName, snapshot };
  }
  const row = readAll().find((item) => item.id === id);
  if (!row) return null;
  const snapshot = deserializePlanner(row.data);
  if (!snapshot) return null;
  return { name: row.name, snapshot };
}

export function saveGuestProject(id: string, name: string, snapshot: PlannerSnapshot): string {
  const rows = readAll().filter((item) => item.id !== id);
  const record: GuestProjectRecord = {
    id,
    name: name.trim() || "Untitled project",
    updated_at: new Date().toISOString(),
    data: serializePlanner(snapshot),
  };
  writeAll([record, ...rows]);
  return id;
}

export function createGuestProjectId(): string {
  return crypto.randomUUID();
}

export function deleteGuestProject(id: string): void {
  if (id === EXAMPLE_TENERIFFE_ID) return;
  writeAll(readAll().filter((item) => item.id !== id));
}

const LEAD_EMAIL_KEY = "launch-planner:tud-lead-email";

export function getCapturedLeadEmail(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(LEAD_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setCapturedLeadEmail(email: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LEAD_EMAIL_KEY, email);
  } catch {
    // ignore
  }
}
