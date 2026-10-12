import { z } from "zod";

/** Optional qualification answers captured alongside the email. Safe to import in the browser. */

export const LEAD_ROLES = [
  "Developer / development manager",
  "Marketing manager",
  "Project marketer or agency",
  "Sales director or agent",
  "Other",
] as const;

export const LEAD_NEXT_LAUNCHES = [
  "Within 3 months",
  "3 to 6 months",
  "6 to 12 months",
  "12+ months",
  "Not planned",
] as const;

export type LeadRole = (typeof LEAD_ROLES)[number];
export type LeadNextLaunch = (typeof LEAD_NEXT_LAUNCHES)[number];

/** Form state for the two selects. Empty string means unanswered. */
export interface QualificationValue {
  role: LeadRole | "";
  nextLaunch: LeadNextLaunch | "";
}

export const EMPTY_QUALIFICATION: QualificationValue = { role: "", nextLaunch: "" };

/** Optional select answer: blank becomes null, anything outside the allowed values is rejected. */
function optionalChoice<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .union([z.enum(values), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v ? v : null));
}

export const leadRoleField = optionalChoice(LEAD_ROLES);
export const leadNextLaunchField = optionalChoice(LEAD_NEXT_LAUNCHES);
