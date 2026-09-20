import { createServerFn } from "@tanstack/react-start";
import { subBusinessDays } from "date-fns";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notify } from "./notifications.server";
import { adminClient, assertProjectOwner, cleanOrigin, table } from "./server-helpers";

async function getThreadForUser(
  client: Awaited<ReturnType<typeof adminClient>>,
  threadId: string,
  userId: string,
) {
  const { data, error } = await table(client, "deliverable_thread")
    .select("*, proposal:contractor_proposal(status), contractor:party_directory(*)")
    .eq("id", threadId)
    .single();
  if (error || !data) throw new Error("Deliverable conversation not found.");
  const thread = data as unknown as {
    id: string;
    project_id: string;
    deliverable_id: string;
    owner_user_id: string;
    contractor_party_id: string;
    delivery_status: string;
    proposal: {
      status: string;
    };
    contractor: {
      auth_user_id: string | null;
      email: string | null;
      organisation_name: string;
    };
  };
  const contractorCanAccess =
    thread.contractor.auth_user_id === userId && thread.proposal.status === "awarded";
  if (thread.owner_user_id !== userId && !contractorCanAccess) {
    throw new Error("Access denied.");
  }
  return thread;
}

export const sendDeliverableMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        threadId: z.string().uuid(),
        body: z.string().trim().max(20_000).default(""),
        attachmentNames: z.array(z.string().max(500)).max(20).default([]),
        origin: z.string().url(),
      })
      .refine((value) => value.body.length > 0 || value.attachmentNames.length > 0)
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const thread = await getThreadForUser(client, data.threadId, userId);
    const { data: message, error } = await table(client, "deliverable_message")
      .insert({
        thread_id: thread.id,
        sender_user_id: userId,
        body: data.body,
        attachment_names: data.attachmentNames,
      })
      .select("*")
      .single();
    if (error) throw error;

    const ownerSent = thread.owner_user_id === userId;
    await notify(client, {
      userId: ownerSent ? thread.contractor.auth_user_id : thread.owner_user_id,
      email: ownerSent ? thread.contractor.email : null,
      kind: "message_received",
      title: "New deliverable message",
      body: data.body.slice(0, 240) || "A new attachment was shared.",
      href: ownerSent
        ? `${origin}/contractor`
        : `${origin}/planner/procurement?projectId=${thread.project_id}`,
    });
    return message;
  });

export const startDeliverableDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ threadId: z.string().uuid(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const thread = await getThreadForUser(client, data.threadId, userId);
    if (thread.delivery_status !== "awarded") {
      throw new Error("This deliverable cannot be started from its current status.");
    }
    const { error } = await table(client, "deliverable_thread")
      .update({ delivery_status: "in_progress" })
      .eq("id", thread.id)
      .eq("delivery_status", "awarded");
    if (error) throw error;

    const ownerStarted = thread.owner_user_id === userId;
    await notify(client, {
      userId: ownerStarted ? thread.contractor.auth_user_id : thread.owner_user_id,
      email: ownerStarted ? thread.contractor.email : null,
      kind: "delivery_started",
      title: "Deliverable now in progress",
      body: `${thread.contractor.organisation_name} has started work on the awarded deliverable.`,
      href: ownerStarted
        ? `${origin}/contractor`
        : `${origin}/planner/procurement?projectId=${thread.project_id}`,
    });
    return { status: "in_progress" };
  });

export const scheduleCollateralRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        threadId: z.string().uuid(),
        cutoffAt: z.string().datetime(),
        collectionLeadBusinessDays: z.number().int().min(0).max(365),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const thread = await getThreadForUser(client, data.threadId, userId);
    if (thread.owner_user_id !== userId) throw new Error("Only the project owner can schedule.");
    await assertProjectOwner(client, thread.project_id, userId);
    const cutoff = new Date(data.cutoffAt);
    const scheduledFor = subBusinessDays(cutoff, data.collectionLeadBusinessDays);
    const dueNow = scheduledFor.getTime() <= Date.now();
    if (thread.delivery_status === "awarded") {
      await table(client, "deliverable_thread")
        .update({ delivery_status: "in_progress" })
        .eq("id", thread.id);
    }
    const { data: request, error } = await table(client, "collateral_request")
      .insert({
        thread_id: thread.id,
        cutoff_at: cutoff.toISOString(),
        scheduled_for: scheduledFor.toISOString(),
        status: dueNow ? "sent" : "scheduled",
        sent_at: dueNow ? new Date().toISOString() : null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw error;

    if (dueNow) {
      await table(client, "deliverable_thread")
        .update({ delivery_status: "collateral_requested" })
        .eq("id", thread.id);
      await notify(client, {
        userId: thread.contractor.auth_user_id,
        email: thread.contractor.email,
        kind: "collateral_requested",
        title: "Collateral requested",
        body: `Collateral is required by ${cutoff.toLocaleDateString("en-AU")}.`,
        href: `${origin}/contractor`,
      });
    }
    return request;
  });

