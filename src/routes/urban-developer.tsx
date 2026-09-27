import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Save } from "lucide-react";
import { PlannerProvider, usePlanner } from "@/components/planner/planner-provider";
import { GuestShell } from "@/components/urban-developer/guest-shell";
import { InfoLeadToaster } from "@/components/urban-developer/info-lead-toaster";
import { WelcomeBanner } from "@/components/urban-developer/welcome-banner";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { serializePlanner } from "@/lib/planner";
import {
  EXAMPLE_TENERIFFE_ID,
  createGuestProjectId,
  saveGuestProject,
} from "@/lib/urban-developer/guest-store";
import { captureUtmFromWindow } from "@/lib/utm";

export const Route = createFileRoute("/urban-developer")({
  head: () => ({
    meta: [
      {
        title: "for The Urban Developer readers. - Launch Planner",
      },
      {
        name: "description",
        content:
          "Free for The Urban Developer readers, no account required. Try Launch Planner: open an example project or create your own. Email only required to export a PDF.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "for The Urban Developer readers. - Launch Planner",
      },
      {
        property: "og:description",
        content:
          "Free for The Urban Developer readers, no account required. Create a project or view an example.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UrbanDeveloperLayout,
});

function UrbanDeveloperLayout() {
  useEffect(() => {
    const utm = captureUtmFromWindow();
    trackEvent("tud_page_view", {
      source: "urban-developer",
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    });
  }, []);

  return (
    <PlannerProvider>
      <WelcomeBanner />
      <UrbanDeveloperShell />
      <InfoLeadToaster />
    </PlannerProvider>
  );
}
function UrbanDeveloperShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const p = usePlanner();
  const isProjects = pathname === "/urban-developer" || pathname === "/urban-developer/";
  const isWizard = pathname === "/urban-developer/new";
  const active =
    pathname === "/urban-developer/summary"
      ? "summary"
      : isProjects || isWizard
        ? "projects"
        : "plan";

  return (
    <GuestShell
      active={active}
      title={isProjects ? "My projects" : p.projectName || "Project planner"}
      projectNavigation={!isProjects && !isWizard}
      headerActions={isProjects || isWizard ? undefined : <GuestSaveButton />}
    >
      <Outlet />
    </GuestShell>
  );
}

function GuestSaveButton() {
  const p = usePlanner();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const serialized = JSON.stringify(serializePlanner(p.toSnapshot()));
  const lastSaved = useRef<string | null>(null);

  const doSave = useCallback(() => {
    setStatus("saving");
    try {
      const name = p.projectName.trim() || "Untitled project";
      // Editing the built-in example creates a personal copy in this browser.
      const id =
        !p.currentProjectId || p.currentProjectId === EXAMPLE_TENERIFFE_ID
          ? createGuestProjectId()
          : p.currentProjectId;
      saveGuestProject(id, name, p.toSnapshot());
      p.setCurrentProjectId(id);
      lastSaved.current = JSON.stringify(serializePlanner(p.toSnapshot()));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [p]);

  useEffect(() => {
    if (lastSaved.current === null) {
      lastSaved.current = serialized;
      return;
    }
    if (serialized === lastSaved.current) return;
    const t = setTimeout(() => doSave(), 1500);
    return () => clearTimeout(t);
  }, [serialized, doSave]);

  if (p.currentProjectId && p.currentProjectId !== EXAMPLE_TENERIFFE_ID) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {status === "saving" ? (
          "Saving…"
        ) : status === "error" ? (
          <button type="button" className="text-destructive hover:underline" onClick={doSave}>
            Save failed - retry
          </button>
        ) : (
          <>
            <Check className="size-3.5" />
            Saved in this browser
          </>
        )}
      </span>
    );
  }

  return (
    <Button size="sm" onClick={doSave} disabled={status === "saving"}>
      <Save className="mr-1 size-4" />
      {status === "saving" ? "Saving…" : "Keep a copy"}
    </Button>
  );
}
