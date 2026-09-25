import {
  buildScheduleForLaunch,
  parseDollarsToCents,
  summariseBudget,
  summariseFinancials,
  type Deliverable,
  type DeliverableCategory,
  type PlannerSnapshot,
} from "@/lib/planner";
import type { ProjectPartyRole } from "@/lib/procurement";

export interface PublicProjectParty {
  id: string;
  role: ProjectPartyRole;
  organisationName: string;
  representativeName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
}

export function normaliseProjectPartyRow(row: Record<string, unknown>): PublicProjectParty {
  const party = (row.party ?? row) as Record<string, unknown>;
  return {
    id: String(party.id ?? row.id ?? ""),
    role: String(row.role ?? party.role ?? "developer") as ProjectPartyRole,
    organisationName: String(party.organisation_name ?? party.organisationName ?? ""),
    representativeName: optionalString(party.representative_name ?? party.representativeName),
    email: optionalString(party.email),
    phone: optionalString(party.phone),
    website: optionalString(party.website),
  };
}

export function deriveProjectSummary(snapshot: PlannerSnapshot) {
  const financials = summariseFinancials({
    units: snapshot.units,
    grvCents: parseDollarsToCents(snapshot.grv),
    mediaBudgetCents: parseDollarsToCents(snapshot.mediaBudget),
  });
  const budget = summariseBudget(snapshot.deliverables, {
    mediaBudgetCents: financials.mediaBudgetCents,
    grvCents: financials.grvCents,
  });
  const launchDate = snapshot.launchDate ? new Date(`${snapshot.launchDate}T00:00:00`) : null;
  const schedule = buildScheduleForLaunch(snapshot.deliverables, launchDate);

  return {
    financials,
    budget,
    grouped: groupByCategory(snapshot.deliverables),
    schedule,
    launchDate,
  };
}

export function developerName(parties: PublicProjectParty[]): string {
  return (
    parties.find((party) => party.role === "developer")?.organisationName ||
    "Developer not specified"
  );
}

function groupByCategory(deliverables: Deliverable[]) {
  const grouped = new Map<DeliverableCategory, Deliverable[]>();
  for (const deliverable of deliverables) {
    const current = grouped.get(deliverable.category) ?? [];
    current.push(deliverable);
    grouped.set(deliverable.category, current);
  }
  return [...grouped.entries()].map(([category, items]) => ({ category, items }));
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return String(value);
}
