import * as React from "react";
import { render } from "@react-email/render";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

/**
 * Supabase's "Send Email" Auth Hook - replaces Supabase's own default auth
 * emails with the branded templates below. Configure this in the Supabase
 * dashboard under Authentication > Hooks: type HTTPS, URL pointing at this
 * route, secret in SEND_EMAIL_HOOK_SECRET (format "v1,whsec_...", generated
 * by that same dashboard page).
 *
 * This used to run through a Lovable-hosted relay (@lovable.dev/webhooks-js
 * verified the signature; @lovable.dev/email-js parsed the payload). The
 * Lovable project has since been deleted, so nothing ever called this route
 * - Supabase silently fell back to its own unbranded emails. This verifies
 * and parses Supabase's own native Send Email Hook payload directly instead.
 *
 * See https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook.
 */

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: "Confirm your email",
  invite: "You've been invited",
  magiclink: "Your login link",
  recovery: "Reset your password",
  email_change: "Confirm your new email",
  reauthentication: "Your verification code",
};

// Each template takes different, specific props - `any` is the pragmatic
// type for a lookup that holds all of them; each call site below supplies
// the right shape for whichever template it's rendering.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
};

// FROM_DOMAIN must match a domain verified in Resend. notifications@launchplanner.com.au
// already sends successfully via the checkout email flow, so auth emails reuse it.
const SITE_NAME = "Launch Planner";
const ROOT_DOMAIN = "launchplanner.com.au";
const FROM_DOMAIN = "launchplanner.com.au";

interface HookUser {
  email: string;
  new_email?: string;
}

interface HookEmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new: string;
  token_hash_new: string;
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

/** The link Supabase itself verifies before redirecting the user onward. */
function verifyUrl(
  supabaseUrl: string,
  tokenHash: string,
  actionType: string,
  redirectTo: string,
): string {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", actionType);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey =
          process.env.SB_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!hookSecret || !supabaseUrl || !supabaseServiceKey) {
          console.error("Missing SEND_EMAIL_HOOK_SECRET or Supabase environment variables");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const body = await request.text();
        const headers = Object.fromEntries(request.headers);
        const wh = new Webhook(hookSecret.replace("v1,whsec_", ""));

        let user: HookUser;
        let email_data: HookEmailData;
        try {
          const verified = wh.verify(body, headers) as {
            user: HookUser;
            email_data: HookEmailData;
          };
          user = verified.user;
          email_data = verified.email_data;
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error("Send Email Hook signature verification failed", {
              error: error.message,
            });
            return Response.json(
              { error: { http_code: 401, message: "Invalid signature" } },
              { status: 401 },
            );
          }
          console.error("Send Email Hook payload was not valid JSON", { error });
          return Response.json(
            { error: { http_code: 400, message: "Invalid payload" } },
            { status: 400 },
          );
        }

        const emailType = email_data.email_action_type;
        console.log("Received auth email hook event", {
          emailType,
          email_redacted: redactEmail(user.email),
        });

        const EmailTemplate = EMAIL_TEMPLATES[emailType];
        if (!EmailTemplate) {
          // Notification-only event types (password_changed_notification, etc.)
          // have no custom template - let Supabase's own handling apply.
          console.log("No custom template for this email type; leaving it to Supabase", {
            emailType,
          });
          return Response.json({});
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        try {
          if (emailType === "reauthentication") {
            await enqueue(supabase, emailType, user.email, EmailTemplate, {
              siteName: SITE_NAME,
              siteUrl: `https://${ROOT_DOMAIN}`,
              token: email_data.token,
            });
          } else if (emailType === "email_change") {
            await sendEmailChangeEmails(supabase, EmailTemplate, user, email_data);
          } else {
            const confirmationUrl = verifyUrl(
              supabaseUrl,
              email_data.token_hash,
              emailType,
              email_data.redirect_to,
            );
            await enqueue(supabase, emailType, user.email, EmailTemplate, {
              siteName: SITE_NAME,
              siteUrl: `https://${ROOT_DOMAIN}`,
              recipient: user.email,
              confirmationUrl,
            });
          }
        } catch (error) {
          console.error("Failed to enqueue auth email", { emailType, error });
          return Response.json(
            { error: { http_code: 500, message: "Failed to enqueue email" } },
            { status: 500 },
          );
        }

        return Response.json({});
      },
    },
  },
});

/**
 * Secure Email Change sends two OTPs, one per address, and the field names
 * are swapped from what you'd expect: token_hash_new pairs with the CURRENT
 * address, token_hash pairs with the NEW one. When only one pair is present
 * (Secure Email Change off), a single email goes to the new address.
 * See "Email change behavior and token hash mapping" in the Supabase docs.
 */
async function sendEmailChangeEmails(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmailTemplate: React.ComponentType<any>,
  user: HookUser,
  email_data: HookEmailData,
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const oldEmail = user.email;
  const newEmail = user.new_email ?? "";
  const sends: Promise<void>[] = [];

  if (email_data.token_hash_new) {
    const confirmationUrl = verifyUrl(
      supabaseUrl,
      email_data.token_hash_new,
      "email_change",
      email_data.redirect_to,
    );
    sends.push(
      enqueue(supabase, "email_change", oldEmail, EmailTemplate, {
        siteName: SITE_NAME,
        siteUrl: `https://${ROOT_DOMAIN}`,
        oldEmail,
        email: oldEmail,
        newEmail,
        confirmationUrl,
      }),
    );
  }

  if (email_data.token_hash) {
    const confirmationUrl = verifyUrl(
      supabaseUrl,
      email_data.token_hash,
      "email_change",
      email_data.redirect_to,
    );
    sends.push(
      enqueue(supabase, "email_change", newEmail, EmailTemplate, {
        siteName: SITE_NAME,
        siteUrl: `https://${ROOT_DOMAIN}`,
        oldEmail,
        email: newEmail,
        newEmail,
        confirmationUrl,
      }),
    );
  }

  await Promise.all(sends);
}

/** Render one templated email and enqueue it for the async Resend dispatcher. */
async function enqueue(
  supabase: SupabaseClient,
  emailType: string,
  recipient: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmailTemplate: React.ComponentType<any>,
  templateProps: Record<string, unknown>,
): Promise<void> {
  const element = React.createElement(EmailTemplate, templateProps);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const messageId = crypto.randomUUID();

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: recipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabase.rpc("enqueue_email", {
    queue_name: "auth_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      subject: EMAIL_SUBJECTS[emailType] || "Notification",
      html,
      text,
      purpose: "transactional",
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: recipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    throw enqueueError;
  }
}
