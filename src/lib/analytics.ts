/**
 * Thin wrapper around the tracking tags loaded in `__root.tsx`.
 * Fires `dataLayer` and `gtag` for the existing Google stack, the same
 * events as Meta custom events when the Pixel stub is present, and the
 * same events to PostHog without email addresses.
 *
 * Google payloads drop empty values, email addresses, and name or phone
 * keys so a blocked or curious tag cannot receive lead PII.
 */

import { capturePosthogEvent, posthogEventProperties } from "./posthog";
import { captureUtmFromWindow } from "./utm";

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

/** GA4 event-parameter values are limited to 100 characters. */
const GA_PARAM_MAX = 100;

const EXACT_EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const EMBEDDED_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const GA_PII_KEYS = new Set([
  "email",
  "e-mail",
  "name",
  "full_name",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "phone",
  "phone_number",
]);

function redactGoogleString(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || EXACT_EMAIL.test(trimmed)) return undefined;
  const redacted = trimmed.replace(EMBEDDED_EMAIL, "[redacted]");
  return redacted ? redacted.slice(0, GA_PARAM_MAX) : undefined;
}

/** Params safe to put on `dataLayer` and `gtag`. Omits PII and empty values. */
export function gaSafeParams(params: AnalyticsParams): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (GA_PII_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string") {
      const redacted = redactGoogleString(value);
      if (redacted !== undefined) safe[key] = redacted;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
  }
  return safe;
}

/** Page path only. Query strings can carry an email or the campaign UTMs. */
export function formLocationPath(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return "/";
  try {
    const raw = trimmed.startsWith("/") ? trimmed : new URL(trimmed).pathname;
    const pathname = raw.split(/[?#]/)[0] || "/";
    if (!pathname.startsWith("/") || EXACT_EMAIL.test(pathname)) return "/";
    return pathname.slice(0, GA_PARAM_MAX);
  } catch {
    return "/";
  }
}

export type LeadFormType = "toast" | "pdf_download";

export interface SavedLeadInput {
  formType: LeadFormType;
  /** Campaign id stored on the lead, e.g. urban-developer. Not a person's name. */
  source: string;
  /** `window.location.pathname`, or a full URL that will be reduced to a path. */
  formLocation: string;
  campaignSource?: string | null;
  campaignName?: string | null;
}

const LEAD_VIA: Record<LeadFormType, "info_toaster" | "pdf_export"> = {
  toast: "info_toaster",
  pdf_download: "pdf_export",
};

function optionalCampaignValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return redactGoogleString(value);
}

/**
 * Shared GA4 parameters for a saved lead.
 * `via` is the legacy capture-point name already used by PostHog.
 * `form_type` is the path discriminator to register in GA4.
 */
export function savedLeadParams(input: SavedLeadInput): Record<string, string> {
  const params: Record<string, string> = {
    form_type: input.formType,
    form_location: formLocationPath(input.formLocation),
    via: LEAD_VIA[input.formType],
  };
  const source = optionalCampaignValue(input.source);
  if (source) params.source = source;
  const campaignSource = optionalCampaignValue(input.campaignSource);
  if (campaignSource) {
    params.campaign_source = campaignSource;
    params.utm_source = campaignSource;
  }
  const campaignName = optionalCampaignValue(input.campaignName);
  if (campaignName) {
    params.campaign_name = campaignName;
    params.utm_campaign = campaignName;
  }
  return params;
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

function pushGoogleEvent(host: AnalyticsHost, event: string, params: AnalyticsParams): void {
  const googleParams = gaSafeParams(params);
  const payload: Record<string, unknown> = { event, ...googleParams };

  try {
    host.dataLayer = host.dataLayer || [];
    host.dataLayer.push(payload);
  } catch {
    // ignore
  }

  try {
    if (typeof host.gtag === "function") {
      host.gtag("event", event, googleParams);
    }
  } catch {
    // Ad blockers sometimes replace gtag with a throwing stub.
  }
}

/** Send one event to dataLayer, gtag, Meta, and PostHog. Safe when any of them is missing. */
export function emitAnalytics(
  host: AnalyticsHost,
  event: AnalyticsEventName,
  params: AnalyticsParams = {},
): void {
  const googleParams = gaSafeParams(params);
  pushGoogleEvent(host, event, googleParams);

  callFbq(host, "trackCustom", event, googleParams);

  try {
    capturePosthogEvent(event, posthogEventProperties(googleParams, captureUtmFromWindow()));
  } catch {
    // PostHog missing, blocked, or throwing must not break the other tags.
  }
}

/** `dataLayer` and `gtag` only. Does not notify Meta or PostHog. Never throws. */
export function emitGoogleEvent(
  host: AnalyticsHost,
  event: string,
  params: AnalyticsParams = {},
): void {
  pushGoogleEvent(host, event, params);
}

/**
 * GA4 events for a lead that has already been saved.
 *
 * `tud_email_submitted` is the shared event for both paths (also forwarded to
 * Meta as a custom event and to PostHog). `generate_lead` is GA4's recommended
 * lead event, Google tags only. The PDF path also sends
 * `tud_pdf_download_submitted` so that download can be its own key event.
 * Toast leads stay on the shared events with `form_type: "toast"`.
 */
export function emitSavedLead(host: AnalyticsHost, input: SavedLeadInput): void {
  const params = savedLeadParams(input);
  emitAnalytics(host, "tud_email_submitted", params);
  emitGoogleEvent(host, "generate_lead", params);
  if (input.formType === "pdf_download") {
    emitGoogleEvent(host, "tud_pdf_download_submitted", params);
  }
}

/** Browser entry point. A missing or blocked Google tag must not break the form. */
export function trackSavedLead(input: SavedLeadInput): void {
  try {
    if (typeof window === "undefined") return;
    emitSavedLead(window, input);
  } catch {
    // ignore
  }
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
