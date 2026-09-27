import vm from "node:vm";
import { describe, expect, test } from "bun:test";
import {
  DEFAULT_META_PIXEL_ID,
  emitAnalytics,
  emitMetaLead,
  metaPageViewOnNavigate,
  metaPixelBootstrapScript,
  metaPixelNoscriptSrc,
  resolveMetaPixelId,
  type AnalyticsEventName,
} from "./analytics";
import { setPosthogCaptureForTests } from "./posthog";

describe("meta pixel", () => {
  test("uses the Launch Planner dataset id unless a numeric override is set", () => {
    expect(resolveMetaPixelId(undefined)).toBe(DEFAULT_META_PIXEL_ID);
    expect(resolveMetaPixelId("")).toBe(DEFAULT_META_PIXEL_ID);
    expect(resolveMetaPixelId("not-an-id")).toBe(DEFAULT_META_PIXEL_ID);
    expect(resolveMetaPixelId("1234567890")).toBe("1234567890");
  });

  test("base snippet loads fbevents.js once and sends the initial PageView", () => {
    const script = metaPixelBootstrapScript("974997054805397");
    expect(script).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(script).toContain("fbq('init', '974997054805397')");
    expect(script).toContain("fbq('track', 'PageView')");
    expect(script).toContain("fbq.disablePushState=true");
    expect(script).toContain("window.__lpMetaPixelBooted");
    expect(script.match(/fbq\('track', 'PageView'\)/g)).toHaveLength(1);
  });

  test("bootstrap queues a single PageView even if the inline script runs twice", () => {
    const script = metaPixelBootstrapScript("974997054805397");
    const document = {
      createElement: () => ({}),
      getElementsByTagName: () => [{ parentNode: { insertBefore: () => undefined } }],
    };
    // Classic browser scripts resolve bare `fbq` on the global object, which is `window`.
    const sandbox: {
      window?: unknown;
      document: typeof document;
      fbq?: { queue?: ArrayLike<unknown>; disablePushState?: boolean };
      __lpMetaPixelBooted?: boolean;
    } = { document };
    sandbox.window = sandbox;
    const context = vm.createContext(sandbox);
    vm.runInContext(script, context);
    vm.runInContext(script, context);

    const queued = Array.from(sandbox.fbq?.queue ?? []).map((entry) =>
      Array.from(entry as ArrayLike<unknown>),
    );
    expect(sandbox.__lpMetaPixelBooted).toBe(true);
    expect(sandbox.fbq?.disablePushState).toBe(true);
    expect(queued.filter((entry) => entry[0] === "track" && entry[1] === "PageView")).toHaveLength(
      1,
    );
    expect(queued.filter((entry) => entry[0] === "init")).toHaveLength(1);
  });

  test("noscript image is the PageView fallback for the same id", () => {
    expect(metaPixelNoscriptSrc("974997054805397")).toBe(
      "https://www.facebook.com/tr?id=974997054805397&ev=PageView&noscript=1",
    );
  });

  test("SPA listener skips the first URL and sends PageView on a later change", () => {
    expect(metaPageViewOnNavigate(null, "/")).toEqual({ previousHref: "/", send: false });
    expect(metaPageViewOnNavigate("/", "/")).toEqual({ previousHref: "/", send: false });
    expect(metaPageViewOnNavigate("/", "/urban-developer")).toEqual({
      previousHref: "/urban-developer",
      send: true,
    });
  });
});

