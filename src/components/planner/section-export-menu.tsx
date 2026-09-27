import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sectionFilename, sectionToCsv, type SectionExport } from "@/lib/planner";

/** CSV or PDF download for one plan section. */
export function SectionExportMenu({ section }: { section: SectionExport }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function downloadCsv() {
    setError(null);
    const blob = new Blob([sectionToCsv(section)], { type: "text/csv;charset=utf-8" });
    saveBlob(blob, sectionFilename(section, "csv"));
  }

  async function downloadPdf() {
    setBusy(true);
    setError(null);
    try {
      const { downloadSectionPdf } = await import("./section-export-pdf");
      await downloadSectionPdf(section);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-label={`Export ${section.title}`}
            data-testid={`export-${section.id}`}
          >
            {busy ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Download className="mr-1 size-4" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={downloadCsv}>
            <FileSpreadsheet className="mr-2 size-4" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void downloadPdf()}>
            <FileText className="mr-2 size-4" />
            PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="mt-1 max-w-48 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
