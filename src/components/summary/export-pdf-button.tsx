import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerSnapshot } from "@/lib/planner";
import type { PublicProjectParty } from "./summary-model";

export function ExportPdfButton({
  snapshot,
  parties,
  sharedFor,
  sharedBy,
}: {
  snapshot: PlannerSnapshot;
  parties: PublicProjectParty[];
  sharedFor?: string;
  sharedBy?: { fullName: string | null; organisationName: string | null } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const { downloadProjectSummaryPdf } = await import("./project-summary-pdf");
      await downloadProjectSummaryPdf(snapshot, parties, sharedFor, sharedBy);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void exportPdf()}>
        {busy ? (
          <Loader2 className="mr-1 size-4 animate-spin" />
        ) : (
          <Download className="mr-1 size-4" />
        )}
        Export A4 PDF
      </Button>
      {error ? <p className="mt-1 max-w-64 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
