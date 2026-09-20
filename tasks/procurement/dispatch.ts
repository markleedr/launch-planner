import { defineTask } from "nitro/task";
import { dispatchScheduledCollateralRequests } from "../../src/lib/procurement/delivery.server";
import { processProposalDeadlines } from "../../src/lib/procurement/procurement.server";

export default defineTask({
  meta: {
    name: "procurement:dispatch",
    description:
      "Close expired proposals, send deadline warnings and dispatch scheduled collateral requests.",
  },
  async run() {
    const origin = process.env.APP_ORIGIN ?? "";
    const [proposals, collateral] = await Promise.all([
      processProposalDeadlines(origin),
      dispatchScheduledCollateralRequests({ origin }),
    ]);
    return { result: { proposals, collateral } };
  },
});
