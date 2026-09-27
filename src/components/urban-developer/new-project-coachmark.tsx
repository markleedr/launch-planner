import type { ReactNode } from "react";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import { PersistentCoachmark } from "@/components/urban-developer/persistent-coachmark";

/** Persistent callout pointing at the New project control. */
export function NewProjectCoachmark({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const campaign = useGuestDemo();
  return (
    <PersistentCoachmark
      className={className ? `inline-flex ${className}` : "inline-flex"}
      dismissKey={`launch-planner:${campaign.id}-new-project-coachmark-dismissed`}
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
