import { createFileRoute } from "@tanstack/react-router";
import { GuestSummaryPage } from "@/components/guest-demo/guest-summary-page";

export const Route = createFileRoute("/webinar-23-sept/summary")({
  head: () => ({
    meta: [{ title: "Project summary - Launch Planner" }],
  }),
  component: GuestSummaryPage,
});
