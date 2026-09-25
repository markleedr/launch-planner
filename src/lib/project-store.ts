/**
 * Saved-project CRUD via the browser Supabase client. Every query explicitly
 * scopes itself to the authenticated user, while database Row Level Security
 * independently enforces the same tenant boundary.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { deserializePlanner, serializePlanner, type PlannerSnapshot } from "@/lib/planner";

export interface ProjectRow {
  id: string;
  name: string;
  updated_at: string;
}

const projectTable = () => supabase.from("project");

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("You need to sign in to access projects.");
  }
  return data.user.id;
}

/** List the current user's saved projects, newest first. */
export async function listProjects(): Promise<ProjectRow[]> {
  const userId = await currentUserId();
  const { data, error } = await projectTable()
    .select("id,name,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Load one project's name + revived snapshot, or null if not found/invalid. */
export async function loadProject(
  id: string,
): Promise<{ name: string; snapshot: PlannerSnapshot } | null> {
  const userId = await currentUserId();
  const { data, error } = await projectTable()
    .select("name,data")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const snapshot = deserializePlanner(data.data);
  if (!snapshot) return null;
  return { name: data.name, snapshot };
}

/** Insert a new project for the signed-in user. Returns the new id. */
export async function createProject(name: string, snapshot: PlannerSnapshot): Promise<string> {
  const userId = await currentUserId();
  const { data, error } = await projectTable()
    .insert({ user_id: userId, name, data: serializePlanner(snapshot) as Json })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Update an existing project. */
export async function updateProject(
  id: string,
  name: string,
  snapshot: PlannerSnapshot,
): Promise<void> {
  const userId = await currentUserId();
  const { data, error } = await projectTable()
    .update({ name, data: serializePlanner(snapshot) as Json })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Project not found or access denied.");
}

/** Rename a project without touching its saved plan data. */
export async function renameProject(id: string, name: string): Promise<void> {
  const userId = await currentUserId();
  const { data, error } = await projectTable()
    .update({ name })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Project not found or access denied.");
}

/** Clone a project's saved plan into a new project row. Returns the new id. */
export async function duplicateProject(id: string): Promise<string> {
  const project = await loadProject(id);
  if (!project) throw new Error("Project not found or access denied.");
  return createProject(`Copy of ${project.name}`, project.snapshot);
}

/** Delete a project. */
export async function deleteProject(id: string): Promise<void> {
  const userId = await currentUserId();
  const { data, error } = await projectTable()
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Project not found or access denied.");
}
