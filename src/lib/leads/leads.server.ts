import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { adminClient, table } from "@/lib/procurement/server-helpers";
import { forwardLeadToCrm } from "@/lib/leads/crm-forward.server";
import {
  allowAndRecord,
  LEAD_EMAIL_LIMIT,
  LEAD_IP_LIMIT,
  LEAD_WINDOW_MS,
  planSnapshotTooLarge,
} from "@/lib/leads/lead-guard";

const utmField = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const urlField = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const captureLeadSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  source: z.string().trim().min(1).max(100),
  utm_source: utmField,
  utm_medium: utmField,
  utm_campaign: utmField,
  utm_content: utmField,
  utm_term: utmField,
  plan_snapshot: z
    .record(z.unknown())
    .optional()
    .nullable()
    .refine((snapshot) => !planSnapshotTooLarge(snapshot), {
      message: "That plan is too large to save with this request.",
    }),
  capture_point: z.enum(["info_toaster", "pdf_export"]),
  page_url: urlField,
  referrer: urlField,
});

export type CaptureLeadInput = z.infer<typeof captureLeadSchema>;

/** Persist a marketing lead from a public campaign page. No auth required. */
export const captureLead = createServerFn({ method: "POST" })
  .inputValidator((input) => captureLeadSchema.parse(input))
  .handler(async ({ data }) => {
    assertIpRateLimit(clientAddress(getRequest()));
    const client = await adminClient();
    await assertEmailRateLimit(client, data.email);
    const { data: inserted, error } = await table(client, "leads")
      .insert({
        email: data.email,
        source: data.source,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        plan_snapshot: data.plan_snapshot ?? null,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[leads] insert failed:", error.message);
      throw new Error("We couldn't save your email just now. Please try again.");
    }

    const lpLeadId =
      inserted && typeof (inserted as { id?: unknown }).id === "string"
        ? (inserted as { id: string }).id
        : undefined;

    await forwardLeadToCrm({
      email: data.email,
      source: data.source,
      capture_point: data.capture_point,
      page_url: data.page_url,
      referrer: data.referrer,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      utm_content: data.utm_content,
      utm_term: data.utm_term,
      submitted_at: new Date().toISOString(),
      lp_lead_id: lpLeadId,
    });

    return { ok: true as const };
  });

const ipHits = new Map<string, number[]>();

function clientAddress(request: Request | undefined): string {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 200);
  return "unknown";
}

function assertIpRateLimit(address: string): void {
  const result = allowAndRecord(
    ipHits.get(address) ?? [],
    Date.now(),
    LEAD_WINDOW_MS,
    LEAD_IP_LIMIT,
  );
  ipHits.set(address, result.timestamps);
  if (!result.allowed) {
    throw new Error("Too many requests from this network. Please try again later.");
  }
}

async function assertEmailRateLimit(
  client: Awaited<ReturnType<typeof adminClient>>,
  email: string,
): Promise<void> {
  const since = new Date(Date.now() - LEAD_WINDOW_MS).toISOString();
  const { count, error } = await table(client, "leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if (error) {
    console.error("[leads] rate limit check failed:", error.message);
    throw new Error("We couldn't save your email just now. Please try again.");
  }
  if ((count ?? 0) >= LEAD_EMAIL_LIMIT) {
    throw new Error("That email has already been sent a few times. Please try again later.");
  }
}
