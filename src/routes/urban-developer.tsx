import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wordmark } from "@/components/brand";
import { ProjectSummary } from "@/components/summary/project-summary";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/analytics";
import {
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  UNIT_LABELS,
  buildUrbanDeveloperDemoSnapshot,
  serializePlanner,
  type PlannerSnapshot,
  type ProjectType,
} from "@/lib/planner";
import { captureUtmFromWindow, emptyUtm, type UtmParams } from "@/lib/utm";

const LEAD_SOURCE = "urban-developer";

export const Route = createFileRoute("/urban-developer")({
  head: () => ({
    meta: [
      {
        title: "Urban Developer reader offer - Launch Planner",
      },
      {
        name: "description",
        content:
          "Free for Urban Developer readers through November. Plan your property launch — campaign timeline, channels, budget and milestones — with no login required.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "Urban Developer reader offer - Launch Planner",
      },
      {
        property: "og:description",
        content:
          "Try Launch Planner free through November. Build a sample launch plan in minutes — no account needed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UrbanDeveloperPage,
});

function defaultLaunchDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 4);
  d.setDate(15);
  return d.toISOString().slice(0, 10);
}

function UrbanDeveloperPage() {
  const demoRef = useRef<HTMLElement | null>(null);
  const planRef = useRef<HTMLElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [utm, setUtm] = useState<UtmParams>(emptyUtm);
  const [projectType, setProjectType] = useState<ProjectType>("multi_residential");
  const [units, setUnits] = useState(40);
  const [launchDate, setLaunchDate] = useState(defaultLaunchDate);
  const [mediaBudget, setMediaBudget] = useState(80_000);
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null);
  const [demoStarted, setDemoStarted] = useState(false);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const captured = captureUtmFromWindow();
    setUtm(captured);
    trackEvent("tud_page_view", {
      source: LEAD_SOURCE,
      utm_source: captured.utm_source,
      utm_medium: captured.utm_medium,
      utm_campaign: captured.utm_campaign,
    });
  }, []);

  function scrollToDemo() {
    if (!demoStarted) {
      setDemoStarted(true);
      trackEvent("tud_demo_started", { source: LEAD_SOURCE });
    }
    demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!demoStarted) {
      setDemoStarted(true);
      trackEvent("tud_demo_started", { source: LEAD_SOURCE });
    }
    const plan = buildUrbanDeveloperDemoSnapshot({
      projectType,
      units,
      launchDate,
      mediaBudget,
    });
    setSnapshot(plan);
    setSubmitted(false);
    setEmailError(null);
    setSubmitError(null);
    trackEvent("tud_plan_generated", {
      source: LEAD_SOURCE,
      project_type: projectType,
      units,
      media_budget: mediaBudget,
    });
    requestAnimationFrame(() => {
      planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function validateEmail(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Enter a valid email address.";
    }
    return null;
  }

  function resolveEmail(): string {
    return (emailInputRef.current?.value ?? email).trim();
  }

  async function submitLead() {
    if (!snapshot) return;

    const candidate = resolveEmail();
    setEmail(candidate);

    const err = validateEmail(candidate);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);
    setSubmitError(null);
    setSubmitting(true);

    try {
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

      setSubmitted(true);
      trackEvent("tud_email_submitted", {
        source: LEAD_SOURCE,
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitLead();
  }

  const unitLabel = UNIT_LABELS[projectType];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-2">
            <Wordmark />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Urban Developer offer
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Welcome */}
      <section className="relative overflow-hidden border-b">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.92_0.08_95/_0.55),_transparent_55%),linear-gradient(180deg,_oklch(0.97_0.02_95),_var(--background))]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            The Urban Developer · Oct–Nov offer
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Welcome, Urban Developer readers.
          </h1>
          <p className="mt-4 text-lg text-foreground/80 sm:text-xl">
            Plan your project launch like a team of ten. Free for Urban Developer readers through
            November.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Launch Planner builds a campaign timeline, channels, budget and milestones for a
            property project launch — so you can scope the work before you brief agencies.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="rounded-full bg-brand px-8 text-black hover:bg-brand/90"
              onClick={scrollToDemo}
            >
              Try it now, no login
              <ArrowDown className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Demo inputs */}
      <section
        ref={demoRef}
        id="demo"
        className="scroll-mt-6 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
        aria-labelledby="demo-heading"
      >
        <div className="mb-8 max-w-2xl">
          <h2 id="demo-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Build a sample launch plan
          </h2>
          <p className="mt-2 text-muted-foreground">
            Answer a few questions. We&apos;ll generate a plan on screen — nothing is saved until
            you leave your email.
          </p>
        </div>

        <form
          onSubmit={handleGenerate}
          className="grid gap-6 rounded-2xl border bg-card p-5 sm:p-8 md:grid-cols-2"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="tud-project-type">Project type</Label>
            <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <SelectTrigger id="tud-project-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PROJECT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tud-units">{unitLabel}</Label>
            <Input
              id="tud-units"
              type="number"
              min={1}
              max={2000}
              step={1}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value) || 1)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tud-launch">Launch date</Label>
            <Input
              id="tud-launch"
              type="date"
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tud-budget">Rough marketing budget (AUD)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="tud-budget"
                type="number"
                min={5000}
                max={5_000_000}
                step={5000}
                value={mediaBudget}
                onChange={(e) => setMediaBudget(Number(e.target.value) || 0)}
                className="pl-7"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Media and campaign spend only — agency production is estimated separately in the plan.
            </p>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" size="lg" className="w-full rounded-full sm:w-auto">
              Generate my launch plan
            </Button>
          </div>
        </form>
      </section>

      {/* Plan + email capture */}
      {snapshot ? (
        <section
          ref={planRef}
          id="plan"
          className="scroll-mt-6 border-t bg-muted/30"
          aria-labelledby="plan-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="mb-8 max-w-2xl">
              <h2 id="plan-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                Your sample launch plan
              </h2>
              <p className="mt-2 text-muted-foreground">
                A starting point based on your inputs — timeline, recommended channels, deliverables
                and budget.
              </p>
            </div>

            <div className="rounded-2xl border bg-background p-4 sm:p-6">
              <ProjectSummary snapshot={snapshot} parties={[]} />
            </div>

            <div className="mx-auto mt-10 max-w-xl rounded-2xl border bg-background p-6 sm:p-8">
              {submitted ? (
                <ThankYouState email={email.trim().toLowerCase()} />
              ) : (
                <>
                  <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                    Want to keep this plan?
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Enter your email and we&apos;ll send it to you, plus free access through
                    November.
                  </p>
                  <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="tud-email">Work email</Label>
                      <Input
                        ref={emailInputRef}
                        id="tud-email"
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
                        aria-describedby={emailError ? "tud-email-error" : undefined}
                        disabled={submitting}
                      />
                      {emailError ? (
                        <p
                          id="tud-email-error"
                          className="text-sm text-destructive"
                          role="alert"
                          aria-live="polite"
                        >
                          {emailError}
                        </p>
                      ) : null}
                    </div>
                    {submitError ? (
                      <p className="text-sm text-destructive" role="alert" aria-live="polite">
                        {submitError}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-full bg-brand text-black hover:bg-brand/90"
                      disabled={submitting}
                      onClick={(e) => {
                        // Ensure click works even if form submit is swallowed.
                        e.preventDefault();
                        void submitLead();
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Send my plan & claim free access"
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll only use your email for this offer. No spam.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Launch Planner ·{" "}
          <Link to="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}

function ThankYouState({ email }: { email: string }) {
  const headingId = useId();
  return (
    <div className="text-center" role="status" aria-labelledby={headingId}>
      <CheckCircle2 className="mx-auto size-10 text-brand" aria-hidden />
      <h3 id={headingId} className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
        Thanks — you&apos;re on the list
      </h3>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        We&apos;ll email your launch plan to{" "}
        <span className="font-medium text-foreground">{email}</span> and set up free access through
        November. Keep an eye on your inbox.
      </p>
    </div>
  );
}
