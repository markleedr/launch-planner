import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhook } from "@/lib/billing/stripe-webhook.server";

/**
 * Stripe delivers every event on the shared account, including Content Proof.
 * Signature verification stays here; events for other products, and customers
 * Launch Planner does not know, are acknowledged and skipped.
 */
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handleStripeWebhook(request),
    },
  },
});
