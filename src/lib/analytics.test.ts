import vm from "node:vm";
import { describe, expect, test } from "bun:test";
import {
  DEFAULT_META_PIXEL_ID,
  emitAnalytics,
  emitSavedLead,
  emitMetaLead,
  formLocationPath,
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
        utm_campaign: "oct",
      },
    ]);
    expect(gtagCalls).toEqual([
      ["event", "tud_page_view", { source: "urban-developer", utm_campaign: "oct" }],
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
        note: "reach me at [redacted] today",
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

const CAMPAIGN_LEAD = {
  source: "urban-developer",
  campaignSource: "theurbandeveloper",
  campaignName: "tud-oct-nov-2026",
} as const;

const TOAST_PARAMS = {
  form_type: "toast",
  form_location: "/urban-developer",
  via: "info_toaster",
  source: "urban-developer",
  campaign_source: "theurbandeveloper",
  utm_source: "theurbandeveloper",
  campaign_name: "tud-oct-nov-2026",
  utm_campaign: "tud-oct-nov-2026",
};

const PDF_PARAMS = {
  ...TOAST_PARAMS,
  form_type: "pdf_download",
  form_location: "/urban-developer/summary",
  via: "pdf_export",
};

describe("saved lead GA4 events", () => {
  test("keeps only the page path in form_location", () => {
    expect(formLocationPath("/urban-developer?email=lead@example.com&utm_source=tud")).toBe(
      "/urban-developer",
    );
    expect(
      formLocationPath(
        "https://launchplanner.com.au/webinar-23-sept/summary?utm_campaign=tud-oct-nov-2026",
      ),
    ).toBe("/webinar-23-sept/summary");
    expect(formLocationPath("")).toBe("/");
  });

  test("toast success sends tud_email_submitted and generate_lead, not the PDF event", () => {
    const dataLayer: Record<string, unknown>[] = [];
    const gtagCalls: unknown[][] = [];
    const fbqCalls: unknown[][] = [];
    const captured: unknown[][] = [];
    setPosthogCaptureForTests((event, properties) => {
      captured.push([event, properties]);
    });

    try {
      emitSavedLead(
        {
          dataLayer,
          gtag: (...args) => {
            gtagCalls.push(args);
          },
          fbq: (...args) => {
            fbqCalls.push(args);
          },
        },
        {
          formType: "toast",
          formLocation: "/urban-developer?utm_source=theurbandeveloper",
          ...CAMPAIGN_LEAD,
        },
      );
    } finally {
      setPosthogCaptureForTests(null);
    }

    expect(gtagCalls).toEqual([
      ["event", "tud_email_submitted", TOAST_PARAMS],
      ["event", "generate_lead", TOAST_PARAMS],
    ]);
    expect(dataLayer).toEqual([
      { event: "tud_email_submitted", ...TOAST_PARAMS },
      { event: "generate_lead", ...TOAST_PARAMS },
    ]);
    expect(fbqCalls).toEqual([["trackCustom", "tud_email_submitted", TOAST_PARAMS]]);
    expect(captured.map((entry) => entry[0])).toEqual(["tud_email_submitted"]);
    expect(JSON.stringify({ dataLayer, gtagCalls, fbqCalls, captured })).not.toContain("@");
  });

  test("PDF export success also sends tud_pdf_download_submitted", () => {
    const gtagCalls: unknown[][] = [];
    emitSavedLead(
      {
        gtag: (...args) => {
          gtagCalls.push(args);
        },
      },
      {
        formType: "pdf_download",
        formLocation: "https://launchplanner.com.au/urban-developer/summary?utm_medium=banner",
        ...CAMPAIGN_LEAD,
      },
    );

    expect(gtagCalls).toEqual([
      ["event", "tud_email_submitted", PDF_PARAMS],
      ["event", "generate_lead", PDF_PARAMS],
      ["event", "tud_pdf_download_submitted", PDF_PARAMS],
    ]);
  });

  test("omits campaign params and email-shaped values", () => {
    const gtagCalls: unknown[][] = [];
    emitSavedLead(
      {
        gtag: (...args) => {
          gtagCalls.push(args);
        },
      },
      {
        formType: "toast",
        source: "person@example.com",
        formLocation: "/webinar-23-sept",
        campaignSource: "lead@example.com",
        campaignName: null,
      },
    );

    expect(gtagCalls).toEqual([
      [
        "event",
        "tud_email_submitted",
        {
          form_type: "toast",
          form_location: "/webinar-23-sept",
          via: "info_toaster",
        },
      ],
      [
        "event",
        "generate_lead",
        {
          form_type: "toast",
          form_location: "/webinar-23-sept",
          via: "info_toaster",
        },
      ],
    ]);
    expect(JSON.stringify(gtagCalls)).not.toContain("person@example.com");
    expect(JSON.stringify(gtagCalls)).not.toContain("lead@example.com");
  });

  test("does not throw when gtag is missing or throws", () => {
    const dataLayer: Record<string, unknown>[] = [];
    expect(() =>
      emitSavedLead(
        { dataLayer },
        {
          formType: "pdf_download",
          source: "urban-developer",
          formLocation: "/urban-developer/summary",
        },
      ),
    ).not.toThrow();

    const sent: string[] = [];
    let calls = 0;
    expect(() =>
      emitSavedLead(
        {
          dataLayer,
          gtag: (...args) => {
            calls += 1;
            if (calls === 1) throw new Error("blocked");
            sent.push(String(args[1]));
          },
        },
        {
          formType: "pdf_download",
          source: "urban-developer",
          formLocation: "/urban-developer/summary",
        },
      ),
    ).not.toThrow();

    expect(sent).toEqual(["generate_lead", "tud_pdf_download_submitted"]);
    expect(dataLayer.map((entry) => entry.event)).toEqual([
      "tud_email_submitted",
      "generate_lead",
      "tud_pdf_download_submitted",
      "tud_email_submitted",
      "generate_lead",
      "tud_pdf_download_submitted",
    ]);
  });
});
