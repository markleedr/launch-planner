import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

/** Persistent callout that stays until Got it / X is clicked. */
export function PersistentCoachmark({
  children,
  className,
  dismissKey,
  title,
  description,
  side = "bottom",
  align = "end",
  arrowClassName = "right-6",
}: {
  children: ReactNode;
  className?: string;
  dismissKey: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Tailwind classes positioning the caret (e.g. right-6, left-8). */
  arrowClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wasDismissed(dismissKey)) setOpen(true);
  }, [dismissKey]);

  function dismiss() {
    markDismissed(dismissKey);
    setOpen(false);
  }

  const arrowPosition =
    side === "bottom"
      ? cn(
          "absolute -top-2 size-4 rotate-45 border-l border-t border-brand/40 bg-card",
          arrowClassName,
        )
      : side === "top"
        ? cn(
            "absolute -bottom-2 size-4 rotate-45 border-r border-b border-brand/40 bg-card",
            arrowClassName,
          )
        : side === "right"
          ? cn(
              "absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 border-b border-l border-brand/40 bg-card",
              arrowClassName,
            )
          : cn(
              "absolute -right-2 top-1/2 size-4 -translate-y-1/2 rotate-45 border-r border-t border-brand/40 bg-card",
              arrowClassName,
            );

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>{children}</div>
      </PopoverAnchor>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={12}
        className="relative z-50 w-72 border-brand/40 bg-card p-4 shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        <span aria-hidden className={arrowPosition} />
      </PopoverContent>
    </Popover>
  );
}
