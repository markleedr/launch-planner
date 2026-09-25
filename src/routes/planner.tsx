import { createFileRoute, Link, Outlet, useRouterState, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { PlannerProvider, usePlanner } from "@/components/planner/planner-provider";
import { RequireSubscription } from "@/components/billing/require-subscription";
import { useSession } from "@/hooks/use-session";
import { createProject, loadProject, updateProject } from "@/lib/project-store";
import { serializePlanner } from "@/lib/planner";

export const Route = createFileRoute("/planner")({
  validateSearch: (s: Record<string, unknown>): { projectId?: string } =>
    typeof s.projectId === "string" && s.projectId ? { projectId: s.projectId } : {},
  component: PlannerLayout,
});

function PlannerLayout() {
  return (
    <RequireSubscription>
      <PlannerProvider>
        <PlannerLayoutInner />
      </PlannerProvider>
    </RequireSubscription>
  );
}

function PlannerLayoutInner() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const p = usePlanner();
  const isWizard = pathname === "/planner/new";
  const active = pathname === "/planner/summary" ? "summary" : "plan";

  return (
    <>
      <ProjectLoader />
      <AppShell
        active={active}
        title={p.projectName || "Project planner"}
        projectId={p.currentProjectId}
        projectNavigation
        // The New project wizard shows its own save status per step, so the
        // header's silent auto-save would otherwise show a second, conflicting
        // indicator (and double-save) at the same time.
        headerActions={isWizard ? undefined : <SaveButton />}
      >
        <Outlet />
      </AppShell>
    </>
  );
}

/** Loads a saved project into state when `?projectId=` is present. */
function ProjectLoader() {
  const p = usePlanner();
  const { projectId } = useSearch({ from: "/planner" });
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || loadedId.current === projectId) return;
    loadedId.current = projectId;
    loadProject(projectId)
      .then((res) => {
        if (!res) return;
        p.hydrate(res.snapshot);
        p.setProjectName(res.name);
        p.setCurrentProjectId(projectId);
      })
      .catch(() => {
        // Swallow load errors; a fresh project is shown instead.
      });
  }, [projectId, p]);

  return null;
}

function SaveButton() {
  const p = usePlanner();
  const { user, loading } = useSession();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Serialized snapshot - changes whenever any planner state changes.
  const serialized = JSON.stringify(serializePlanner(p.toSnapshot()));
  const lastSaved = useRef<string | null>(null);

  const doSave = useCallback(
    async (create: boolean) => {
      setStatus("saving");
      try {
        if (p.currentProjectId) {
          await updateProject(p.currentProjectId, p.projectName, p.toSnapshot());
        } else if (create) {
          const id = await createProject(p.projectName, p.toSnapshot());
          p.setCurrentProjectId(id);
        }
        lastSaved.current = JSON.stringify(serializePlanner(p.toSnapshot()));
        setStatus("saved");
      } catch (reason) {
        setErrorMessage(reason instanceof Error ? reason.message : "Unknown error.");
        setStatus("error");
      }
    },
    [p],
  );

  // Auto-save: once a project has an id and the user is signed in, persist
  // changes ~1.5s after they stop.
  useEffect(() => {
    if (!user || !p.currentProjectId) return;
    if (lastSaved.current === null) {
      lastSaved.current = serialized; // baseline on first mount / after load
      return;
    }
    if (serialized === lastSaved.current) return;
    const t = setTimeout(() => void doSave(false), 1500);
    return () => clearTimeout(t);
  }, [serialized, user, p.currentProjectId, doSave]);

  // Warn before closing the tab in the brief window before auto-save catches up.
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (lastSaved.current !== null && serialized !== lastSaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [serialized]);

  if (loading) return null;

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/login">Sign in to save</Link>
      </Button>
    );
  }

  // Once saved, show a quiet auto-save status instead of a manual button.
  if (p.currentProjectId) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {status === "saving" ? (
          "Saving…"
        ) : status === "error" ? (
          <span className="flex items-center gap-1">
            <button
              className="rounded-sm text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void doSave(false)}
            >
              Save failed - retry
            </button>
            {errorMessage && (
              <HelpTip
                label="Why did saving fail?"
                triggerClassName="text-destructive/70 hover:text-destructive"
              >
                {errorMessage}
              </HelpTip>
            )}
          </span>
        ) : (
          <>
            <Check className="size-3.5" />
            All changes saved
          </>
        )}
      </span>
    );
  }

  return (
    <Button size="sm" onClick={() => void doSave(true)} disabled={status === "saving"}>
      <Save className="mr-1 size-4" />
      {status === "saving" ? "Saving…" : "Save"}
    </Button>
  );
}
