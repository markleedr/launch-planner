import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, table } from "./server-helpers";
import type { NotificationKind } from "./types";

export interface NotificationInput {
  userId?: string | null;
  email?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  idempotencyKey?: string;
}

/**
 * In-app notification is authoritative. Email is attempted immediately through
 * Resend and remains in the outbox for the scheduled retry worker if delivery
 * fails.
 */
export async function notify(client: SupabaseClient, input: NotificationInput): Promise<void> {
  if (input.userId) {
    const { error } = await table(client, "app_notification").insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    });
    if (error) throw error;
  }

  if (!input.email) return;
  const { data: outbox, error: queueError } = await table(client, "email_outbox")
    .insert({
      user_id: input.userId ?? null,
      recipient: input.email,
      template: input.kind,
      idempotency_key: input.idempotencyKey ?? null,
      payload: {
        title: input.title,
        body: input.body,
        href: input.href ?? null,
      },
      status: process.env.RESEND_API_KEY ? "pending" : "skipped",
      error_message: process.env.RESEND_API_KEY ? null : "RESEND_API_KEY is not configured",
    })
    .select("*")
    .single();
  if (queueError) {
    // A repeated idempotent notification has already been queued or sent.
    if (queueError.code === "23505" && input.idempotencyKey) return;
    throw queueError;
  }
  if (!process.env.RESEND_API_KEY) return;
  await attemptOutboxEmail(client, outbox as unknown as EmailOutboxRow);
}

export async function processPendingEmailOutbox(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: boolean;
}> {
  if (!process.env.RESEND_API_KEY) {
    return { processed: 0, sent: 0, failed: 0, skipped: true };
  }
  const client = await adminClient();
  const now = new Date().toISOString();
  await table(client, "email_outbox")
    .update({
      status: "failed",
      error_message: "A previous delivery attempt was interrupted and will be retried.",
      next_attempt_at: now,
    })
    .eq("status", "processing")
    .lt("last_attempt_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  const { data, error } = await table(client, "email_outbox")
    .select("*")
    .in("status", ["pending", "failed", "skipped"])
    .lt("attempt_count", 5)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as Array<EmailOutboxRow>) {
    const delivered = await attemptOutboxEmail(client, row);
    if (delivered) sent += 1;
    else failed += 1;
  }
  return { processed: sent + failed, sent, failed, skipped: false };
}

interface EmailOutboxRow {
  id: string;
  recipient: string;
  payload: Record<string, unknown>;
  attempt_count?: number;
}

async function attemptOutboxEmail(client: SupabaseClient, row: EmailOutboxRow): Promise<boolean> {
  const { data: claimed, error: claimError } = await table(client, "email_outbox")
    .update({ status: "processing", last_attempt_at: new Date().toISOString() })
    .eq("id", row.id)
    .in("status", ["pending", "failed", "skipped"])
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return false;
  const claimedRow = claimed as unknown as EmailOutboxRow;
  const title = String(claimedRow.payload.title ?? "Launch Planner notification");
  const body = String(claimedRow.payload.body ?? "");
  const href = claimedRow.payload.href ? String(claimedRow.payload.href) : "";
  const attemptCount = Math.max(0, Number(claimedRow.attempt_count ?? 0)) + 1;
  let response: Response | null = null;
  let responseBody: { id?: string; message?: string } = {};
  let networkError = "";
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.NOTIFICATION_FROM_EMAIL ??
          "Launch Planner <notifications@launchplanner.com.au>",
        to: [claimedRow.recipient],
        subject: title,
        text: `${body}${href ? `\n\n${href}` : ""}`,
        html: notificationHtml(title, body, href),
      }),
    });
    responseBody = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
  } catch (error) {
    networkError = error instanceof Error ? error.message : "Email network request failed";
  }
  const retryMinutes = [1, 5, 30, 120, 360][Math.min(attemptCount - 1, 4)];
  const delivered = response?.ok === true;
  await table(client, "email_outbox")
    .update(
      delivered
        ? {
            status: "sent",
            provider_message_id: responseBody.id ?? null,
            sent_at: new Date().toISOString(),
            attempt_count: attemptCount,
            last_attempt_at: new Date().toISOString(),
            next_attempt_at: null,
            error_message: null,
          }
        : {
            status: "failed",
            error_message:
              responseBody.message ??
              networkError ??
              `Email provider returned ${response?.status ?? "no response"}`,
            attempt_count: attemptCount,
            last_attempt_at: new Date().toISOString(),
            next_attempt_at:
              attemptCount >= 5
                ? null
                : new Date(Date.now() + retryMinutes * 60 * 1000).toISOString(),
          },
    )
    .eq("id", claimedRow.id)
    .eq("status", "processing");
  return delivered;
}

function notificationHtml(title: string, body: string, href: string): string {
  const BRAND = "#F5C518";
  const INK = "#0F172A";
  const MUTED = "#55606E";
  const LINE = "#E6E8EC";
  const siteUrl = "https://launchplanner.com.au";
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replaceAll("\n", "<br />");
  const year = new Date().getFullYear();
  const action = href
    ? `<a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND};color:${INK};font-size:14px;font-weight:700;border-radius:999px;padding:12px 22px;text-decoration:none;margin:4px 0 20px">Open Launch Planner</a>`
    : "";

  return `<!doctype html><html lang="en"><body style="margin:0;padding:32px 0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:0 16px">
  <div style="background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;padding:20px 24px">
      <tr>
        <td style="vertical-align:middle;padding:20px 0 20px 24px">
          <table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
            <tr>
              <td style="vertical-align:middle;padding-right:12px">
                <div style="width:40px;height:40px;border-radius:999px;background:${BRAND};color:${INK};font-weight:700;font-size:14px;letter-spacing:0.5px;line-height:40px;text-align:center">LP</div>
              </td>
              <td style="vertical-align:middle">
                <p style="color:${INK};font-size:16px;font-weight:700;margin:0;line-height:20px">Launch Planner</p>
                <p style="color:${MUTED};font-size:12px;margin:2px 0 0;line-height:16px">Property marketing, planned.</p>
              </td>
            </tr>
          </table>
        </td>
        <td style="vertical-align:middle;text-align:right;padding:20px 24px 20px 0">
          <a href="${siteUrl}" style="color:${INK};font-size:13px;font-weight:600;text-decoration:none">Open app &rarr;</a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid ${LINE};margin:0" />
    <div style="padding:28px 24px 8px">
      <h1 style="font-size:24px;font-weight:700;color:${INK};margin:4px 0 16px;line-height:30px">${safeTitle}</h1>
      <p style="font-size:14px;color:${MUTED};line-height:22px;margin:0 0 16px">${safeBody}</p>
      ${action}
    </div>
  </div>
  <div style="padding:20px 24px;text-align:center">
    <p style="color:${MUTED};font-size:12px;margin:0">Sent by Launch Planner. <a href="${siteUrl}" style="color:${INK};text-decoration:underline">Support</a></p>
    <p style="color:#8A8F98;font-size:11px;margin:6px 0 0">&copy; ${year} Launch Planner. All rights reserved.</p>
  </div>
</div>
</body></html>`;
}


function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
