/**
 * Thin wrapper around the tracking tags loaded in `__root.tsx`.
 * Fires `dataLayer` and `gtag` for the existing Google stack, and the same
 * events as Meta custom events when the Pixel stub is present.
 */

/** Public dataset id. Override with VITE_META_PIXEL_ID; otherwise use Launch Planner's pixel. */
export const DEFAULT_META_PIXEL_ID = "974997054805397";

const PIXEL_ID_PATTERN = /^\d{5,20}$/;

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsEventName =
  | "tud_page_view"
  | "tud_demo_started"
  | "tud_plan_generated"
  | "tud_email_submitted";

interface FbqFunction {
  (...args: unknown[]): void;
  disablePushState?: boolean;
  allowDuplicatePageViews?: boolean;
}

interface AnalyticsHost {
  dataLayer?: Record<string, unknown>[];
  gtag?: (...args: unknown[]) => void;
  fbq?: FbqFunction;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
    __lpMetaPixelBooted?: boolean;
  }
}

export function resolveMetaPixelId(configured?: string | null): string {
  if (configured && PIXEL_ID_PATTERN.test(configured)) return configured;
  return DEFAULT_META_PIXEL_ID;
}

function configuredPixelId(): string {
  const env = import.meta.env as { VITE_META_PIXEL_ID?: string } | undefined;
  return resolveMetaPixelId(env?.VITE_META_PIXEL_ID);
}

export const META_PIXEL_ID = configuredPixelId();

/**
 * Standard Meta Pixel base code.
 *
 * `disablePushState` turns off the pixel's own history listener so client-side
 * navigations are tracked once, from the router, instead of twice. The pixel
 * drops a second explicit PageView unless `allowDuplicatePageViews` is set.
 * `__lpMetaPixelBooted` keeps a re-executed inline script from sending another
 * PageView on the document that already loaded.
 */
export function metaPixelBootstrapScript(pixelId = META_PIXEL_ID): string {
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
if(!window.__lpMetaPixelBooted){
window.__lpMetaPixelBooted=true;
fbq.disablePushState=true;
fbq.allowDuplicatePageViews=true;
fbq('init', '${pixelId}');
fbq('track', 'PageView');
}`;
}

export function metaPixelNoscriptSrc(pixelId = META_PIXEL_ID): string {
  return `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
}

/** First document view is sent by the base snippet. Later URL changes send one more. */
export function metaPageViewOnNavigate(
  previousHref: string | null,
  nextHref: string,
): { previousHref: string; send: boolean } {
  if (previousHref === nextHref) {
    return { previousHref: previousHref ?? nextHref, send: false };
  }
  return { previousHref: nextHref, send: previousHref !== null };
}

function compactParams(params: AnalyticsParams): Record<string, string | number | boolean> {
  const compact: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) compact[key] = value;
  }
  return compact;
}

function callFbq(
  host: AnalyticsHost,
  method: "track" | "trackCustom",
  event: string,
  params?: Record<string, string | number | boolean>,
): void {
  try {
    const fbq = host.fbq;
    if (typeof fbq !== "function") return;
    if (params && Object.keys(params).length > 0) fbq(method, event, params);
    else fbq(method, event);
  } catch {
    // Ad blockers sometimes replace fbq with a throwing stub.
  }
}

/** Send one event to dataLayer, gtag, and Meta. Safe when any of them is missing. */
export function emitAnalytics(
  host: AnalyticsHost,
  event: AnalyticsEventName,
  params: AnalyticsParams = {},
): void {
  const payload: Record<string, unknown> = { event, ...params };

  try {
    host.dataLayer = host.dataLayer || [];
    host.dataLayer.push(payload);
  } catch {
    // ignore
  }

  try {
    if (typeof host.gtag === "function") {
      host.gtag("event", event, params);
    }
  } catch {
    // ignore
  }

  callFbq(host, "trackCustom", event, compactParams(params));
}

export function trackEvent(event: AnalyticsEventName, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  emitAnalytics(window, event, params);
}

export function trackMetaPageView(): void {
  if (typeof window === "undefined") return;
  callFbq(window, "track", "PageView");
}

export function emitMetaLead(host: AnalyticsHost, params: AnalyticsParams = {}): void {
  callFbq(host, "track", "Lead", compactParams(params));
}

/** Standard Meta Lead, used when the Urban Developer email capture succeeds. */
export function trackMetaLead(params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  emitMetaLead(window, params);
}
