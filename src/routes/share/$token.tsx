import { createFileRoute } from "@tanstack/react-router";
import { ProjectSummary } from "@/components/summary/project-summary";
import { ExportPdfButton } from "@/components/summary/export-pdf-button";
import {
  normaliseProjectPartyRow,
  type PublicProjectParty,
} from "@/components/summary/summary-model";
import { SharedSummaryUnavailable } from "@/components/summary/shared-summary-unavailable";
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
  errorComponent: SharedRouteError,
});

function SharedRouteError() {
  return <SharedSummaryUnavailable />;
}

function SharedProjectSummary() {
  const data = Route.useLoaderData();
  const snapshot = deserializePlanner(data.project.snapshot);
  const parties = (data.parties as Array<Record<string, unknown>>).map(
    normaliseProjectPartyRow,
  ) as PublicProjectParty[];

  if (!snapshot) {
    return (
      <SharedSummaryUnavailable
        heading="This shared summary can't be shown"
        body="The project details for this link couldn't be read. Please ask the project owner to check the project and send a new link."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex justify-end print:hidden">
          <ExportPdfButton
            snapshot={snapshot}
            parties={parties}
            sharedFor={data.providerName}
            sharedBy={data.sharedBy}
            hideBudgets={data.hideBudgets}
          />
        </div>
        <ProjectSummary
          snapshot={snapshot}
          parties={parties}
          sharedFor={data.providerName}
          sharedBy={data.sharedBy}
          hideBudgets={data.hideBudgets}
        />
      </main>
    </div>
  );
}
