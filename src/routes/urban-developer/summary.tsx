import { createFileRoute } from "@tanstack/react-router";
import { GuestSummaryPage } from "@/components/guest-demo/guest-summary-page";

export const Route = createFileRoute("/urban-developer/summary")({
  head: () => ({
    meta: [{ title: "Project summary - Launch Planner" }],
  }),
  component: GuestSummaryPage,
});
