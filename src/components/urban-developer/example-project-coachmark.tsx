import type { ReactNode } from "react";
import { PersistentCoachmark } from "@/components/urban-developer/persistent-coachmark";

const DISMISS_KEY = "launch-planner:tud-example-project-coachmark-dismissed";

/** Persistent callout pointing at the example project card. */
export function ExampleProjectCoachmark({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PersistentCoachmark
      className={className ? `flex h-full w-full ${className}` : "flex h-full w-full"}
      dismissKey={DISMISS_KEY}
      title="Explore an example project"
      description="Open this sample to see a full launch plan with budget, schedule and deliverables."
      side="bottom"
      align="start"
      arrowClassName="left-8"
    >
      {children}
    </PersistentCoachmark>
  );
}
