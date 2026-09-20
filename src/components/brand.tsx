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
