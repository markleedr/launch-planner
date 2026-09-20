import type { SupabaseClient } from "@supabase/supabase-js";

export type LooseTable = ReturnType<SupabaseClient["from"]>;

export async function adminClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export function table(client: SupabaseClient, name: string): LooseTable {
  return client.from(name);
}

export async function assertProjectOwner(
  client: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<{ id: string; name: string; data: Record<string, unknown> }> {
  const { data, error } = await table(client, "project")
    .select("id,name,data")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Project not found or access denied.");
  return data as unknown as { id: string; name: string; data: Record<string, unknown> };
}

export function randomToken(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function cleanOrigin(origin: string): string {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("A valid origin is required.");
  return url.origin;
}