describe("emitAnalytics", () => {
  test("sends the event to dataLayer, gtag, and Meta trackCustom", () => {
    const dataLayer: Record<string, unknown>[] = [];
    const gtagCalls: unknown[][] = [];
    const fbqCalls: unknown[][] = [];
    emitAnalytics(
      {
        dataLayer,
        gtag: (...args) => {
          gtagCalls.push(args);
        },
        fbq: (...args) => {
          fbqCalls.push(args);
        },
      },
      "tud_page_view",
      { source: "urban-developer", utm_source: null, utm_campaign: "oct" },
    );

    expect(dataLayer).toEqual([
      {
        event: "tud_page_view",
        source: "urban-developer",
        utm_source: null,
        utm_campaign: "oct",
      },
    ]);
    expect(gtagCalls).toEqual([
      [
        "event",
        "tud_page_view",
        { source: "urban-developer", utm_source: null, utm_campaign: "oct" },
      ],
    ]);
    expect(fbqCalls).toEqual([
      ["trackCustom", "tud_page_view", { source: "urban-developer", utm_campaign: "oct" }],
    ]);
  });

  test("does not throw when gtag or fbq is missing or throws", () => {
    const dataLayer: Record<string, unknown>[] = [];
    const event: AnalyticsEventName = "tud_email_submitted";
    expect(() => emitAnalytics({ dataLayer }, event, { source: "urban-developer" })).not.toThrow();
    expect(() =>
      emitAnalytics(
        {
          dataLayer,
          gtag: () => {
            throw new Error("blocked");
          },
          fbq: () => {
            throw new Error("blocked");
          },
        },
        event,
      ),
    ).not.toThrow();
    expect(dataLayer).toHaveLength(2);
  });

  test("Lead omits empty UTM values and survives a blocked pixel", () => {
    const calls: unknown[][] = [];
    emitMetaLead(
      {
        fbq: (...args) => {
          calls.push(args);
        },
      },
      {
        content_name: "urban-developer",
        utm_source: "tud",
        utm_medium: null,
        utm_campaign: undefined,
      },
    );
    expect(calls).toEqual([
      ["track", "Lead", { content_name: "urban-developer", utm_source: "tud" }],
    ]);
    expect(() =>
      emitMetaLead(
        {
          fbq: () => {
            throw new Error("blocked");
          },
        },
        { content_name: "urban-developer" },
      ),
    ).not.toThrow();
    expect(() => emitMetaLead({}, { content_name: "urban-developer" })).not.toThrow();
  });
});

describe("posthog forwarding", () => {
  test("forwards compact params and session UTMs, and never includes an email", () => {
    const captured: unknown[][] = [];
    setPosthogCaptureForTests((event, properties) => {
      captured.push([event, properties]);
    });

    const previousWindow = globalThis.window;
    const previousStorage = globalThis.sessionStorage;
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    globalThis.window = {
      location: { search: "?utm_source=tud&utm_medium=cpc&utm_campaign=oct&utm_term=apartments" },
    } as Window & typeof globalThis;

    const dataLayer: Record<string, unknown>[] = [];
    try {
      emitAnalytics({ dataLayer }, "tud_email_submitted", {
        source: "urban-developer",
        via: "info_toaster",
        email: "person@example.com",
        utm_source: null,
        note: "reach me at other@example.com today",
      });
    } finally {
      setPosthogCaptureForTests(null);
      globalThis.window = previousWindow;
      globalThis.sessionStorage = previousStorage;
    }

    expect(dataLayer).toEqual([
      {
        event: "tud_email_submitted",
        source: "urban-developer",
        via: "info_toaster",
        email: "person@example.com",
        utm_source: null,
        note: "reach me at other@example.com today",
      },
    ]);
    expect(captured).toEqual([
      [
        "tud_email_submitted",
        {
          source: "urban-developer",
          via: "info_toaster",
          note: "reach me at [redacted] today",
          utm_source: "tud",
          utm_medium: "cpc",
          utm_campaign: "oct",
          utm_term: "apartments",
        },
      ],
    ]);
    expect(JSON.stringify(captured)).not.toContain("person@example.com");
    expect(JSON.stringify(captured)).not.toContain("other@example.com");
  });

  test("does not throw when PostHog is missing or throws", () => {
    const dataLayer: Record<string, unknown>[] = [];
    setPosthogCaptureForTests(null);
    expect(() =>
      emitAnalytics({ dataLayer }, "tud_demo_started", { source: "urban-developer" }),
    ).not.toThrow();

    setPosthogCaptureForTests(() => {
      throw new Error("blocked");
    });
    expect(() =>
      emitAnalytics({ dataLayer }, "tud_plan_generated", { source: "urban-developer" }),
    ).not.toThrow();
    setPosthogCaptureForTests(null);

    expect(dataLayer).toEqual([
      { event: "tud_demo_started", source: "urban-developer" },
      { event: "tud_plan_generated", source: "urban-developer" },
    ]);
  });
});
