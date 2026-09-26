/**
 * Project Planner core - pure, framework-agnostic domain logic.
 * Import from `@/lib/planner` rather than reaching into individual modules.
 */

export * from "./types";
export * from "./money";
export * from "./dates";
export * from "./grv";
export * from "./labels";
export * from "./deliverable-catalog";
export * from "./recommendation-data";
export * from "./recommend";
export * from "./persistence";
export * from "./budget";
export * from "./recurrence";
export * from "./cpm";
export * from "./schedule";
export * from "./checklist";
export * from "./contacts";
export * from "./media-calc";
export * from "./project-copy";
export * from "./hero-images";
export {
  buildTeneriffeRiversideSnapshot,
  TENERIFFE_CAMPAIGN_MONTHS,
  TENERIFFE_CATALOG_IDS,
  TENERIFFE_GRV_DOLLARS,
  TENERIFFE_MEDIA_BUDGET_DOLLARS,
} from "./demos/teneriffe-riverside";
