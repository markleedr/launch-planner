import { createFileRoute } from "@tanstack/react-router";
import { GuestPlanPage } from "@/components/guest-demo/guest-plan-page";

export const Route = createFileRoute("/start/plan")({
  validateSearch: (s: Record<string, unknown>): { projectId?: string } =>
    typeof s.projectId === "string" && s.projectId ? { projectId: s.projectId } : {},
  head: () => ({ meta: [{ title: "Project plan - Launch Planner" }] }),
  component: StartPlanRoute,
});

function StartPlanRoute() {
  const { projectId } = Route.useSearch();
  return <GuestPlanPage projectId={projectId} />;
}