export const dispatchDueCollateralRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ projectId: z.string().uuid(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const client = await adminClient();
    await assertProjectOwner(client, data.projectId, userId);
    return dispatchScheduledCollateralRequests({
      projectId: data.projectId,
      origin,
    });
  });

export async function dispatchScheduledCollateralRequests({
  projectId,
  origin = "",
}: {
  projectId?: string;
  origin?: string;
} = {}) {
  const client = await adminClient();
  let query = table(client, "collateral_request")
    .select("*, thread:deliverable_thread!inner(*, contractor:party_directory(*))")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(500);
  if (projectId) query = query.eq("thread.project_id", projectId);
  const { data: dueData, error } = await query;
  if (error) throw error;
  let dispatched = 0;
  for (const row of (dueData ?? []) as Array<Record<string, unknown>>) {
    const thread = row.thread as {
      id: string;
      contractor: { auth_user_id: string | null; email: string | null };
    };
    const { data: claimed, error: claimError } = await table(client, "collateral_request")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    await table(client, "deliverable_thread")
      .update({ delivery_status: "collateral_requested" })
      .eq("id", thread.id);
    await notify(client, {
      userId: thread.contractor.auth_user_id,
      email: thread.contractor.email,
      kind: "collateral_requested",
      title: "Collateral requested",
      body: `Collateral is required by ${new Date(String(row.cutoff_at)).toLocaleDateString("en-AU")}.`,
      href: `${origin}/contractor`,
    });
    dispatched += 1;
  }
  return { dispatched };
}

export const createCollateralUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        threadId: z.string().uuid(),
        notes: z.string().max(10_000).default(""),
        files: z
          .array(
            z.object({
              name: z.string().min(1).max(500),
              contentType: z.string().max(200).default("application/octet-stream"),
              sizeBytes: z
                .number()
                .int()
                .min(0)
                .max(250 * 1024 * 1024),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const thread = await getThreadForUser(client, data.threadId, userId);
    if (thread.contractor.auth_user_id !== userId) {
      throw new Error("Only the awarded contractor can upload collateral.");
    }
    if (
      !["awarded", "in_progress", "collateral_requested", "changes_requested"].includes(
        thread.delivery_status,
      )
    ) {
      throw new Error("This deliverable is not accepting collateral.");
    }
    const { data: latest } = await table(client, "collateral_version")
      .select("version")
      .eq("thread_id", thread.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = Number((latest as unknown as { version?: number } | null)?.version ?? 0) + 1;
    const { data: versionData, error } = await table(client, "collateral_version")
      .insert({
        thread_id: thread.id,
        version,
        status: "submitted",
        notes: data.notes,
        submitted_by: userId,
      })
      .select("id")
      .single();
    if (error || !versionData) throw error ?? new Error("Could not create collateral version.");
    const versionId = String((versionData as unknown as { id: string }).id);
    const uploads: Array<{ fileId: string; fileName: string; path: string; token: string }> = [];
    for (const file of data.files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-180);
      const path = `${thread.project_id}/${thread.deliverable_id}/${thread.id}/v${version}/${crypto.randomUUID()}-${safeName}`;
      const { data: signed, error: signedError } = await client.storage
        .from("project-collateral")
        .createSignedUploadUrl(path);
      if (signedError || !signed) throw signedError ?? new Error("Could not prepare upload.");
      const { data: fileRow, error: fileError } = await table(client, "collateral_file")
        .insert({
          collateral_version_id: versionId,
          storage_path: path,
          file_name: file.name,
          content_type: file.contentType,
          size_bytes: file.sizeBytes,
        })
        .select("id")
        .single();
      if (fileError || !fileRow) throw fileError ?? new Error("Could not register upload.");
      uploads.push({
        fileId: String((fileRow as unknown as { id: string }).id),
        fileName: file.name,
        path,
        token: signed.token,
      });
    }
    return { versionId, version, uploads };
  });

export const finaliseCollateralUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        versionId: z.string().uuid(),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const { data: versionData } = await table(client, "collateral_version")
      .select("*, thread:deliverable_thread(*, contractor:party_directory(*))")
      .eq("id", data.versionId)
      .single();
    if (!versionData) throw new Error("Collateral version not found.");
    const version = versionData as unknown as {
      id: string;
      thread: {
        id: string;
        project_id: string;
        owner_user_id: string;
        contractor: { auth_user_id: string | null };
      };
    };
    if (version.thread.contractor.auth_user_id !== userId) throw new Error("Access denied.");
    await table(client, "deliverable_thread")
      .update({ delivery_status: "collateral_submitted" })
      .eq("id", version.thread.id);
    await table(client, "collateral_request")
      .update({ status: "fulfilled" })
      .eq("thread_id", version.thread.id)
      .in("status", ["scheduled", "sent"]);
    await notify(client, {
      userId: version.thread.owner_user_id,
      kind: "collateral_submitted",
      title: "Collateral submitted",
      body: "A new collateral version is ready to review.",
      href: `${origin}/planner/procurement?projectId=${version.thread.project_id}`,
    });
    return { status: "submitted" };
  });

