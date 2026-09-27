import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { trackEvent, trackMetaLead } from "@/lib/analytics";
import { serializePlanner, type PlannerSnapshot } from "@/lib/planner";
import { getCapturedLeadEmail, setCapturedLeadEmail } from "@/lib/urban-developer/guest-store";
import { captureUtmFromWindow } from "@/lib/utm";

const LEAD_SOURCE = "urban-developer";

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

/** Export PDF, prompting for email once if the guest has not claimed access yet. */
export function GatedExportPdfButton({ snapshot }: { snapshot: PlannerSnapshot }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(() => getCapturedLeadEmail() ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function downloadPdf() {
    setBusy(true);
    setExportError(null);
    try {
      const { downloadProjectSummaryPdf } =
        await import("@/components/summary/project-summary-pdf");
      await downloadProjectSummaryPdf(snapshot, []);
    } catch (reason) {
      setExportError(reason instanceof Error ? reason.message : "Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function captureAndDownload() {
    const candidate = (inputRef.current?.value ?? email).trim();
    setEmail(candidate);
    const err = validateEmail(candidate);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    setSubmitError(null);
    setBusy(true);

    try {
      const utm = captureUtmFromWindow();
      const { error } = await supabase.from("leads").insert({
        email: candidate.toLowerCase(),
        source: LEAD_SOURCE,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
        plan_snapshot: serializePlanner(snapshot) as Json,
      });
      if (error) {
        console.error("[leads] insert failed:", error.message);
        throw new Error("We couldn't save your email just now. Please try again.");
      }
      setCapturedLeadEmail(candidate.toLowerCase());
      trackEvent("tud_email_submitted", {
        source: LEAD_SOURCE,
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign,
      });
      trackMetaLead({
        content_name: LEAD_SOURCE,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
      });
      setOpen(false);
      await downloadPdf();
    } catch (caught) {
      setSubmitError(
        caught instanceof Error ? caught.message : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  function handleExportClick() {
    setExportError(null);
    if (getCapturedLeadEmail()) {
      void downloadPdf();
      return;
    }
    setOpen(true);
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={busy} onClick={handleExportClick}>
        {busy ? (
          <Loader2 className="mr-1 size-4 animate-spin" />
        ) : (
          <Download className="mr-1 size-4" />
        )}
        Export A4 PDF
      </Button>
      {exportError ? <p className="mt-1 max-w-64 text-xs text-destructive">{exportError}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your email to export</DialogTitle>
            <DialogDescription>
              We&apos;ll send your plan and set up free access through November. No login needed.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void captureAndDownload();
            }}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="tud-export-email">Work email</Label>
              <Input
                ref={inputRef}
                id="tud-export-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com.au"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                aria-invalid={Boolean(emailError)}
                disabled={busy}
              />
              {emailError ? (
                <p className="text-sm text-destructive" role="alert">
                  {emailError}
                </p>
              ) : null}
              {submitError ? (
                <p className="text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand text-black hover:bg-brand/90"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Export PDF"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
