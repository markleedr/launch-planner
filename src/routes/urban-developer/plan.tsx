import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { usePlanner } from "@/components/planner/planner-provider";
import { PlannerEditor } from "@/routes/planner/index";
import { loadGuestProject } from "@/lib/urban-developer/guest-store";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/urban-developer/plan")({
  validateSearch: (s: Record<string, unknown>): { projectId?: string } =>
    typeof s.projectId === "string" && s.projectId ? { projectId: s.projectId } : {},
  head: () => ({ meta: [{ title: "Project plan - Launch Planner" }] }),
  component: GuestPlanRoute,
});

function GuestPlanRoute() {
  return (
    <>
      <GuestProjectLoader />
      <PlannerEditor />
    </>
  );
}

function GuestProjectLoader() {
  const p = usePlanner();
  const { projectId } = useSearch({ from: "/urban-developer/plan" });
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || loadedId.current === projectId) return;
    loadedId.current = projectId;
    const loaded = loadGuestProject(projectId);
    if (!loaded) return;
    p.hydrate(loaded.snapshot);
    p.setProjectName(loaded.name);
    p.setCurrentProjectId(projectId);
    trackEvent("tud_plan_generated", {
      source: "urban-developer",
      project_id: projectId,
    });
  }, [projectId, p]);

  return null;
}
