import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, X } from "lucide-react";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import { Button } from "@/components/ui/button";

const AUTO_HIDE_MS = 60_000;

function dismissKey(campaignId: string): string {
  return `launch-planner:${campaignId}-welcome-banner-dismissed`;
}

function wasDismissed(key: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markDismissed(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore
  }
}

/** Top welcome banner shown on first visit; auto-hides after 1 minute (text-only variant). */
export function WelcomeBanner() {
  const campaign = useGuestDemo();
  const key = dismissKey(campaign.id);
  const [visible, setVisible] = useState(() => !wasDismissed(key));
  const hasCover = Boolean(campaign.coverImageSrc && campaign.demoUrl);

  useEffect(() => {
    // Cover variant stays until the attendee clicks through; no auto-hide.
    if (!visible || hasCover) return;
    const timer = window.setTimeout(() => {
      markDismissed(key);
      setVisible(false);
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [visible, key, hasCover]);

  function dismiss() {
    markDismissed(key);
    setVisible(false);
  }

  if (!visible) return null;

  if (hasCover) {
    const demoUrl = campaign.demoUrl!;
    const coverSrc = campaign.coverImageSrc!;
    const coverAlt = campaign.coverImageAlt || "Launch Planner";
    const ctaLabel = campaign.ctaLabel || "Open Launch Planner";

    return (
      <section
        aria-label={campaign.bannerHeading}
        className="relative border-b print:hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 40%, hsl(40 33% 96%) 0%, hsl(40 20% 94%) 55%, hsl(40 16% 92%) 100%)",
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4 sm:top-4"
          aria-label="Dismiss welcome banner"
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-10 text-center sm:py-12">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {campaign.bannerEyebrow}
          </p>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {campaign.bannerHeading}
          </h1>
          {campaign.webinarReferenceCopy ? (
            <p className="mt-4 max-w-2xl text-pretty text-base text-foreground/90 sm:text-lg">
              {campaign.webinarReferenceCopy}
            </p>
          ) : (
            <p className="mt-4 max-w-xl text-pretty text-base text-foreground/90 sm:text-lg">
              {campaign.bannerSubhead}
            </p>
          )}

          <a
            href={demoUrl}
            onClick={(event) => {
              // Already on the demo URL: enter the workspace without a full reload.
              if (
                typeof window !== "undefined" &&
                window.location.pathname.replace(/\/$/, "") ===
                  new URL(demoUrl, window.location.origin).pathname.replace(/\/$/, "")
              ) {
                event.preventDefault();
                dismiss();
              }
            }}
            className="group mt-8 block w-full max-w-2xl overflow-hidden rounded-lg border border-black/10 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${ctaLabel}: ${coverAlt}`}
          >
            <img
              src={coverSrc}
              alt={coverAlt}
              width={1540}
              height={1031}
              className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.01]"
              loading="eager"
              decoding="async"
            />
          </a>

          <div className="mt-6 flex w-full max-w-2xl flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Button asChild size="lg" className="bg-brand text-black hover:bg-brand/90">
              <a
                href={demoUrl}
                onClick={(event) => {
                  if (
                    typeof window !== "undefined" &&
                    window.location.pathname.replace(/\/$/, "") ===
                      new URL(demoUrl, window.location.origin).pathname.replace(/\/$/, "")
                  ) {
                    event.preventDefault();
                    dismiss();
                  }
                }}
              >
                {ctaLabel}
                <ArrowRight className="ml-1.5 size-4" aria-hidden />
              </a>
            </Button>
            {campaign.freeAccessNote ? (
              <p className="max-w-sm text-pretty text-sm text-muted-foreground sm:text-left">
                {campaign.freeAccessNote}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={campaign.bannerHeading}
      className="relative border-b print:hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 40%, hsl(40 33% 96%) 0%, hsl(40 20% 94%) 55%, hsl(40 16% 92%) 100%)",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4 sm:top-4"
        aria-label="Dismiss welcome banner"
      >
        <X className="size-4" />
      </button>

      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-10 text-center sm:py-12">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {campaign.bannerEyebrow}
        </p>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {campaign.bannerHeading}
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-foreground/90 sm:text-lg">
          {campaign.bannerSubhead}
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-7 bg-brand text-black hover:bg-brand/90"
          onClick={dismiss}
        >
          Try it now, no login
          <ArrowDown className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
