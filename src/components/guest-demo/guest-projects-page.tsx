import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import { ExampleProjectCoachmark } from "@/components/urban-developer/example-project-coachmark";
import { GuestProjectCard } from "@/components/urban-developer/guest-project-card";
import { NewProjectCoachmark } from "@/components/urban-developer/new-project-coachmark";
import { trackEvent } from "@/lib/analytics";
import { guestPath, type GuestDemoBasePath } from "@/lib/guest-demo/campaign";
import {
  EXAMPLE_TENERIFFE_ID,
  listGuestDashboardProjects,
} from "@/lib/urban-developer/guest-store";
import type { ProjectRow } from "@/lib/project-store";

/** Shared projects dashboard for guest campaign demos. */
export function GuestProjectsPage() {
  const campaign = useGuestDemo();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const newTo = guestPath(campaign.basePath, "/new") as `${GuestDemoBasePath}/new`;

  useEffect(() => {
    setRows(listGuestDashboardProjects());
    trackEvent("tud_demo_started", { source: campaign.leadSource });
  }, [campaign.leadSource]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">My projects</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{campaign.workspaceBlurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to={newTo} search={{ sample: "teneriffe" }}>
              <Building2 className="mr-1 size-4" />
              Beachside sample
            </Link>
          </Button>
          <NewProjectCoachmark>
            <Button asChild>
              <Link to={newTo}>
                <Plus className="mr-1 size-4" />
                New project
              </Link>
            </Button>
          </NewProjectCoachmark>
        </div>
      </div>

      <section aria-label="Projects">
        <p className="mb-4 text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "project" : "projects"}
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const card = <GuestProjectCard project={row} />;
            return (
              <li key={row.id} className="flex">
                {row.id === EXAMPLE_TENERIFFE_ID ? (
                  <ExampleProjectCoachmark>{card}</ExampleProjectCoachmark>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
