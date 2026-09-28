import type { ReactNode } from "react";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import { PersistentCoachmark } from "@/components/urban-developer/persistent-coachmark";

/** Persistent callout pointing at the example project card. */
export function ExampleProjectCoachmark({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const campaign = useGuestDemo();
  return (
    <PersistentCoachmark
      className={className ? `flex h-full w-full ${className}` : "flex h-full w-full"}
      dismissKey={`launch-planner:${campaign.id}-example-project-coachmark-dismissed`}
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
