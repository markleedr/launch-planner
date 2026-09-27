import type { ReactNode } from "react";
import { PersistentCoachmark } from "@/components/urban-developer/persistent-coachmark";

const DISMISS_KEY = "launch-planner:tud-new-project-coachmark-dismissed";

/** Persistent callout pointing at the New project control. */
export function NewProjectCoachmark({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PersistentCoachmark
      className={className ? `inline-flex ${className}` : "inline-flex"}
      dismissKey={DISMISS_KEY}
      title="Create a new project"
      description="Start here to build your own launch plan. No login needed."
      side="bottom"
      align="end"
      arrowClassName="right-6"
    >
      {children}
    </PersistentCoachmark>
  );
}
