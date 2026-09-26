import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/planner/project-wizard";

export type NewProjectSearch = {
  sample?: "teneriffe";
};

export const Route = createFileRoute("/planner/new")({
  validateSearch: (search: Record<string, unknown>): NewProjectSearch =>
    search.sample === "teneriffe" ? { sample: "teneriffe" } : {},
  head: () => ({ meta: [{ title: "New project - Project Planner" }] }),
  component: NewProjectRoute,
});

function NewProjectRoute() {
  const { sample } = Route.useSearch();
  return <ProjectWizard sample={sample} />;
}
