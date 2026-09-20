import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notify } from "@/lib/procurement/notifications.server";
import { adminClient, table } from "@/lib/procurement/server-helpers";

const profileValuesSchema = z.object({
  fullName: z.string().trim().max(160),
  organisationName: z.string().trim().max(200),
  jobTitle: z.string().trim().max(160),
  phone: z.string().trim().max(80),
  completeOnboarding: z.boolean().default(false),
});

export interface UserProfileResult {
  userId: string;
  email: string;
  fullName: string;
  organisationName: string;
  jobTitle: string;
  phone: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  onboardingCompletedAt: string | null;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadProfile(context.userId as string));

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => profileValuesSchema.parse(input))
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const completedAt = data.completeOnboarding ? new Date().toISOString() : undefined;
    const values: Record<string, unknown> = {
      user_id: userId,
      full_name: data.fullName,
      organisation_name: data.organisationName,
      job_title: data.jobTitle,
      phone: data.phone,
    };
    if (completedAt) values.onboarding_completed_at = completedAt;

    const { error } = await table(client, "user_profile").upsert(values, {
      onConflict: "user_id",
    });
    if (error) throw error;
    return loadProfile(userId);
  });

export const prepareProfileImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fileName: z.string().trim().min(1).max(500),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        sizeBytes: z
          .number()
          .int()
          .min(1)
          .max(10 * 1024 * 1024),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const extension =
      data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { data: signed, error } = await client.storage
      .from("profile-images")
      .createSignedUploadUrl(path);
    if (error || !signed) throw error ?? new Error("Could not prepare the profile image upload.");
    return { path, token: signed.token };
  });

export const finaliseProfileImageUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1).max(800) }).parse(input))
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Invalid profile image path.");

    const { data: existing } = await table(client, "user_profile")
      .select("avatar_path")
      .eq("user_id", userId)
      .maybeSingle();
    const oldPath = (existing as { avatar_path?: string | null } | null)?.avatar_path ?? null;
    const { error } = await table(client, "user_profile").upsert(
      { user_id: userId, avatar_path: data.path },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    if (oldPath && oldPath !== data.path) {
      await client.storage.from("profile-images").remove([oldPath]);
    }
    return loadProfile(userId);
  });

export const removeProfileImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const { data: existing } = await table(client, "user_profile")
      .select("avatar_path")
      .eq("user_id", userId)
      .maybeSingle();
    const path = (existing as { avatar_path?: string | null } | null)?.avatar_path ?? null;
    const { error } = await table(client, "user_profile").upsert(
      { user_id: userId, avatar_path: null },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    if (path) await client.storage.from("profile-images").remove([path]);
    return loadProfile(userId);
  });

export async function ensureWelcomeForPaidUser(userId: string, origin: string): Promise<void> {
  const client = await adminClient();
  await table(client, "user_profile").upsert({ user_id: userId }, { onConflict: "user_id" });
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await table(client, "user_profile")
    .update({ welcome_email_queued_at: now })
    .eq("user_id", userId)
    .is("welcome_email_queued_at", null)
    .select("user_id,full_name")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return;

  const { data: authUser, error: authError } = await client.auth.admin.getUserById(userId);
  if (authError || !authUser.user?.email) {
    await table(client, "user_profile")
      .update({ welcome_email_queued_at: null })
      .eq("user_id", userId);
    throw authError ?? new Error("Could not find the customer email address.");
  }

  const fullName = String((claimed as Record<string, unknown>).full_name ?? "").trim();
  try {
    await notify(client, {
      userId,
      email: authUser.user.email,
      kind: "welcome",
      title: "Welcome to Launch Planner",
      body: `${fullName ? `Hi ${fullName}, ` : ""}your Launch Planner subscription is ready. Add your profile, create your first project, calculate the media plan and invite contractors when you are ready.`,
      href: `${origin}/account?onboarding=1`,
      idempotencyKey: `welcome:${userId}`,
    });
  } catch (error) {
    await table(client, "user_profile")
      .update({ welcome_email_queued_at: null })
      .eq("user_id", userId);
    throw error;
  }
}

async function loadProfile(userId: string): Promise<UserProfileResult> {
  const client = await adminClient();
  await table(client, "user_profile").upsert({ user_id: userId }, { onConflict: "user_id" });
  const [{ data: row, error }, { data: authUser, error: authError }] = await Promise.all([
    table(client, "user_profile").select("*").eq("user_id", userId).single(),
    client.auth.admin.getUserById(userId),
  ]);
  if (error || !row) throw error ?? new Error("Profile not found.");
  if (authError) throw authError;
  const profile = row as unknown as Record<string, unknown>;
  let avatarUrl: string | null = null;
  const avatarPath = optionalString(profile.avatar_path);
  if (avatarPath) {
    const { data: signed } = await client.storage
      .from("profile-images")
      .createSignedUrl(avatarPath, 60 * 60);
    avatarUrl = signed?.signedUrl ?? null;
  }
  return {
    userId,
    email: authUser.user?.email ?? "",
    fullName: String(profile.full_name ?? ""),
    organisationName: String(profile.organisation_name ?? ""),
    jobTitle: String(profile.job_title ?? ""),
    phone: String(profile.phone ?? ""),
    avatarPath,
    avatarUrl,
    onboardingCompletedAt: optionalString(profile.onboarding_completed_at),
  };
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return String(value);
}
