import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminClient, assertProjectOwner } from "@/lib/procurement/server-helpers";

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
      .from("project-heroes")
      .createSignedUploadUrl(path);
    if (error || !signed) throw error ?? new Error("Could not prepare the hero upload.");
    const { data: publicData } = client.storage.from("project-heroes").getPublicUrl(path);
    return { path, token: signed.token, publicUrl: publicData.publicUrl };
  });
