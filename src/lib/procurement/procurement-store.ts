import { supabase } from "@/integrations/supabase/client";

// The workflow migration is newer than the Lovable-generated Database type.
// Keep the escape hatch isolated here until Lovable regenerates types.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (name: string) => (supabase.from as any)(name);

export async function listDirectoryParties() {
  const { data, error } = await from("party_directory")
    .select("*")
    .order("organisation_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listProjectParties(projectId: string) {
  const { data, error } = await from("project_party")
    .select("*, party:party_directory(*)")
    .eq("project_id", projectId);
  if (error) throw error;
  return data ?? [];
}

export async function listOwnerProposals(projectId: string) {
  const { data: briefs, error: briefError } = await from("deliverable_brief")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (briefError) throw briefError;
  const briefIds = (briefs ?? []).map((brief: { id: string }) => brief.id);
  if (briefIds.length === 0) return [];
  const { data, error } = await from("contractor_proposal")
    .select(
      "*, brief:deliverable_brief(*), contractor:party_directory(*), revisions:proposal_revision(*), variations:proposal_variation(*), thread:deliverable_thread(*)",
    )
    .in("brief_id", briefIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listContractorProposals() {
  const { data, error } = await from("contractor_proposal")
    .select(
      "*, brief:deliverable_brief(*, project:project(id,name,data)), contractor:party_directory(*), revisions:proposal_revision(*), variations:proposal_variation(*), thread:deliverable_thread(*)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listThreadMessages(threadId: string) {
  const { data, error } = await from("deliverable_message")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listCollateral(threadId: string) {
  const { data, error } = await from("collateral_version")
    .select("*, files:collateral_file(*)")
    .eq("thread_id", threadId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listNotifications() {
  const { data, error } = await from("app_notification")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const { error } = await from("app_notification")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function uploadToSignedCollateralPath(input: {
  path: string;
  token: string;
  file: File;
}) {
  const { error } = await supabase.storage
    .from("project-collateral")
    .uploadToSignedUrl(input.path, input.token, input.file, {
      contentType: input.file.type || "application/octet-stream",
    });
  if (error) throw error;
}
