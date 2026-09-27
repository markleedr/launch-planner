import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { getCapturedLeadEmail, setCapturedLeadEmail } from "@/lib/urban-developer/guest-store";
import { captureUtmFromWindow } from "@/lib/utm";

const LEAD_SOURCE = "urban-developer";
const DISMISS_KEY = "launch-planner:tud-info-toaster-dismissed";
const SHOW_AFTER_MS = 10_000;

function wasDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

/**
 * Bottom-right lead toast on the Urban Developer guest demo.
 * Appears after 10s; asks for an email to receive Launch Planner info.
 */
export function InfoLeadToaster() {
  const emailId = useId();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (wasDismissed() || getCapturedLeadEmail()) return;
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const candidate = (inputRef.current?.value ?? email).trim();
    setEmail(candidate);
    const validation = validateEmail(candidate);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setBusy(true);

    try {
      const utm = captureUtmFromWindow();
      const { error: insertError } = await supabase.from("leads").insert({
        email: candidate.toLowerCase(),
        source: LEAD_SOURCE,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content || "info-toaster",
        utm_term: utm.utm_term,
      });
      if (insertError) {
        console.error("[leads] info toaster insert failed:", insertError.message);
        throw new Error("Could not send that just now. Please try again.");
      }
      setCapturedLeadEmail(candidate.toLowerCase());
      trackEvent("tud_email_submitted", {
        source: LEAD_SOURCE,
        via: "info_toaster",
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign,
      });
      setDone(true);
      markDismissed();
      window.setTimeout(() => setVisible(false), 2200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,22rem)] print:hidden"
      role="dialog"
      aria-label="Email me info on Launch Planner"
    >
      <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-3 rounded-xl border bg-card p-4 shadow-lg duration-300">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-foreground">
              <Mail className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">Email me info on this</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Get a short overview of Launch Planner and how it works for your next launch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <p className="text-sm text-muted-foreground" role="status">
            Thanks. We&apos;ll be in touch shortly.
          </p>
        ) : (
          <form className="space-y-2" onSubmit={(e) => void submit(e)} noValidate>
            <Label htmlFor={emailId} className="sr-only">
              Work email
            </Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com.au"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={Boolean(error)}
                disabled={busy}
                className="h-9"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 shrink-0 bg-brand text-black hover:bg-brand/90"
                disabled={busy}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </Button>
            </div>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
