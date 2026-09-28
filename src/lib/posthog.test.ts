import { describe, expect, test } from "bun:test";
import type { CaptureResult } from "posthog-js";
import {
  DEFAULT_POSTHOG_HOST,
  DEFAULT_POSTHOG_KEY,
  DEFAULT_POSTHOG_UI_HOST,
  createPosthogOptions,
  posthogEventProperties,
  posthogPageViewOnNavigate,
  redactPosthogCapture,
  resolvePosthogHost,
  resolvePosthogKey,
  schedulePosthogPageView,
  type PosthogPageViewState,
} from "./posthog";
import { emptyUtm } from "./utm";

describe("posthog config", () => {
  test("falls back to the Project Profile US project when env is unset", () => {
    expect(resolvePosthogKey(undefined)).toBe(DEFAULT_POSTHOG_KEY);
    expect(resolvePosthogKey("")).toBe(DEFAULT_POSTHOG_KEY);
    expect(resolvePosthogKey("  phc_custom  ")).toBe("phc_custom");
    expect(resolvePosthogHost(undefined)).toBe(DEFAULT_POSTHOG_HOST);
    expect(resolvePosthogHost("")).toBe(DEFAULT_POSTHOG_HOST);
    expect(resolvePosthogHost(" https://eu.i.posthog.com ")).toBe("https://eu.i.posthog.com");
  });

  test("enables autocapture, heatmaps, and masked session replay without auto pageviews", () => {
    const options = createPosthogOptions(DEFAULT_POSTHOG_HOST);
    expect(options).toMatchObject({
      api_host: DEFAULT_POSTHOG_HOST,
      ui_host: DEFAULT_POSTHOG_UI_HOST,
      autocapture: true,
      capture_pageview: false,
      capture_pageleave: true,
      enable_heatmaps: true,
      capture_heatmaps: true,
      disable_session_recording: false,
      person_profiles: "identified_only",
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: { email: true, password: true },
      },
      property_denylist: ["email"],
      custom_personal_data_properties: ["email"],
    });
  });
});

describe("posthog properties", () => {
  test("adds present UTMs and drops email keys and email-shaped values", () => {
    expect(
      posthogEventProperties(
        {
          source: "urban-developer",
          email: "lead@example.com",
          utm_content: "info-toaster",
        },
        {
          ...emptyUtm(),
          utm_source: "tud",
          utm_medium: "cpc",
          utm_content: "banner",
          utm_term: "buyer@example.com",
        },
      ),
    ).toEqual({
      source: "urban-developer",
      utm_content: "banner",
      utm_source: "tud",
      utm_medium: "cpc",
    });
  });

  test("redacts email addresses inside a capture payload", () => {
    const capture = {
      uuid: "1",
      event: "tud_email_submitted",
      properties: {
        source: "urban-developer",
        email: "lead@example.com",
        note: "write to lead@example.com",
        $current_url: "https://launchplanner.com.au/urban-developer?email=lead@example.com",
      },
      $set: { email: "lead@example.com", plan: "guest" },
    } as CaptureResult;

    expect(redactPosthogCapture(capture)?.properties).toEqual({
      source: "urban-developer",
      note: "write to [redacted]",
      $current_url: "https://launchplanner.com.au/urban-developer?email=[redacted]",
    });
    expect(redactPosthogCapture(capture)?.$set).toEqual({ plan: "guest" });
    expect(redactPosthogCapture(null)).toBeNull();
  });
});

describe("posthog pageviews", () => {
  function manualTimers() {
    const queued: Array<{ run: () => void; cancelled: boolean }> = [];
    return {
      schedule(callback: () => void) {
        const entry = { run: callback, cancelled: false };
        queued.push(entry);
        return () => {
          entry.cancelled = true;
        };
      },
      flush() {
        const batch = queued.splice(0, queued.length);
        for (const entry of batch) {
          if (!entry.cancelled) entry.run();
        }
      },
    };
  }

  test("sends one pageview on the first load and one per href change", () => {
    const state: PosthogPageViewState = { href: null };
    const sent: string[] = [];
    const timers = manualTimers();

    expect(posthogPageViewOnNavigate(null, "/urban-developer")).toEqual({
      previousHref: "/urban-developer",
      send: true,
    });

    const cancelFirst = schedulePosthogPageView(state, "/urban-developer", timers.schedule, () => {
      sent.push("/urban-developer");
    });
    cancelFirst();
    schedulePosthogPageView(state, "/urban-developer", timers.schedule, () => {
      sent.push("/urban-developer");
    });
    timers.flush();

    const cancelNext = schedulePosthogPageView(
      state,
      "/urban-developer/new",
      timers.schedule,
      () => {
        sent.push("/urban-developer/new");
      },
    );
    cancelNext();
    schedulePosthogPageView(state, "/urban-developer/new", timers.schedule, () => {
      sent.push("/urban-developer/new");
    });
    timers.flush();

    schedulePosthogPageView(state, "/urban-developer/new", timers.schedule, () => {
      sent.push("duplicate");
    });
    timers.flush();

    expect(sent).toEqual(["/urban-developer", "/urban-developer/new"]);
    expect(state.href).toBe("/urban-developer/new");
  });
});
