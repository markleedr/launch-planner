import { createFileRoute } from "@tanstack/react-router";
import { GuestDemoLayout } from "@/components/guest-demo/guest-demo-layout";
import { WEBINAR_23_SEPT_CAMPAIGN } from "@/lib/guest-demo/campaign";

export const Route = createFileRoute("/webinar-23-sept")({
  head: () => ({
    meta: [
      { title: WEBINAR_23_SEPT_CAMPAIGN.pageTitle },
      { name: "description", content: WEBINAR_23_SEPT_CAMPAIGN.metaDescription },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: WEBINAR_23_SEPT_CAMPAIGN.pageTitle },
      { property: "og:description", content: WEBINAR_23_SEPT_CAMPAIGN.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <GuestDemoLayout campaign={WEBINAR_23_SEPT_CAMPAIGN} />,
});
