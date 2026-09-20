import { createFileRoute } from "@tanstack/react-router";
import { ProjectSummary } from "@/components/summary/project-summary";
import { ExportPdfButton } from "@/components/summary/export-pdf-button";
import {
  normaliseProjectPartyRow,
  type PublicProjectParty,
} from "@/components/summary/summary-model";
import { deserializePlanner } from "@/lib/planner";
import { getSharedProject } from "@/lib/procurement/sharing.server";

export const Route = createFileRoute("/share/$token")({
  loader: ({ params }) => getSharedProject({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Shared project summary - Launch Planner" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedProjectSummary,
  errorComponent: SharedSummaryError,
});

function SharedProjectSummary() {
  const data = Route.useLoaderData();
  const snapshot = deserializePlanner(data.project.snapshot);
  const parties = (data.parties as Array<Record<string, unknown>>).map(
    normaliseProjectPartyRow,
  ) as PublicProjectParty[];

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">This project summary could not be read.</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex justify-end print:hidden">
          <ExportPdfButton snapshot={snapshot} parties={parties} />
        </div>
        <ProjectSummary snapshot={snapshot} parties={parties} sharedFor={data.providerName} />
      </main>
    </div>
  );
}

function SharedSummaryError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Launch Planner
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          This shared summary is unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The link may have expired, been revoked or no longer be valid. Please ask the project
          owner for a new provider link.
        </p>
      </div>
    </main>
  );
}
