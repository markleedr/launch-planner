import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, FolderOpen, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
                    {renamingId === r.id ? (
                      <RenameField
                        value={renameValue}
                        onChange={setRenameValue}
                        onCommit={() => void commitRename(r.id)}
                        onCancel={() => setRenamingId(null)}
                      />
                    ) : (
                      <Link to="/planner" search={{ projectId: r.id }} className="min-w-0 flex-1">
                        <div className="truncate font-medium group-hover:underline">{r.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Updated {formatAuDate(new Date(r.updated_at))}
                        </div>
                      </Link>
                    )}
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0 text-muted-foreground"
                            disabled={busyId === r.id}
                            aria-label={`More actions for ${r.name}`}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => startRename(r)}>
                            <Pencil className="mr-2 size-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void duplicate(r.id)}>
                            <Copy className="mr-2 size-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{r.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the project and everything in it, deliverables, proposals
                            and messages, and can&apos;t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void remove(r.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

function RenameField({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      autoFocus
      className="min-w-0 flex-1"
      aria-label="Project name"
    />
  );
}
