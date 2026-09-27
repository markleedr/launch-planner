import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminClient, table } from "@/lib/procurement/server-helpers";
import { forwardLeadToCrm } from "@/lib/leads/crm-forward.server";

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
  plan_snapshot: z.record(z.unknown()).optional().nullable(),
  capture_point: z.enum(["info_toaster", "pdf_export"]),
  page_url: urlField,
  referrer: urlField,
});

export type CaptureLeadInput = z.infer<typeof captureLeadSchema>;

/** Persist a marketing lead from a public campaign page. No auth required. */
export const captureLead = createServerFn({ method: "POST" })
  .inputValidator((input) => captureLeadSchema.parse(input))
  .handler(async ({ data }) => {
    const client = await adminClient();
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