export const reviewCollateral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        versionId: z.string().uuid(),
        decision: z.enum(["changes_requested", "approved"]),
        feedback: z.string().max(20_000).default(""),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const { data: versionData } = await table(client, "collateral_version")
      .select("*, thread:deliverable_thread(*, contractor:party_directory(*))")
      .eq("id", data.versionId)
      .single();
    if (!versionData) throw new Error("Collateral version not found.");
    const version = versionData as unknown as {
      id: string;
      thread: {
        id: string;
        project_id: string;
        owner_user_id: string;
        contractor: {
          auth_user_id: string | null;
          email: string | null;
        };
      };
    };
    if (version.thread.owner_user_id !== userId) throw new Error("Access denied.");
    const now = new Date().toISOString();
    await table(client, "collateral_version")
      .update({
        status: data.decision,
        reviewed_by: userId,
        reviewed_at: now,
      })
      .eq("id", version.id);
    await table(client, "deliverable_thread")
      .update({ delivery_status: data.decision })
      .eq("id", version.thread.id);
    if (data.feedback) {
      await table(client, "deliverable_message").insert({
        thread_id: version.thread.id,
        sender_user_id: userId,
        body: data.feedback,
        attachment_names: [],
      });
    }
    await notify(client, {
      userId: version.thread.contractor.auth_user_id,
      email: version.thread.contractor.email,
      kind: data.decision === "approved" ? "collateral_approved" : "changes_requested",
      title: data.decision === "approved" ? "Collateral approved" : "Changes requested",
      body:
        data.feedback ||
        (data.decision === "approved"
          ? "Your collateral has been approved."
          : "Please review the requested changes and upload a new version."),
      href: `${origin}/contractor`,
    });
    return { status: data.decision };
  });

export const getCollateralDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fileId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const { data: fileData } = await table(client, "collateral_file")
      .select("*, version:collateral_version(thread_id)")
      .eq("id", data.fileId)
      .single();
    if (!fileData) throw new Error("File not found.");
    const file = fileData as unknown as {
      storage_path: string;
      file_name: string;
      version: { thread_id: string };
    };
    await getThreadForUser(client, file.version.thread_id, userId);
    const { data: signed, error } = await client.storage
      .from("project-collateral")
      .createSignedUrl(file.storage_path, 60 * 10, { download: file.file_name });
    if (error || !signed) throw error ?? new Error("Could not create a download link.");
    return { url: signed.signedUrl };
  });

export const completeDeliverableDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ threadId: z.string().uuid(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const thread = await getThreadForUser(client, data.threadId, userId);
    if (thread.owner_user_id !== userId) throw new Error("Access denied.");
    if (thread.delivery_status !== "approved") {
      throw new Error("Collateral must be approved before completing this deliverable.");
    }
    await table(client, "deliverable_thread")
      .update({ delivery_status: "completed" })
      .eq("id", thread.id);
    await notify(client, {
      userId: thread.contractor.auth_user_id,
      email: thread.contractor.email,
      kind: "deliverable_completed",
      title: "Deliverable completed",
      body: "The project owner has marked this deliverable complete.",
      href: `${origin}/contractor`,
    });
    return { status: "completed" };
  });
