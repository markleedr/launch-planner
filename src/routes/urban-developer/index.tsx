import { createFileRoute } from "@tanstack/react-router";
import { GuestProjectsPage } from "@/components/guest-demo/guest-projects-page";

export const Route = createFileRoute("/urban-developer/")({
  head: () => ({
    meta: [{ title: "My projects - Launch Planner" }],
  }),
  component: GuestProjectsPage,
});
