import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireSubscription } from "@/components/billing/require-subscription";
import { useSession } from "@/hooks/use-session";
import { deleteProject, listProjects, type ProjectRow } from "@/lib/project-store";
import { syncSubscription } from "@/lib/billing/billing.server";
import { formatAuDate } from "@/lib/planner";

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
    try {
      await deleteProject(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
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
          <Button asChild>
            <Link to="/planner/new">
              <Plus className="mr-1 size-4" />
              New project
            </Link>
          </Button>
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
            <CardContent>
              <Button asChild>
                <Link to="/planner/new">
                  <Plus className="mr-1 size-4" />
                  New project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/25 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Saved projects</CardTitle>
                  <CardDescription>
                    {rows.length} {rows.length === 1 ? "project" : "projects"}
                  </CardDescription>
                </div>
                <FolderOpen className="size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/35 sm:px-5"
                  >
                    <Link to="/planner" search={{ projectId: r.id }} className="min-w-0 flex-1">
                      <div className="truncate font-medium group-hover:underline">{r.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Updated {formatAuDate(new Date(r.updated_at))}
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(r.id)}
                      aria-label={`Delete ${r.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
