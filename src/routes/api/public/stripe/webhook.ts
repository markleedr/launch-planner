import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { persistStripeSubscription, provisionCheckoutAccount } from "@/lib/billing/billing.server";
import {
  getStripe,
  getStripeCryptoProvider,
  getStripeWebhookSecret,
} from "@/lib/billing/stripe.server";

/** Subscription lifecycle events carry the Subscription object directly. */
const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/** These events reference a subscription by id and need a retrieve first. */
const REFERENCE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

function referencedSubscriptionId(event: Stripe.Event): string | null {
  const object = event.data.object as unknown as Record<string, unknown>;
  const value = object.subscription ?? object.parent;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const nested = value as {
      id?: string;
      subscription_details?: { subscription?: string | { id?: string } };
    };
    if (typeof nested.id === "string") return nested.id;
    const detail = nested.subscription_details?.subscription;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail.id === "string") return detail.id;
  }
  return null;
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
        }

        let event: Stripe.Event;
        try {
          const rawBody = await request.text();
          event = await getStripe().webhooks.constructEventAsync(
            rawBody,
            signature,
            getStripeWebhookSecret(),
            undefined,
            getStripeCryptoProvider(),
          );
        } catch (error) {
          console.error("[Stripe webhook] Verification failed.", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
          return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
        }

        try {
          if (event.type === "checkout.session.completed") {
            await provisionCheckoutAccount(event.data.object as Stripe.Checkout.Session);
          }
          if (SUBSCRIPTION_EVENTS.has(event.type)) {
            await persistStripeSubscription(event.data.object as Stripe.Subscription);
          } else if (REFERENCE_EVENTS.has(event.type)) {
            const subscriptionId = referencedSubscriptionId(event);
            if (subscriptionId) {
              const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
              await persistStripeSubscription(subscription);
            }
          }
        } catch (error) {
          console.error("[Stripe webhook] Subscription sync failed.", {
            eventId: event.id,
            eventType: event.type,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          // 500 makes Stripe retry with backoff instead of dropping the update.
          return Response.json({ error: "Could not sync subscription." }, { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
