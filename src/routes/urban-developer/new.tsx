import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/planner/project-wizard";

export type GuestNewProjectSearch = {
  sample?: "teneriffe";
};

export const Route = createFileRoute("/urban-developer/new")({
  validateSearch: (search: Record<string, unknown>): GuestNewProjectSearch =>
    search.sample === "teneriffe" ? { sample: "teneriffe" } : {},
  head: () => ({ meta: [{ title: "New project - Launch Planner" }] }),
  component: GuestNewProjectRoute,
});

function GuestNewProjectRoute() {
  const { sample } = Route.useSearch();
  return <ProjectWizard sample={sample} guestMode finishTo="/urban-developer/plan" />;
}
