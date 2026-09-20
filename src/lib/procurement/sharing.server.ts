import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  adminClient,
  assertProjectOwner,
  cleanOrigin,
  randomToken,
  sha256,
  table,
} from "./server-helpers";

const hiddenFieldSchema = z.enum(["representativeName", "email", "phone", "website"]);

export const createProjectShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        projectId: z.string().uuid(),
        providerName: z.string().trim().min(1).max(200),
        expiresAt: z.string().datetime().optional(),
        hiddenContactFields: z.array(hiddenFieldSchema).max(4).default([]),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    await assertProjectOwner(client, data.projectId, userId);
    const origin = cleanOrigin(data.origin);
    const rawToken = randomToken();
    const tokenHash = await sha256(rawToken);
    const { data: link, error } = await table(client, "project_share_link")
      .insert({
        project_id: data.projectId,
        provider_name: data.providerName,
        token_hash: tokenHash,
        expires_at: data.expiresAt ?? null,
        hidden_contact_fields: data.hiddenContactFields,
        created_by: userId,
      })
      .select(
        "id,project_id,provider_name,expires_at,revoked_at,hidden_contact_fields,first_viewed_at,last_viewed_at,view_count,created_at",
      )
      .single();
    if (error || !link) throw error ?? new Error("Could not create share link.");
    return {
      ...(link as unknown as Record<string, unknown>),
      url: `${origin}/share/${rawToken}`,
    };
  });

export const listProjectShareLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    await assertProjectOwner(client, data.projectId, userId);
    const { data: links, error } = await table(client, "project_share_link")
      .select(
        "id,project_id,provider_name,expires_at,revoked_at,hidden_contact_fields,first_viewed_at,last_viewed_at,view_count,created_at",
      )
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return links ?? [];
  });

export const revokeProjectShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ linkId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const { data: link } = await table(client, "project_share_link")
      .select("project_id")
      .eq("id", data.linkId)
      .single();
    if (!link) throw new Error("Share link not found.");
    await assertProjectOwner(
      client,
      String((link as unknown as { project_id: string }).project_id),
      userId,
    );
    const { error } = await table(client, "project_share_link")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.linkId);
    if (error) throw error;
    return { revoked: true };
  });

export const getSharedProject = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ token: z.string().min(32).max(256) }).parse(input))
  .handler(async ({ data }) => {
    const client = await adminClient();
    const tokenHash = await sha256(data.token);
    const { data: linkData, error } = await table(client, "project_share_link")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();
    if (error || !linkData) throw new Error("This shared summary is unavailable.");
    const link = linkData as unknown as {
      id: string;
      project_id: string;
      provider_name: string;
      expires_at: string | null;
      revoked_at: string | null;
      hidden_contact_fields: string[];
      first_viewed_at: string | null;
      view_count: number;
    };
    if (link.revoked_at) throw new Error("This shared summary has been revoked.");
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
      throw new Error("This shared summary has expired.");
    }

    const now = new Date().toISOString();
    await table(client, "project_share_link")
      .update({
        first_viewed_at: link.first_viewed_at ?? now,
        last_viewed_at: now,
        view_count: link.view_count + 1,
      })
      .eq("id", link.id);

    const [{ data: projectData }, { data: partyRows }] = await Promise.all([
      table(client, "project").select("id,name,data").eq("id", link.project_id).single(),
      table(client, "project_party")
        .select("role,party:party_directory(*)")
        .eq("project_id", link.project_id),
    ]);
    if (!projectData) throw new Error("The shared project no longer exists.");

    const hidden = new Set(link.hidden_contact_fields);
    const parties = ((partyRows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const party = row.party as Record<string, unknown>;
      return {
        id: String(party.id),
        role: String(row.role),
        organisationName: String(party.organisation_name ?? ""),
        representativeName: hidden.has("representativeName")
          ? null
          : String(party.representative_name ?? ""),
        email: hidden.has("email") ? null : String(party.email ?? ""),
        phone: hidden.has("phone") ? null : String(party.phone ?? ""),
        website: hidden.has("website") ? null : String(party.website ?? ""),
      };
    });
    const project = projectData as unknown as {
      id: string;
      name: string;
      data: Json;
    };
    return {
      project: {
        id: project.id,
        name: project.name,
        snapshot: project.data,
      },
      parties,
      providerName: link.provider_name,
    };
  });
