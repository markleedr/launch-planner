import { createFileRoute } from "@tanstack/react-router";
import { ContractorPortal } from "@/components/procurement/contractor-portal";

export const Route = createFileRoute("/contractor")({
  head: () => ({ meta: [{ title: "Contractor portal - Project Planner" }] }),
  component: ContractorPortal,
});
