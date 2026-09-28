/**
 * Browser PostHog (US cloud). Init and capture are guarded so an ad blocker
 * or a failed script never breaks rendering. Email addresses are stripped
 * before anything is sent.
 */
import type { CaptureResult, PostHogConfig } from "posthog-js";
import { captureUtmFromWindow, type UtmParams } from "./utm";

/** Public project key for Project Profile / Default project (id 486798). */
export const DEFAULT_POSTHOG_KEY = "phc_BYvzegBkFAW5vtBxQqenAEqRiVeCoHtUmGNEd6GiUCvX";

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

export const DEFAULT_POSTHOG_UI_HOST = "https://us.posthog.com";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

const EXACT_EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const EMBEDDED_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export type PosthogProperties = Record<string, string | number | boolean>;

type CaptureFn = (event: string, properties?: PosthogProperties) => void;

export type PosthogPageViewState = { href: string | null };

let started = false;
let captureImpl: CaptureFn | null = null;
const queued: Array<{ event: string; properties: PosthogProperties }> = [];

export function resolvePosthogKey(configured?: string | null): string {
  const trimmed = configured?.trim();
  return trimmed ? trimmed : DEFAULT_POSTHOG_KEY;
}

export function resolvePosthogHost(configured?: string | null): string {
  const trimmed = configured?.trim();
  return trimmed ? trimmed : DEFAULT_POSTHOG_HOST;
}

function configuredEnv(): { key?: string; host?: string } {
  const env = import.meta.env as
    | { VITE_POSTHOG_KEY?: string; VITE_POSTHOG_HOST?: string }
    | undefined;
  return { key: env?.VITE_POSTHOG_KEY, host: env?.VITE_POSTHOG_HOST };
}

function isEmailKey(key: string): boolean {
  return key.toLowerCase() === "email";
}

function redactString(value: string): string | undefined {
  if (EXACT_EMAIL.test(value.trim())) return undefined;
  return value.replace(EMBEDDED_EMAIL, "[redacted]");
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > 8) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) {
    return value.map((item) => {
      const next = redactValue(item, depth + 1);
      return next === undefined ? "[redacted]" : next;
    });
  }
  if (value && typeof value === "object") {
    return redactRecord(value as Record<string, unknown>, depth + 1);
  }
  return value;
}

function redactRecord(record: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (isEmailKey(key)) continue;
    const redacted = redactValue(value, depth + 1);
    if (redacted !== undefined) next[key] = redacted;
  }
  return next;
}

/** Drop email keys and email-shaped values from a capture payload. */
export function redactPosthogCapture(capture: CaptureResult | null): CaptureResult | null {
  if (!capture) return null;
  const next: CaptureResult = {
    ...capture,
    properties: redactRecord(capture.properties) as CaptureResult["properties"],
  };
  if (capture.$set) next.$set = redactRecord(capture.$set) as CaptureResult["$set"];
  if (capture.$set_once) {
    next.$set_once = redactRecord(capture.$set_once) as CaptureResult["$set_once"];
  }
  return next;
}

export function createPosthogOptions(apiHost: string): Partial<PostHogConfig> {
  return {
    api_host: apiHost,
    ui_host: DEFAULT_POSTHOG_UI_HOST,
    autocapture: true,
    capture_pageview: false,
    capture_pageleave: true,
    enable_heatmaps: true,
    capture_heatmaps: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { email: true, password: true },
    },
    person_profiles: "identified_only",
    mask_personal_data_properties: true,
    custom_personal_data_properties: ["email"],
    property_denylist: ["email"],
    before_send: redactPosthogCapture,
  };
}

function presentUtm(utm: UtmParams): PosthogProperties {
  const properties: PosthogProperties = {};
  for (const key of UTM_KEYS) {
    const value = utm[key];
    if (!value || isEmailKey(key)) continue;
    const sanitized = sanitizePropertyValue(value);
    if (typeof sanitized === "string") properties[key] = sanitized;
  }
  return properties;
}

function sanitizePropertyValue(
  value: string | number | boolean,
): string | number | boolean | undefined {
  if (typeof value !== "string") return value;
  if (EXACT_EMAIL.test(value.trim())) return undefined;
  return value.replace(EMBEDDED_EMAIL, "[redacted]");
}

/** compact event params, plus any UTM values captured for the session. Emails are omitted. */
export function posthogEventProperties(
  params: PosthogProperties,
  utm: UtmParams,
): PosthogProperties {
  const properties: PosthogProperties = {};
  for (const [key, value] of Object.entries(params)) {
    if (isEmailKey(key)) continue;
    const sanitized = sanitizePropertyValue(value);
    if (sanitized !== undefined) properties[key] = sanitized;
  }
  Object.assign(properties, presentUtm(utm));
  return properties;
}

function safeProperties(properties: PosthogProperties | undefined): PosthogProperties {
  return posthogEventProperties(properties ?? {}, {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  });
}

async function loadPosthog(): Promise<void> {
  try {
    const { default: posthog } = await import("posthog-js");
    const { key, host } = configuredEnv();
    posthog.init(resolvePosthogKey(key), createPosthogOptions(resolvePosthogHost(host)));
    const utm = presentUtm(captureUtmFromWindow());
    if (Object.keys(utm).length > 0) posthog.register(utm);
    captureImpl = (event, properties) => {
      posthog.capture(event, properties);
    };
    const pending = queued.splice(0, queued.length);
    for (const item of pending) {
      try {
        captureImpl(item.event, item.properties);
      } catch {
        // A blocked client must not surface to the page.
      }
    }
  } catch {
    // Script blocked or failed. Leave queued events unsent.
  }
}

/** Browser-only. Safe to call more than once. */
export function initPosthog(): void {
  try {
    if (typeof window === "undefined" || started) return;
    started = true;
    void loadPosthog();
  } catch {
    // ignore
  }
}

export function capturePosthogEvent(event: string, properties?: PosthogProperties): void {
  try {
    const safe = safeProperties(properties);
    if (captureImpl) {
      captureImpl(event, safe);
      return;
    }
    if (typeof window === "undefined") return;
    queued.push({ event, properties: safe });
    initPosthog();
  } catch {
    // ignore
  }
}

/** `$pageview` after the router has flushed the URL. */
export function capturePosthogPageView(): void {
  try {
    const properties: PosthogProperties = {};
    if (typeof window !== "undefined" && window.location?.href) {
      properties.$current_url = window.location.href;
    }
    capturePosthogEvent("$pageview", properties);
  } catch {
    // ignore
  }
}

/**
 * One `$pageview` for the first load and one per later href.
 * The href is stored only when the timer fires, so a Strict Mode replay
 * (schedule, cancel, schedule) sends a single event.
 */
export function posthogPageViewOnNavigate(
  previousHref: string | null,
  nextHref: string,
): { previousHref: string; send: boolean } {
  if (previousHref === nextHref) {
    return { previousHref: nextHref, send: false };
  }
  return { previousHref: nextHref, send: true };
}

export function schedulePosthogPageView(
  state: PosthogPageViewState,
  nextHref: string,
  schedule: (callback: () => void) => () => void,
  capture: () => void,
): () => void {
  const decision = posthogPageViewOnNavigate(state.href, nextHref);
  if (!decision.send) {
    state.href = decision.previousHref;
    return () => undefined;
  }
  return schedule(() => {
    state.href = nextHref;
    try {
      capture();
    } catch {
      // ignore
    }
  });
}

/** Test seam. Production code leaves this unset until `posthog-js` loads. */
export function setPosthogCaptureForTests(capture: CaptureFn | null): void {
  captureImpl = capture;
}
