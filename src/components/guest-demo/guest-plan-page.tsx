import { useEffect, useRef } from "react";
import { usePlanner } from "@/components/planner/planner-provider";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import { PlannerEditor } from "@/routes/planner/index";
import { trackEvent } from "@/lib/analytics";
import { loadGuestProject } from "@/lib/urban-developer/guest-store";

export function GuestPlanPage({ projectId }: { projectId?: string }) {
  return (
    <>
      <GuestProjectLoader projectId={projectId} />
      <PlannerEditor />
    </>
  );
}

function GuestProjectLoader({ projectId }: { projectId?: string }) {
  const campaign = useGuestDemo();
  const p = usePlanner();
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
      source: campaign.leadSource,
      project_id: projectId,
    });
  }, [projectId, p, campaign.leadSource]);

  return null;
}
