import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "launch-planner:tud-new-project-coachmark-dismissed";

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

/**
 * Persistent callout pointing at the New project control.
 * Stays open until the user dismisses it (click X or Got it).
 */
export function NewProjectCoachmark({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wasDismissed()) setOpen(true);
  }, []);

  function dismiss() {
    markDismissed();
    setOpen(false);
  }

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div className={cn("relative inline-flex", className)}>{children}</div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={12}
        className="relative w-72 border-brand/40 bg-card p-4 shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Create a new project</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start here to build your own launch plan. No login needed.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3 bg-brand text-black hover:bg-brand/90"
              onClick={dismiss}
            >
              Got it
            </Button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss tip"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Pointer toward the New project button above */}
        <span
          aria-hidden
          className="absolute -top-2 right-6 size-4 rotate-45 border-l border-t border-brand/40 bg-card"
        />
      </PopoverContent>
    </Popover>
  );
}
