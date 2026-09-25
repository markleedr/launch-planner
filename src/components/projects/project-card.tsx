import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ProjectRow } from "@/lib/project-store";
import {
  formatAuDate,
  formatAudWhole,
  parseDollarsToCents,
  PROJECT_TYPE_LABELS,
  resolveHeroImage,
  UNIT_LABELS,
} from "@/lib/planner";

export function ProjectCard({
  project,
  busy,
  renaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onDuplicate,
  onDelete,
}: {
  project: ProjectRow;
  busy: boolean;
  renaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const hero = resolveHeroImage(project.heroImageId, project.heroImageUrl);
  const location = [project.suburb, project.state].filter(Boolean).join(", ");
  const grvCents = parseDollarsToCents(project.grv);
  const mediaBudgetCents = parseDollarsToCents(project.mediaBudget);
  const launchDate = project.launchDate ? new Date(`${project.launchDate}T00:00:00`) : null;
  const unitLabel = capitalise(UNIT_LABELS[project.projectType].replace(/^Number of /, ""));

  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <Link
        to="/planner"
        search={{ projectId: project.id }}
        className="relative block aspect-[16/8] bg-muted"
        aria-label={`Open ${project.name}`}
      >
        <img
          src={hero.src}
          alt={hero.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <Badge variant="secondary" className="absolute left-3 top-3 shadow-sm">
          {PROJECT_TYPE_LABELS[project.projectType]}
        </Badge>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <RenameField
                value={renameValue}
                onChange={onRenameChange}
                onCommit={onRenameCommit}
                onCancel={onRenameCancel}
              />
            ) : (
              <Link
                to="/planner"
                search={{ projectId: project.id }}
                className="block truncate text-base font-semibold hover:underline"
              >
                {project.name}
              </Link>
            )}
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {location || "Location not set"}
            </p>
          </div>

          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  disabled={busy}
                  aria-label={`More actions for ${project.name}`}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onStartRename}>
                  <Pencil className="mr-2 size-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>
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
                <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the project and everything in it, deliverables, proposals and
                  messages, and can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label={unitLabel} value={project.units > 0 ? String(project.units) : "Not set"} />
          <Fact label="GRV" value={grvCents > 0 ? formatAudWhole(grvCents) : "Not set"} />
          <Fact
            label="Media budget"
            value={mediaBudgetCents > 0 ? formatAudWhole(mediaBudgetCents) : "Not set"}
          />
          <Fact label="Launch" value={launchDate ? formatAuDate(launchDate) : "Not set"} />
        </dl>

        <p className="mt-auto text-xs text-muted-foreground">
          Updated {formatAuDate(new Date(project.updated_at))}
        </p>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
      className="h-8"
      aria-label="Project name"
    />
  );
}
