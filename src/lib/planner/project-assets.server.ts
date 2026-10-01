import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminClient, assertProjectOwner } from "@/lib/procurement/server-helpers";
import {
  HERO_BUCKET,
  HERO_SIGNED_URL_SECONDS,
  isSignedProjectHeroUrl,
  projectHeroObjectPath,
} from "@/lib/planner/hero-storage";

async function signedReadUrl(
  client: Awaited<ReturnType<typeof adminClient>>,
  path: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(HERO_BUCKET)
    .createSignedUrl(path, HERO_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not open the project image.");
  return data.signedUrl;
}

export const prepareProjectHeroUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        projectId: z.string().uuid(),
        fileName: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    await assertProjectOwner(client, data.projectId, userId);
    const extension =
      data.fileName
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `${data.projectId}/${crypto.randomUUID()}.${extension.toLowerCase()}`;
    const { data: signed, error } = await client.storage
      .from(HERO_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw error ?? new Error("Could not prepare the hero upload.");
    return { path, token: signed.token };
  });

/** Short-lived read URL for a hero the signed-in user owns. Placeholders pass through. */
export const signProjectHero = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ stored: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ context, data }) => {
    if (isSignedProjectHeroUrl(data.stored)) return data.stored;
    const path = projectHeroObjectPath(data.stored);
    if (!path) return data.stored;
    const client = await adminClient();
    await assertProjectOwner(client, path.split("/")[0] ?? "", context.userId as string);
    return signedReadUrl(client, path);
  });

/** Sign a hero for a response that has already checked the caller may see this project. */
export async function signStoredProjectHero(
  client: Awaited<ReturnType<typeof adminClient>>,
  stored: string,
): Promise<string> {
  if (!stored || isSignedProjectHeroUrl(stored)) return stored;
  const path = projectHeroObjectPath(stored);
  if (!path) return stored;
  return signedReadUrl(client, path);
}
