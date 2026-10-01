import { createFileRoute } from "@tanstack/react-router";
import { GuestDemoLayout } from "@/components/guest-demo/guest-demo-layout";
import { RETARGETING_CAMPAIGN } from "@/lib/guest-demo/campaign";
import { retainCampaignSearch } from "@/lib/utm";

export const Route = createFileRoute("/start")({
  search: {
    middlewares: [retainCampaignSearch()],
  },
  head: () => ({
    meta: [
      { title: RETARGETING_CAMPAIGN.pageTitle },
      { name: "description", content: RETARGETING_CAMPAIGN.metaDescription },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: RETARGETING_CAMPAIGN.pageTitle },
      { property: "og:description", content: RETARGETING_CAMPAIGN.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <GuestDemoLayout campaign={RETARGETING_CAMPAIGN} />,
});
