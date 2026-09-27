import { afterEach, describe, expect, test } from "bun:test";
import { forwardLeadToCrm, type CrmLeadForwardInput } from "./crm-forward.server";

const WEBHOOK_URL = "https://crm.example/functions/v1/launch-planner-lead";
const WEBHOOK_SECRET = "test-launch-planner-secret";

const payload: CrmLeadForwardInput = {
  email: "reader@example.com",
  capture_point: "pdf_export",
  page_url: "https://launchplanner.com.au/urban-developer/summary",
  referrer: "https://www.theurbandeveloper.com/article",
  utm_source: "tud",
  utm_medium: "banner",
  utm_campaign: "november",
  utm_content: "hero",
  utm_term: "launch",
  submitted_at: "2026-09-27T00:00:00.000Z",
  lp_lead_id: "11111111-1111-1111-1111-111111111111",
};

const originalFetch = globalThis.fetch;
const originalUrl = process.env.CRM_LEAD_WEBHOOK_URL;
const originalSecret = process.env.CRM_LEAD_WEBHOOK_SECRET;

function restoreEnv(
  name: "CRM_LEAD_WEBHOOK_URL" | "CRM_LEAD_WEBHOOK_SECRET",
  value: string | undefined,
) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("CRM_LEAD_WEBHOOK_URL", originalUrl);
  restoreEnv("CRM_LEAD_WEBHOOK_SECRET", originalSecret);
});

function installFetch(
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  globalThis.fetch = impl as unknown as typeof fetch;
}

describe("forwardLeadToCrm", () => {
  test("skips the request when the webhook env is unset", async () => {
    const cases: Array<[string | undefined, string | undefined]> = [
      [undefined, undefined],
      [WEBHOOK_URL, undefined],
      [undefined, WEBHOOK_SECRET],
      ["  ", WEBHOOK_SECRET],
      [WEBHOOK_URL, "  "],
    ];

    for (const [url, secret] of cases) {
      restoreEnv("CRM_LEAD_WEBHOOK_URL", url);
      restoreEnv("CRM_LEAD_WEBHOOK_SECRET", secret);
      let called = false;
      installFetch(async () => {
        called = true;
        return new Response("ok", { status: 200 });
      });

      await forwardLeadToCrm(payload);
      expect(called).toBe(false);
    }
  });

  test("sends the secret header and the lead body", async () => {
    process.env.CRM_LEAD_WEBHOOK_URL = `  ${WEBHOOK_URL}  `;
    process.env.CRM_LEAD_WEBHOOK_SECRET = `  ${WEBHOOK_SECRET}  `;

    let captured: { url: string; init: RequestInit } | null = null;
    installFetch(async (input, init) => {
      captured = { url: String(input), init: init ?? {} };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    await forwardLeadToCrm(payload);

    expect(captured).not.toBeNull();
    expect(captured!.url).toBe(WEBHOOK_URL);
    expect(captured!.init.method).toBe("POST");
    const headers = new Headers(captured!.init.headers);
    expect(headers.get("x-launch-planner-secret")).toBe(WEBHOOK_SECRET);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(captured!.init.body))).toEqual({
      email: payload.email,
      capture_point: payload.capture_point,
      page_url: payload.page_url,
      referrer: payload.referrer,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_content: payload.utm_content,
      utm_term: payload.utm_term,
      submitted_at: payload.submitted_at,
      lp_lead_id: payload.lp_lead_id,
    });
    expect(captured!.init.signal).toBeInstanceOf(AbortSignal);
  });

  test("omits lp_lead_id when the insert did not return one", async () => {
    process.env.CRM_LEAD_WEBHOOK_URL = WEBHOOK_URL;
    process.env.CRM_LEAD_WEBHOOK_SECRET = WEBHOOK_SECRET;
    let body = "";
    installFetch(async (_input, init) => {
      body = String(init?.body ?? "");
      return new Response("ok", { status: 201 });
    });

    await forwardLeadToCrm({ ...payload, lp_lead_id: null });
    expect(JSON.parse(body)).not.toHaveProperty("lp_lead_id");
  });

  test("swallows non-2xx responses", async () => {
    process.env.CRM_LEAD_WEBHOOK_URL = WEBHOOK_URL;
    process.env.CRM_LEAD_WEBHOOK_SECRET = WEBHOOK_SECRET;
    installFetch(async () => new Response("nope", { status: 500 }));

    await expect(forwardLeadToCrm(payload)).resolves.toBeUndefined();
  });

  test("swallows a timeout abort", async () => {
    process.env.CRM_LEAD_WEBHOOK_URL = WEBHOOK_URL;
    process.env.CRM_LEAD_WEBHOOK_SECRET = WEBHOOK_SECRET;
    installFetch((_input, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("missing abort signal"));
          return;
        }
        const fail = () => reject(new DOMException("The operation was aborted", "AbortError"));
        if (signal.aborted) {
          fail();
          return;
        }
        signal.addEventListener("abort", fail, { once: true });
      });
    });

    const started = Date.now();
    await expect(forwardLeadToCrm(payload)).resolves.toBeUndefined();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(4_500);
    expect(elapsed).toBeLessThan(8_000);
  }, 15_000);

  test("swallows a network failure", async () => {
    process.env.CRM_LEAD_WEBHOOK_URL = WEBHOOK_URL;
    process.env.CRM_LEAD_WEBHOOK_SECRET = WEBHOOK_SECRET;
    installFetch(async () => {
      throw new Error("connection refused");
    });

    await expect(forwardLeadToCrm(payload)).resolves.toBeUndefined();
  });
});
