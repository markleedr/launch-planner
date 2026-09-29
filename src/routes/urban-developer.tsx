import { createFileRoute } from "@tanstack/react-router";
import { GuestDemoLayout } from "@/components/guest-demo/guest-demo-layout";
import { URBAN_DEVELOPER_CAMPAIGN } from "@/lib/guest-demo/campaign";
import { retainCampaignSearch } from "@/lib/utm";

export const Route = createFileRoute("/urban-developer")({
  search: {
    middlewares: [retainCampaignSearch()],
  },
  head: () => ({
    meta: [
      { title: URBAN_DEVELOPER_CAMPAIGN.pageTitle },
      { name: "description", content: URBAN_DEVELOPER_CAMPAIGN.metaDescription },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: URBAN_DEVELOPER_CAMPAIGN.pageTitle },
      { property: "og:description", content: URBAN_DEVELOPER_CAMPAIGN.metaDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <GuestDemoLayout campaign={URBAN_DEVELOPER_CAMPAIGN} />,
});
