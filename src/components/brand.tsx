import { cn } from "@/lib/utils";

/** The Launch Planner wordmark: "launch planner" with the yellow dot. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-lg font-extrabold lowercase tracking-tight text-foreground",
        className,
      )}
    >
      launch planner
      <span className="text-brand">.</span>
    </span>
  );
}

/** Sidebar brand block: "LP" in a yellow circle beside the wordmark over two lines. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand font-display text-base font-extrabold text-brand-foreground"
      >
        LP
      </span>
      <span className="font-display text-xl font-extrabold lowercase leading-[1.05] tracking-tight">
        launch
        <br />
        planner
        <span className="text-brand">.</span>
      </span>
    </div>
  );
}

/** The "lp." monogram used in the letterhead footer. */
export function Monogram({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl font-extrabold lowercase", className)}>
      lp<span className="text-brand">.</span>
    </span>
  );
}

export function BrandTagline({ className }: { className?: string }) {
  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      from concept to completion.
    </span>
  );
}

/** Letterhead footer matching the brand PDF - dark bar with contact details.
 *  Used on the summary so the printed PDF is branded. */
export function LetterheadFooter() {
  return (
    <footer className="mt-8 rounded-lg border-t-4 border-brand bg-foreground px-6 py-5 text-white">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <Monogram className="text-white" />
        <div className="text-xs leading-relaxed text-white/90">
          Launch Planner
          <br />
          54/111 Eagle Street, Brisbane,
          <br />
          QLD 4000
        </div>
        <div className="text-xs leading-relaxed text-white/90">
          07 3132 1625
          <br />
          admin@launchplanner.com.au
          <br />
          www.launchplanner.com.au
        </div>
      </div>
    </footer>
  );
}
