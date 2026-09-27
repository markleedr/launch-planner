import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestProjectCard } from "@/components/urban-developer/guest-project-card";
import { trackEvent } from "@/lib/analytics";
import { listGuestDashboardProjects } from "@/lib/urban-developer/guest-store";
import type { ProjectRow } from "@/lib/project-store";

export const Route = createFileRoute("/urban-developer/")({
  head: () => ({
    meta: [{ title: "My projects - Launch Planner" }],
  }),
  component: GuestProjectsPage,
});

function GuestProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);

  useEffect(() => {
    setRows(listGuestDashboardProjects());
    trackEvent("tud_demo_started", { source: "urban-developer" });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">My projects</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Free to try for The Urban Developer readers, no account required. Open the example
            project or start your own. Email only if you want to export a PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/urban-developer/new" search={{ sample: "teneriffe" }}>
              <Building2 className="mr-1 size-4" />
              Beachside sample
            </Link>
          </Button>
          <Button asChild>
            <Link to="/urban-developer/new">
              <Plus className="mr-1 size-4" />
              New project
            </Link>
          </Button>
        </div>
      </div>

      <section aria-label="Projects">
        <p className="mb-4 text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "project" : "projects"}
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id} className="flex">
              <GuestProjectCard project={row} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
