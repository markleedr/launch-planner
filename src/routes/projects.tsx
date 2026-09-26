import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Plus, Building2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";
import { RequireSubscription } from "@/components/billing/require-subscription";
import { useSession } from "@/hooks/use-session";
import {
  deleteProject,
  duplicateProject,
  listProjects,
  renameProject,
  type ProjectRow,
} from "@/lib/project-store";
import { syncSubscription } from "@/lib/billing/billing.server";

export const Route = createFileRoute("/projects")({
  validateSearch: (s: Record<string, unknown>): { checkout?: "success" } =>
    s.checkout === "success" ? { checkout: "success" } : {},
  head: () => ({ meta: [{ title: "My projects - Project Planner" }] }),
  component: ProjectsRoute,
});

/** Finalise a Stripe checkout return before the subscription gate evaluates. */
function ProjectsRoute() {
  const navigate = useNavigate();
  const { checkout } = Route.useSearch();
  const [finalising, setFinalising] = useState(checkout === "success");

  useEffect(() => {
    if (checkout !== "success") return;
    let active = true;
    syncSubscription()
      .catch(() => {})
      .finally(() => {
        if (!active) return;
        navigate({ to: "/account", search: { onboarding: true }, replace: true });
        setFinalising(false);
      });
    return () => {
      active = false;
    };
  }, [checkout, navigate]);

  if (finalising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Finalising your subscription…</p>
      </div>
    );
  }

  return (
    <RequireSubscription>
      <ProjectsPage />
    </RequireSubscription>
  );
}

function ProjectsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSession();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    listProjects()
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load projects."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    refresh();
  }, [authLoading, user, navigate, refresh]);

  async function remove(id: string) {
    setBusyId(id);
    try {
      await deleteProject(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      await duplicateProject(id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not duplicate this project.");
    } finally {
      setBusyId(null);
    }
  }

  function startRename(row: ProjectRow) {
    setRenamingId(row.id);
    setRenameValue(row.name);
  }

  async function commitRename(id: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    const previous = rows;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
    try {
      await renameProject(id, name);
    } catch (e) {
      setRows(previous);
      setError(e instanceof Error ? e.message : "Could not rename this project.");
    }
  }

  return (
    <AppShell active="projects" title="My projects" showFooter>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Your workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">My projects</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open an existing launch plan or start a new project.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/planner/new" search={{ sample: "teneriffe" }}>
                <Building2 className="mr-1 size-4" />
                Teneriffe sample
              </Link>
            </Button>
            <Button asChild>
              <Link to="/planner/new">
                <Plus className="mr-1 size-4" />
                New project
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading your projects…
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No saved projects yet</CardTitle>
              <CardDescription>Start a plan, then use Save to keep it here.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/planner/new" search={{ sample: "teneriffe" }}>
                  <Building2 className="mr-1 size-4" />
                  Start Teneriffe sample
                </Link>
              </Button>
              <Button asChild>
                <Link to="/planner/new">
                  <Plus className="mr-1 size-4" />
                  New project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section aria-label="Saved projects">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {rows.length} saved {rows.length === 1 ? "project" : "projects"}
              </p>
              <FolderOpen className="size-5 text-muted-foreground" />
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <li key={r.id} className="flex">
                  <ProjectCard
                    project={r}
                    busy={busyId === r.id}
                    renaming={renamingId === r.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onRenameCommit={() => void commitRename(r.id)}
                    onRenameCancel={() => setRenamingId(null)}
                    onStartRename={() => startRename(r)}
                    onDuplicate={() => void duplicate(r.id)}
                    onDelete={() => void remove(r.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
