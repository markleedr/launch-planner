import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/planner/project-wizard";

export const Route = createFileRoute("/planner/new")({
  head: () => ({ meta: [{ title: "New project - Project Planner" }] }),
  component: ProjectWizard,
});
