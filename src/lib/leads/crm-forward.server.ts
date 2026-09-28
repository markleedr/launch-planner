/** Server-only forward of a saved lead to the CRM webhook. Never throws. */

export const CRM_FORWARD_TIMEOUT_MS = 5_000;

export interface CrmLeadForwardInput {
  email: string;
  /** Campaign lead source from the guest demo, e.g. urban-developer or webinar-23-sept. */
  source: string;
  capture_point: "info_toaster" | "pdf_export";
  page_url?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  submitted_at: string;
  lp_lead_id?: string | null;
}

function webhookConfig(): { url: string; secret: string } | null {
  const url = process.env.CRM_LEAD_WEBHOOK_URL?.trim();
  const secret = process.env.CRM_LEAD_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return null;
  return { url, secret };
}

function forwardBody(input: CrmLeadForwardInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    email: input.email,
    source: input.source,
    capture_point: input.capture_point,
    page_url: input.page_url ?? null,
    referrer: input.referrer ?? null,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_content: input.utm_content ?? null,
    utm_term: input.utm_term ?? null,
    submitted_at: input.submitted_at,
  };
  if (input.lp_lead_id) body.lp_lead_id = input.lp_lead_id;
  return body;
}

/**
 * POST the lead to CRM_LEAD_WEBHOOK_URL. Skips when the URL or secret is unset.
 * Timeouts and non-2xx responses are logged and do not fail the caller.
 */
export async function forwardLeadToCrm(input: CrmLeadForwardInput): Promise<void> {
  try {
    const config = webhookConfig();
    if (!config) {
      console.error(
        "[leads] CRM_LEAD_WEBHOOK_URL or CRM_LEAD_WEBHOOK_SECRET is unset; skipping CRM forward",
      );
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CRM_FORWARD_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-launch-planner-secret": config.secret,
        },
        body: JSON.stringify(forwardBody(input)),
        signal: controller.signal,
      });
      if (!response.ok) {
        console.error("[leads] CRM webhook returned", response.status);
      }
    } catch (error) {
      console.error(
        "[leads] CRM webhook failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error(
      "[leads] CRM forward failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}
