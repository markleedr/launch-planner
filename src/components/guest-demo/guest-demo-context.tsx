import { createContext, useContext, type ReactNode } from "react";
import { URBAN_DEVELOPER_CAMPAIGN, type GuestDemoCampaign } from "@/lib/guest-demo/campaign";

const GuestDemoContext = createContext<GuestDemoCampaign>(URBAN_DEVELOPER_CAMPAIGN);

export function GuestDemoProvider({
  campaign,
  children,
}: {
  campaign: GuestDemoCampaign;
  children: ReactNode;
}) {
  return <GuestDemoContext.Provider value={campaign}>{children}</GuestDemoContext.Provider>;
}

export function useGuestDemo(): GuestDemoCampaign {
  return useContext(GuestDemoContext);
}
