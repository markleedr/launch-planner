import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, ImagePlus, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { HeroUploadButton } from "@/components/planner/hero-upload-button";
import type { ProjectRow } from "@/lib/project-store";
import { heroImageFileError, uploadProjectHero } from "@/lib/planner/hero-upload";
import {
  formatAuDate,
  formatAudWhole,
  HERO_IMAGE_LIBRARY,
  parseDollarsToCents,
  PROJECT_TYPE_LABELS,
  resolveHeroImage,
  UNIT_LABELS,
} from "@/lib/planner";

export type ProjectCover = { heroImageId: string; heroImageUrl: string };

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
  onChangeCover,
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
  onChangeCover: (cover: ProjectCover) => Promise<void>;
}) {
  const [coverOpen, setCoverOpen] = useState(false);
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
                <DropdownMenuItem
                  onSelect={() => {
                    window.setTimeout(() => setCoverOpen(true), 0);
                  }}
                >
                  <ImagePlus className="mr-2 size-4" />
                  Change cover
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
                  This permanently deletes the project, including its deliverables, schedule and
                  saved details. This can&apos;t be undone.
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
          <CoverDialog
            open={coverOpen}
            project={project}
            onOpenChange={setCoverOpen}
            onChangeCover={onChangeCover}
          />
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

function CoverDialog({
  open,
  project,
  onOpenChange,
  onChangeCover,
}: {
  open: boolean;
  project: ProjectRow;
  onOpenChange: (open: boolean) => void;
  onChangeCover: (cover: ProjectCover) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const savingRef = useRef(false);
  const usingUpload = Boolean(project.heroImageUrl);

  async function apply(cover: ProjectCover) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await onChangeCover(cover);
      setNotice("Cover updated. It also shows on the project summary.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not change this cover.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function upload(file: File) {
    if (savingRef.current) return;
    const problem = heroImageFileError(file);
    if (problem) {
      setError(problem);
      setNotice(null);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const publicUrl = await uploadProjectHero(project.id, file);
      await onChangeCover({ heroImageId: project.heroImageId, heroImageUrl: publicUrl });
      setNotice("Cover updated. It also shows on the project and the summary.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload this image.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (!next) {
          setError(null);
          setNotice(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change cover</DialogTitle>
          <DialogDescription>
            This image shows on the project card and in the summary. Pick a built-in image, or
            upload your own.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {usingUpload ? (
            <div className="overflow-hidden rounded-lg border-2 border-foreground sm:col-span-2">
              <img
                src={project.heroImageUrl}
                alt="Current cover"
                className="aspect-[3/1] w-full object-cover"
              />
              <span className="block px-2 py-1.5 text-xs font-medium">Your image</span>
            </div>
          ) : null}
          {HERO_IMAGE_LIBRARY.map((image) => {
            const selected = !usingUpload && project.heroImageId === image.id;
            return (
              <button
                key={image.id}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => {
                  if (selected) return;
                  void apply({ heroImageId: image.id, heroImageUrl: "" });
                }}
                className={`overflow-hidden rounded-lg border-2 text-left disabled:opacity-60 ${
                  selected ? "border-foreground" : "border-transparent"
                }`}
              >
                <img src={image.src} alt={image.alt} className="aspect-[3/1] w-full object-cover" />
                <span className="block px-2 py-1.5 text-xs font-medium">{image.name}</span>
              </button>
            );
          })}
        </div>
        <HeroUploadButton label="Upload image" busy={saving} onFile={(file) => void upload(file)} />
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 10 MB.</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-positive">{notice}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
