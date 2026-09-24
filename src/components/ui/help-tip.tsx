import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A small (?) affordance that opens an explanation on click/tap - unlike a
 * hover-only tooltip, this works the same way on mobile as on desktop.
 */
export function HelpTip({
  children,
  label = "More info",
  triggerClassName,
}: {
  children: ReactNode;
  label?: string;
  /** Override the trigger's colour classes, e.g. for use on a dark panel. */
  triggerClassName?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 align-middle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            triggerClassName,
          )}
        >
          <HelpCircle className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 text-xs leading-relaxed text-muted-foreground"
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
