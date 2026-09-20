import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ProjectSummary } from "@/components/summary/project-summary";
import { ExportPdfButton } from "@/components/summary/export-pdf-button";
import { ShareManager } from "@/components/summary/share-manager";
import {
  normaliseProjectPartyRow,
  type PublicProjectParty,
} from "@/components/summary/summary-model";
import { usePlanner } from "@/components/planner/planner-provider";
import { listProjectParties } from "@/lib/procurement/procurement-store";

export const Route = createFileRoute("/planner/summary")({
  head: () => ({
    meta: [{ title: "Project summary - Project Planner" }],
  }),
  component: PlannerSummary,
});

function PlannerSummary() {
  const planner = usePlanner();
  const snapshot = useMemo(() => planner.toSnapshot(), [planner]);
  const [parties, setParties] = useState<PublicProjectParty[]>([]);

  useEffect(() => {
    if (!planner.currentProjectId) {
      setParties([]);
      return;
    }
    let active = true;
    listProjectParties(planner.currentProjectId)
      .then((rows) => {
        if (active) {
          setParties((rows as Array<Record<string, unknown>>).map(normaliseProjectPartyRow));
        }
      })
      .catch(() => {
        if (active) setParties([]);
      });
    return () => {
      active = false;
    };
  }, [planner.currentProjectId]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <ExportPdfButton snapshot={snapshot} parties={parties} />
        <ShareManager projectId={planner.currentProjectId} />
      </div>
      <ProjectSummary snapshot={snapshot} parties={parties} />
    </main>
  );
}
