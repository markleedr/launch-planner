/**
 * Thin wrapper around the GTM/gtag stack already loaded in `__root.tsx`.
 * Fires both `dataLayer` and `gtag` when available so GTM triggers and GA4
 * both see the event.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEventName =
  | "tud_page_view"
  | "tud_demo_started"
  | "tud_plan_generated"
  | "tud_email_submitted";

export function trackEvent(
  event: AnalyticsEventName,
  params: Record<string, string | number | boolean | null | undefined> = {},
): void {
  if (typeof window === "undefined") return;

  const payload: Record<string, unknown> = { event, ...params };

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {
    // ignore
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, params);
    }
  } catch {
    // ignore
  }
}
