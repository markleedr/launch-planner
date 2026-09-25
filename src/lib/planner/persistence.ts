/**
 * Serialize the planner state to a JSON-safe snapshot for storage (Supabase
 * `project.data` JSONB) and revive it back. Dates are stored as ISO strings and
 * restored to Date objects on load. Pure and unit-tested.
 */

import type {
  BuyerPersona,
  BuyerType,
  ChannelCode,
  Deliverable,
  ProjectAddress,
  ProjectType,
  RecurrenceRule,
} from "./types";
import type { ProjectParty } from "../procurement";
import type { ChecklistItem } from "./checklist";
import type { Contact } from "./contacts";

/** The savable subset of the planner state (Dates are real Date objects). */
export interface PlannerSnapshot {
  projectName: string;
  projectBlurb: string;
  projectType: ProjectType;
  units: number;
  /** Gross realisation value in whole dollars, as typed. */
  grv: string;
  mediaBudget: string;
  launchDate: string;
  location: string;
  address: ProjectAddress;
  heroImageId: string;
  heroImageUrl: string;
  projectParties: ProjectParty[];
  standardCollectionBusinessDays: number;
  buyerTypes: BuyerType[];
  channels: ChannelCode[];
  personas: BuyerPersona[];
  deliverables: Deliverable[];
  checklist: ChecklistItem[];
  contacts: Contact[];
}

export const SNAPSHOT_VERSION = 3;

/** Convert a snapshot to a JSON-safe object for storage. */
export function serializePlanner(s: PlannerSnapshot): Record<string, unknown> {
  return {
    v: SNAPSHOT_VERSION,
    projectName: s.projectName,
    projectBlurb: s.projectBlurb,
    projectType: s.projectType,
    units: s.units,
    grv: s.grv,
    mediaBudget: s.mediaBudget,
    launchDate: s.launchDate,
    location: s.location,
    address: s.address,
    heroImageId: s.heroImageId,
    heroImageUrl: s.heroImageUrl,
    projectParties: s.projectParties,
    standardCollectionBusinessDays: s.standardCollectionBusinessDays,
    buyerTypes: s.buyerTypes,
    channels: s.channels,
    personas: s.personas,
    checklist: s.checklist.map(serializeChecklistItem),
    contacts: s.contacts,
    deliverables: s.deliverables.map(serializeDeliverable),
  };
}

/** Revive a stored object back into a snapshot. Returns null if unusable. */
export function deserializePlanner(data: unknown): PlannerSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!o.projectType) return null;
  try {
    return {
      projectName: String(o.projectName ?? "New project"),
      projectBlurb: String(o.projectBlurb ?? ""),
      projectType: o.projectType as ProjectType,
      units: Number(o.units) || 0,
      grv: storedGrvDollars(o),
      mediaBudget: String(o.mediaBudget ?? ""),
      launchDate: String(o.launchDate ?? ""),
      location: String(o.location ?? ""),
      address: asAddress(o.address, String(o.location ?? "")),
      heroImageId: String(o.heroImageId ?? "apartments"),
      heroImageUrl: String(o.heroImageUrl ?? ""),
      projectParties: asArray<ProjectParty>(o.projectParties),
      standardCollectionBusinessDays: nonNegativeNumber(o.standardCollectionBusinessDays, 10),
      buyerTypes: asArray<BuyerType>(o.buyerTypes),
      channels: asArray<ChannelCode>(o.channels),
      personas: asArray<BuyerPersona>(o.personas),
      checklist: asArray<Record<string, unknown>>(o.checklist).map(deserializeChecklistItem),
      contacts: asArray<Contact>(o.contacts),
      deliverables: asArray<Record<string, unknown>>(o.deliverables).map(deserializeDeliverable),
    };
  } catch {
    return null;
  }
}

function serializeChecklistItem(item: ChecklistItem): Record<string, unknown> {
  return { ...item, dueDate: item.dueDate?.toISOString() };
}

function deserializeChecklistItem(item: Record<string, unknown>): ChecklistItem {
  return {
    ...(item as unknown as ChecklistItem),
    dueDate: item.dueDate ? new Date(String(item.dueDate)) : undefined,
  };
}

function serializeDeliverable(d: Deliverable): Record<string, unknown> {
  return {
    ...d,
    startDate: d.startDate.toISOString(),
    endDate: d.endDate.toISOString(),
    collateralCutoffDate: d.collateralCutoffDate?.toISOString(),
    recurrence: d.recurrence ? serializeRecurrence(d.recurrence) : undefined,
  };
}

function serializeRecurrence(r: RecurrenceRule): Record<string, unknown> {
  if (r.end?.kind === "until") {
    return { ...r, end: { kind: "until", until: r.end.until.toISOString() } };
  }
  return { ...r };
}

function deserializeDeliverable(d: Record<string, unknown>): Deliverable {
  return {
    ...(d as unknown as Deliverable),
    startDate: new Date(String(d.startDate)),
    endDate: new Date(String(d.endDate)),
    collateralCutoffDate: d.collateralCutoffDate
      ? new Date(String(d.collateralCutoffDate))
      : undefined,
    recurrence: d.recurrence
      ? deserializeRecurrence(d.recurrence as Record<string, unknown>)
      : undefined,
  };
}

function deserializeRecurrence(r: Record<string, unknown>): RecurrenceRule {
  const end = r.end as { kind?: string; until?: string } | undefined;
  if (end?.kind === "until" && end.until) {
    return {
      ...(r as unknown as RecurrenceRule),
      end: { kind: "until", until: new Date(end.until) },
    };
  }
  return r as unknown as RecurrenceRule;
}

/**
 * The GRV in whole dollars from stored snapshot fields. Snapshots before v3
 * stored a per-unit sell price instead; GRV is units × that price.
 */
export function storedGrvDollars(o: Record<string, unknown>): string {
  if (o.grv !== undefined && o.grv !== null) return String(o.grv);
  const units = Number(o.units) || 0;
  const sellPrice = Number(String(o.sellPrice ?? "").replace(/[^0-9.]/g, ""));
  if (units <= 0 || !Number.isFinite(sellPrice) || sellPrice <= 0) return "";
  return String(Math.round(units * sellPrice));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function asAddress(value: unknown, legacyLocation: string): ProjectAddress {
  if (value && typeof value === "object") {
    const address = value as Record<string, unknown>;
    return {
      street: String(address.street ?? ""),
      suburb: String(address.suburb ?? ""),
      state: String(address.state ?? ""),
      postcode: String(address.postcode ?? ""),
    };
  }
  return { street: "", suburb: legacyLocation, state: "", postcode: "" };
}
