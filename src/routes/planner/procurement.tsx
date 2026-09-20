import { createFileRoute } from "@tanstack/react-router";
import { OwnerProcurement } from "@/components/procurement/owner-procurement";

export const Route = createFileRoute("/planner/procurement")({
  head: () => ({ meta: [{ title: "Procurement - Project Planner" }] }),
  component: OwnerProcurement,
});
