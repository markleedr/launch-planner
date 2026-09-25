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
