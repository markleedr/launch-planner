import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/planner/project-wizard";

export type WebinarNewProjectSearch = {
  sample?: "teneriffe";
};

export const Route = createFileRoute("/webinar-23-sept/new")({
  validateSearch: (search: Record<string, unknown>): WebinarNewProjectSearch =>
    search.sample === "teneriffe" ? { sample: "teneriffe" } : {},
  head: () => ({ meta: [{ title: "New project - Launch Planner" }] }),
  component: WebinarNewProjectRoute,
});

function WebinarNewProjectRoute() {
  const { sample } = Route.useSearch();
  return <ProjectWizard sample={sample} guestMode finishTo="/webinar-23-sept/plan" />;
}
