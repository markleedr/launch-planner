import { useEffect, useState } from "react";
import { ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "launch-planner:tud-welcome-banner-dismissed";
const AUTO_HIDE_MS = 60_000;

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

/** Top welcome banner shown on first visit; auto-hides after 1 minute. */
export function WelcomeBanner() {
  const [visible, setVisible] = useState(() => !wasDismissed());

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      markDismissed();
      setVisible(false);
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-label="Welcome for The Urban Developer readers"
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
          The Urban Developer
        </p>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Welcome, The Urban Developer readers.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-foreground/90 sm:text-lg">
          Plan your project launch. Free to try for The Urban Developer readers, no account
          required.
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
