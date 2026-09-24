import { createFileRoute } from "@tanstack/react-router";
import { ContractorPortal } from "@/components/procurement/contractor-portal";

export const Route = createFileRoute("/contractor")({
  validateSearch: (s: Record<string, unknown>): { invited?: boolean } =>
    s.invited === "1" ? { invited: true } : {},
  head: () => ({ meta: [{ title: "Contractor portal - Project Planner" }] }),
  component: ContractorPortal,
});
