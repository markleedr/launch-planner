import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/planner/project-wizard";

export type StartNewProjectSearch = {
  sample?: "teneriffe";
};

export const Route = createFileRoute("/start/new")({
  validateSearch: (search: Record<string, unknown>): StartNewProjectSearch =>
    search.sample === "teneriffe" ? { sample: "teneriffe" } : {},
  head: () => ({ meta: [{ title: "New project - Launch Planner" }] }),
  component: StartNewProjectRoute,
});

function StartNewProjectRoute() {
  const { sample } = Route.useSearch();
  return <ProjectWizard sample={sample} guestMode finishTo="/start/plan" />;
}
