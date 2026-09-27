import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminClient, table } from "@/lib/procurement/server-helpers";

const utmField = z
  .string()
  .trim()
  .max(200)
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
});

export type CaptureLeadInput = z.infer<typeof captureLeadSchema>;

/** Persist a marketing lead from a public campaign page. No auth required. */
export const captureLead = createServerFn({ method: "POST" })
  .inputValidator((input) => captureLeadSchema.parse(input))
  .handler(async ({ data }) => {
    const client = await adminClient();
    const { error } = await table(client, "leads").insert({
      email: data.email,
      source: data.source,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      utm_content: data.utm_content,
      utm_term: data.utm_term,
      plan_snapshot: data.plan_snapshot ?? null,
    });

    if (error) {
      console.error("[leads] insert failed:", error.message);
      throw new Error("We couldn't save your email just now. Please try again.");
    }

    return { ok: true as const };
  });
