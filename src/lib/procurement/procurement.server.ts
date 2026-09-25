import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminClient, assertProjectOwner, table } from "./server-helpers";

const partyRoleSchema = z.enum([
  "developer",
  "architect",
  "creative_agency",
  "digital_agency",
  "content_agency",
  "media_agency",
  "production_agency",
  "sales_team",
  "builder",
]);

export const saveDirectoryParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        organisationName: z.string().trim().min(1).max(200),
        representativeName: z.string().trim().max(200).default(""),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().trim().max(80).optional().default(""),
        website: z.string().trim().max(500).optional().default(""),
        role: partyRoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const portalEnabled = [
      "creative_agency",
      "digital_agency",
      "content_agency",
      "media_agency",
      "production_agency",
    ].includes(data.role);
    const values = {
      owner_user_id: userId,
      organisation_name: data.organisationName,
      representative_name: data.representativeName,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      role: data.role,
      portal_enabled: portalEnabled,
    };

    if (data.id) {
      const { data: updated, error } = await table(client, "party_directory")
        .update(values)
        .eq("id", data.id)
        .eq("owner_user_id", userId)
        .select("*")
        .single();
      if (error || !updated) throw error ?? new Error("Party not found.");
      return updated;
    }

    const { data: created, error } = await table(client, "party_directory")
      .insert(values)
      .select("*")
      .single();
    if (error || !created) throw error ?? new Error("Could not create party.");
    return created;
  });

export const attachProjectParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        projectId: z.string().uuid(),
        partyId: z.string().uuid(),
        role: partyRoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    await assertProjectOwner(client, data.projectId, userId);
    const { data: party, error: partyError } = await table(client, "party_directory")
      .select("id")
      .eq("id", data.partyId)
      .eq("owner_user_id", userId)
      .single();
    if (partyError || !party) throw new Error("Party not found or access denied.");

    const { data: row, error } = await table(client, "project_party")
      .upsert(
        { project_id: data.projectId, party_id: data.partyId, role: data.role },
        { onConflict: "project_id,party_id,role" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });
