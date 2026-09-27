import type { Json } from "@/integrations/supabase/types";

/**
 * Fields a project owner can leave off a provider share link. Stored on
 * `project_share_link.hidden_contact_fields`. "budget" is not a contact field,
 * but it lives in the same list so existing links do not need a new column.
 */

export const SHARE_HIDDEN_FIELDS = [
  "representativeName",
  "email",
  "phone",
  "website",
  "budget",
] as const;

export type ShareHiddenField = (typeof SHARE_HIDDEN_FIELDS)[number];

const DELIVERABLE_COST_KEYS = [
  "agencyCostCents",
  "agencyMonthlyCostCents",
  "productionCostCents",
  "mediaCostCents",
  "mediaMonthlyCostCents",
] as const;

/**
 * Remove campaign money from a stored planner snapshot before it is sent to a
 * provider. Gross realisation value stays, because that is the project's sales
 * value rather than the marketing budget. Returns a copy.
 */
export function redactSharedBudgets(data: Json): Json {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const next: { [key: string]: Json | undefined } = { ...data, mediaBudget: "" };
  if (!Array.isArray(data.deliverables)) return next;
  next.deliverables = data.deliverables.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const deliverable: { [key: string]: Json | undefined } = { ...item };
    for (const key of DELIVERABLE_COST_KEYS) {
      if (key in deliverable) deliverable[key] = 0;
    }
    return deliverable;
  });
  return next;
}
