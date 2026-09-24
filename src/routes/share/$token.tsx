import { createFileRoute } from "@tanstack/react-router";
import { ProjectSummary } from "@/components/summary/project-summary";
import { ExportPdfButton } from "@/components/summary/export-pdf-button";
import {
  normaliseProjectPartyRow,
  type PublicProjectParty,
} from "@/components/summary/summary-model";
import { LetterheadFooter } from "@/components/brand";
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
      <SharedSummaryError
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
          />
        </div>
        <ProjectSummary
          snapshot={snapshot}
          parties={parties}
          sharedFor={data.providerName}
          sharedBy={data.sharedBy}
        />
      </main>
    </div>
  );
}

function SharedSummaryError({
  heading = "This shared summary is unavailable",
  body = "The link may have expired, been revoked or no longer be valid. Please ask the project owner for a new provider link.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Launch Planner
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        <div className="mt-8 w-full text-left">
          <LetterheadFooter />
        </div>
      </div>
    </main>
  );
}
