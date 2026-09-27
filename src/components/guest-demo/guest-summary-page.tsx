import { useMemo } from "react";
import { ProjectSummary } from "@/components/summary/project-summary";
import { GatedExportPdfButton } from "@/components/urban-developer/gated-export-pdf";
import { usePlanner } from "@/components/planner/planner-provider";

export function GuestSummaryPage() {
  const planner = usePlanner();
  const snapshot = useMemo(() => planner.toSnapshot(), [planner]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">
          Export needs an email so we can send the plan and grant free access.
        </p>
        <GatedExportPdfButton snapshot={snapshot} />
      </div>
      <ProjectSummary snapshot={snapshot} parties={[]} />
    </main>
  );
}
