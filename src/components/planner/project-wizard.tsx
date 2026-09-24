import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Plus,
  Send,
  SkipForward,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CatalogDialog } from "./catalog-dialog";
import { DeliverableEditorDialog } from "./deliverable-editor-dialog";
import { MediaCalculatorDialog } from "./media-calculator-dialog";
import {
  ContractorAssignmentBoard,
  type ContractorOption,
  type ExistingProposal,
} from "./contractor-assignment-board";
import { usePlanner } from "./planner-provider";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { createProject, updateProject } from "@/lib/project-store";
import {
  CATEGORY_LABELS,
  formatAud,
  formatAudWhole,
  HERO_IMAGE_LIBRARY,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  generateProjectBlurb,
  googleMapsUrl,
  mediaPlanToDeliverables,
  summariseBudget,
  type Deliverable,
  type ProjectType,
} from "@/lib/planner";
import {
  PROJECT_PARTY_ROLE_LABELS,
  PORTAL_CONTRACTOR_ROLES,
  PROJECT_PARTY_ROLES,
} from "@/lib/procurement/labels";
import type {
  PortalContractorSpecialty,
  ProjectPartyRole,
  ProposalStatus,
} from "@/lib/procurement";
import { calculateProposalCost, groupDeliverablesForContractors } from "@/lib/procurement";
import { prepareProjectHeroUpload } from "@/lib/planner/project-assets.server";
import {
  attachProjectParty,
  inviteContractors,
  saveDirectoryParty,
} from "@/lib/procurement/procurement.server";
import {
  listDirectoryParties,
  listOwnerProposals,
  listProjectParties,
} from "@/lib/procurement/procurement-store";

const STEPS = [
  { id: "details", label: "Project details" },
  { id: "deliverables", label: "Deliverables" },
  { id: "media", label: "Media plan" },
  { id: "parties", label: "Parties & contractors" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function ProjectWizard() {
  const p = usePlanner();
  const navigate = useNavigate();
  const { user } = useSession();
  const [step, setStep] = useState<StepId>("details");
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const currentIndex = STEPS.findIndex((item) => item.id === step);

  // PlannerProvider wraps the whole /planner/* layout, so currentProjectId
  // survives navigating here from an already-open project. Without this, the
  // wizard would silently edit that project instead of starting a new one.
  const resetOnMount = useRef(false);
  useLayoutEffect(() => {
    if (resetOnMount.current) return;
    resetOnMount.current = true;
    p.resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(): Promise<string | null> {
    if (!user) return null;
    setBusy(true);
    setSaveState("idle");
    try {
      const name = p.projectName.trim() || "Untitled project";
      if (p.currentProjectId) {
        await updateProject(p.currentProjectId, name, p.toSnapshot());
        setSaveState("saved");
        return p.currentProjectId;
      }
      const id = await createProject(name, p.toSnapshot());
      p.setCurrentProjectId(id);
      setSaveState("saved");
      return id;
    } catch {
      setSaveState("error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function go(nextIndex: number) {
    await persist();
    setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, nextIndex))].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish() {
    const id = await persist();
    navigate({
      to: "/planner",
      search: id ? { projectId: id } : {},
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">New project</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{STEPS[currentIndex].label}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Everything is optional. Skip a step now and return whenever you are ready.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Step {currentIndex + 1} of {STEPS.length}
            {saveState === "saved" && (
              <span className="ml-3 inline-flex items-center gap-1 text-foreground">
                <Check className="size-3.5" />
                Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="ml-3 text-destructive">Save will retry on the next step.</span>
            )}
          </div>
        </div>
        <Progress className="mt-4" value={((currentIndex + 1) / STEPS.length) * 100} />
        <div className="mt-3 hidden grid-cols-5 gap-2 md:grid">
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void go(index)}
              className={`rounded-md px-2 py-2 text-left text-xs transition-colors ${
                item.id === step
                  ? "border border-primary bg-accent font-semibold text-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {index + 1}. {item.label}
            </button>
          ))}
        </div>
        <div className="mt-3 md:hidden">
          <Select
            value={step}
            onValueChange={(value) => void go(STEPS.findIndex((s) => s.id === value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEPS.map((item, index) => (
                <SelectItem key={item.id} value={item.id}>
                  {index + 1}. {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {step === "details" && <DetailsStep />}
      {step === "deliverables" && <DeliverablesStep />}
      {step === "media" && <MediaStep />}
      {step === "parties" && <PartiesStep ensureProject={persist} />}
      {step === "review" && <ReviewStep />}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Button
          type="button"
          variant="outline"
          disabled={currentIndex === 0 || busy}
          onClick={() => void go(currentIndex - 1)}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {currentIndex < STEPS.length - 1 && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void go(currentIndex + 1)}
            >
              <SkipForward className="mr-1 size-4" />
              Skip for now
            </Button>
          )}
          {currentIndex < STEPS.length - 1 ? (
            <Button type="button" disabled={busy} onClick={() => void go(currentIndex + 1)}>
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Save & continue
              <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void finish()}>
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Open project planner
              <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function DetailsStep() {
  const p = usePlanner();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mapUrl = googleMapsUrl(p.address);

  function regenerateBlurb() {
    p.setProjectBlurb(
      generateProjectBlurb({
        name: p.projectName,
        projectType: p.projectType,
        units: p.units,
        address: p.address,
      }),
    );
  }

  async function uploadHero(file: File) {
    if (!p.currentProjectId) {
      setUploadError("Save this step first, then upload your own hero image.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const prepared = await prepareProjectHeroUpload({
        data: { projectId: p.currentProjectId, fileName: file.name },
      });
      const { error } = await supabase.storage
        .from("project-heroes")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type || "image/jpeg",
        });
      if (error) throw error;
      p.setHeroImageUrl(prepared.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload this image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            Start with what you know. Empty fields will simply be left out of the summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" className="sm:col-span-2">
            <Input
              value={p.projectName}
              onChange={(event) => p.setProjectName(event.target.value)}
            />
          </Field>
          <Field label="Project type">
            <Select
              value={p.projectType}
              onValueChange={(value) => p.setProjectType(value as ProjectType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PROJECT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Number of units">
            <Input
              type="number"
              min={0}
              value={p.units}
              onChange={(event) => p.setUnits(Math.max(0, Number(event.target.value)))}
            />
          </Field>
          <Field label="Sell price per unit ($)">
            <Input value={p.sellPrice} onChange={(event) => p.setSellPrice(event.target.value)} />
          </Field>
          <Field label="Media budget ($)">
            <Input
              value={p.mediaBudget}
              onChange={(event) => p.setMediaBudget(event.target.value)}
            />
          </Field>
          <Field label="Launch date">
            <Input
              type="date"
              value={p.launchDate}
              onChange={(event) => p.setLaunchDate(event.target.value)}
            />
          </Field>
          <Field label="Request collateral before deadline">
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={365}
                value={p.standardCollectionBusinessDays}
                onChange={(event) =>
                  p.setStandardCollectionBusinessDays(
                    Math.max(0, Math.min(365, Number(event.target.value))),
                  )
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                business days
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              We’ll request files and materials this many business days before they are due.
            </p>
          </Field>
          <Field label="Street address" className="sm:col-span-2">
            <Input
              value={p.address.street}
              onChange={(event) => p.setAddress({ ...p.address, street: event.target.value })}
            />
          </Field>
          <Field label="Suburb">
            <Input
              value={p.address.suburb}
              onChange={(event) => {
                p.setAddress({ ...p.address, suburb: event.target.value });
                p.setLocation(event.target.value);
              }}
            />
          </Field>
          <Field label="State">
            <Input
              value={p.address.state}
              onChange={(event) => p.setAddress({ ...p.address, state: event.target.value })}
            />
          </Field>
          <Field label="Postcode">
            <Input
              inputMode="numeric"
              value={p.address.postcode}
              onChange={(event) => p.setAddress({ ...p.address, postcode: event.target.value })}
            />
          </Field>
          <div className="flex items-end">
            {mapUrl ? (
              <Button asChild variant="outline" className="w-full">
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  <MapPin className="mr-1 size-4" />
                  Check location
                </a>
              </Button>
            ) : null}
          </div>
          <Field label="Project blurb" className="sm:col-span-2">
            <Textarea
              rows={5}
              value={p.projectBlurb}
              onChange={(event) => p.setProjectBlurb(event.target.value)}
            />
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto px-0"
              onClick={regenerateBlurb}
            >
              Regenerate placeholder copy
            </Button>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hero image</CardTitle>
          <CardDescription>
            Choose a built-in image now. Replace it with the project artwork at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {HERO_IMAGE_LIBRARY.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  p.setHeroImageId(image.id);
                  p.setHeroImageUrl("");
                }}
                className={`overflow-hidden rounded-lg border-2 text-left ${
                  p.heroImageId === image.id && !p.heroImageUrl
                    ? "border-foreground"
                    : "border-transparent"
                }`}
              >
                <img src={image.src} alt={image.alt} className="aspect-[3/1] w-full object-cover" />
                <span className="block px-2 py-1.5 text-xs font-medium">{image.name}</span>
              </button>
            ))}
          </div>
          <Label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed px-4 py-4 text-sm">
            {uploading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 size-4" />
            )}
            Upload replacement
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadHero(file);
              }}
            />
          </Label>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function DeliverablesStep() {
  const p = usePlanner();
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Deliverables</CardTitle>
            <CardDescription className="mt-1">
              Add proven templates or create a custom brief. Everything remains editable.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <CatalogDialog
              onAdd={(items) => p.setDeliverables((current) => [...current, ...items])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setJustAddedId(p.addDeliverable())}
            >
              <Plus className="mr-1 size-4" />
              Add from scratch
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {p.deliverables.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No deliverables yet"
            body="Skip this step or add the first item from the catalog."
          />
        ) : (
          <div className="space-y-6">
            {p.grouped.map(({ category, items }) => {
              const cat = p.budget.categories.find((c) => c.category === category);
              return (
                <div key={category}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {CATEGORY_LABELS[category]}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatAud(cat?.totalCents ?? 0)}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {items.map((deliverable) => (
                      <DeliverableBriefEditor
                        key={deliverable.id}
                        deliverable={deliverable}
                        allDeliverables={p.deliverables}
                        onChange={(patch) => p.updateDeliverable(deliverable.id, patch)}
                        onRemove={() => p.removeDeliverable(deliverable.id)}
                        justAdded={deliverable.id === justAddedId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatAud(p.budget.grandTotalCents)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliverableBriefEditor({
  deliverable,
  allDeliverables,
  onChange,
  onRemove,
  justAdded = false,
}: {
  deliverable: Deliverable;
  allDeliverables: Deliverable[];
  onChange: (patch: Partial<Deliverable>) => void;
  onRemove: () => void;
  justAdded?: boolean;
}) {
  const total = calculateProposalCost({
    notes: deliverable.notes ?? "",
    setupBusinessDays: deliverable.setupLeadDays,
    agencyOneOffCents: deliverable.agencyCostCents ?? 0,
    agencyMonthlyCents: deliverable.agencyMonthlyCostCents ?? 0,
    productionUnitCents: deliverable.productionCostCents,
    productionToBeConfirmed: deliverable.productionCostTbc ?? false,
    mediaOneOffCents: deliverable.mediaCostCents,
    mediaMonthlyCents: deliverable.mediaMonthlyCostCents ?? 0,
    quantity: deliverable.quantity ?? 1,
    months: deliverable.months ?? 0,
  });

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{deliverable.name}</h3>
          <Badge variant="secondary">{CATEGORY_LABELS[deliverable.category]}</Badge>
        </div>
        {deliverable.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {deliverable.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>
            Set-up: {deliverable.setupTimeValue ?? deliverable.setupLeadDays}{" "}
            {deliverable.setupTimeUnit === "weeks" ? "weeks" : "business days"}
          </span>
          <span>Total: {formatAud(total.totalCents)}</span>
          {(deliverable.agencyMonthlyCostCents ?? 0) + (deliverable.mediaMonthlyCostCents ?? 0) >
          0 ? (
            <span>Months: {deliverable.months ?? 0}</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <DeliverableEditorDialog
          deliverable={deliverable}
          allDeliverables={allDeliverables}
          onSave={onChange}
          defaultOpen={justAdded}
        />
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="size-4" />
          <span className="sr-only">Remove service</span>
        </Button>
      </div>
    </div>
  );
}

function MediaStep() {
  const p = usePlanner();
  const [applied, setApplied] = useState(false);

  // Total media spend already costed on the deliverables (one-off + monthly).
  const mediaTotalCents = summariseBudget(p.deliverables, {
    mediaBudgetCents: p.financials.mediaBudgetCents,
    grvCents: p.financials.grvCents,
  }).mediaTotalCents;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Calculate the media plan</CardTitle>
          <CardDescription>
            Work backwards from sales targets, then turn the approved channel mix into deliverables
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MediaCalculatorDialog
            initialSalesTarget={p.units}
            initialPricePoint={Number(p.sellPrice)}
            onApply={(budget, details) => {
              p.setMediaBudget(String(budget));
              const generated = mediaPlanToDeliverables(details.inputs, details.plan);
              p.setDeliverables((current) => [
                ...current.filter((item) => !item.id.startsWith("media-")),
                ...generated,
              ]);
              setApplied(true);
            }}
          />
          {applied && (
            <p className="mt-4 flex items-center gap-2 text-sm">
              <Check className="size-4" />
              Media budget and channel deliverables added to the project.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current media outcome</CardTitle>
          <CardDescription>
            Enter a media budget manually, or use the media spend already costed on your
            deliverables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="media-budget">Media budget ($)</Label>
            <Input
              id="media-budget"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="e.g. 300000"
              value={p.mediaBudget}
              onChange={(e) => p.setMediaBudget(e.target.value)}
            />
            <p className="pt-1 text-3xl font-bold">
              {p.financials.mediaBudgetCents
                ? formatAudWhole(p.financials.mediaBudgetCents)
                : "Not set"}
            </p>
          </div>

          {mediaTotalCents > 0 && mediaTotalCents !== parseInt(p.mediaBudget || "0", 10) * 100 && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Your deliverables now cost differently</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Media spend costed on deliverables: {formatAudWhole(mediaTotalCents)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 bg-background"
                onClick={() => p.setMediaBudget(String(Math.round(mediaTotalCents / 100)))}
              >
                Match media budget to this
              </Button>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Generated media deliverables</p>
            <p className="text-2xl font-semibold">
              {p.deliverables.filter((item) => item.id.startsWith("media-")).length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PartiesStep({ ensureProject }: { ensureProject: () => Promise<string | null> }) {
  const p = usePlanner();
  const [directory, setDirectory] = useState<Array<Record<string, unknown>>>([]);
  const [projectContractors, setProjectContractors] = useState<Array<Record<string, unknown>>>([]);
  const [proposalRows, setProposalRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    organisationName: "",
    representativeName: "",
    email: "",
    phone: "",
    website: "",
    role: "creative_agency" as ProjectPartyRole,
  });
  const [selectedAssignments, setSelectedAssignments] = useState<Record<string, string[]>>({});
  const [deadline, setDeadline] = useState("");
  const [inviting, setInviting] = useState(false);
  const [attachingPartyId, setAttachingPartyId] = useState<string | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(true);
  const directoryInitialized = useRef(false);

  async function refresh(projectId?: string | null) {
    try {
      setLoading(true);
      const [all, assigned, proposals] = await Promise.all([
        listDirectoryParties(),
        projectId ? listProjectParties(projectId) : Promise.resolve([]),
        projectId ? listOwnerProposals(projectId) : Promise.resolve([]),
      ]);
      setDirectory(all as Array<Record<string, unknown>>);
      const assignedRows = assigned as Array<Record<string, unknown>>;
      p.setProjectParties(
        assignedRows.map((row) => ({
          id: String(row.id),
          contactId: String(row.party_id),
          role: row.role as ProjectPartyRole,
        })),
      );
      setProjectContractors(
        assignedRows
          .map((row) => {
            const party = asRecord(row.party);
            return { ...party, project_role: row.role };
          })
          .filter((party) =>
            PORTAL_CONTRACTOR_ROLES.includes(party.project_role as PortalContractorSpecialty),
          ),
      );
      setProposalRows(proposals as Array<Record<string, unknown>>);
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn't load your contractor directory right now. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(p.currentProjectId);
    // The project id is intentionally the only refresh trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.currentProjectId]);

  // Collapse the directory to a one-line summary once contractors already
  // exist on this project, so returning here isn't a full directory-building
  // screen again. Only decide this once, right after the first load.
  useEffect(() => {
    if (loading || directoryInitialized.current) return;
    directoryInitialized.current = true;
    setDirectoryOpen(p.projectParties.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function addParty() {
    setError(null);
    const projectId = await ensureProject();
    if (!projectId) {
      setError("Sign in and save the project before adding reusable parties.");
      return;
    }
    try {
      const party = (await saveDirectoryParty({ data: form })) as unknown as Record<
        string,
        unknown
      >;
      await attachProjectParty({
        data: { projectId, partyId: String(party.id), role: form.role },
      });
      setForm({
        organisationName: "",
        representativeName: "",
        email: "",
        phone: "",
        website: "",
        role: "creative_agency",
      });
      await refresh(projectId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add this party.");
    }
  }

  async function addExistingParty(party: Record<string, unknown>) {
    const projectId = await ensureProject();
    if (!projectId) {
      setError("Sign in and save the project before adding contractors.");
      return;
    }
    const partyId = String(party.id);
    setAttachingPartyId(partyId);
    setError(null);
    try {
      await attachProjectParty({
        data: {
          projectId,
          partyId,
          role: party.role as ProjectPartyRole,
        },
      });
      await refresh(projectId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add this contractor.");
    } finally {
      setAttachingPartyId(null);
    }
  }

  const contractorOptions = useMemo<ContractorOption[]>(
    () =>
      projectContractors.map((party) => ({
        email: party.email ? String(party.email) : undefined,
        id: String(party.id),
        name: String(party.organisation_name),
        role: party.project_role as PortalContractorSpecialty,
      })),
    [projectContractors],
  );

  const assignmentGroups = useMemo(
    () =>
      groupDeliverablesForContractors(
        p.deliverables,
        contractorOptions.map((contractor) => contractor.role),
      ),
    [contractorOptions, p.deliverables],
  );

  const existingByDeliverable = useMemo(() => {
    const result = new Map<string, Map<string, ExistingProposal>>();
    for (const row of proposalRows) {
      const brief = asRecord(row.brief);
      const contractor = asRecord(row.contractor);
      const deliverableId = String(brief.deliverable_id ?? "");
      const contractorId = String(row.contractor_party_id ?? contractor.id ?? "");
      if (!deliverableId || !contractorId) continue;
      const byContractor = result.get(deliverableId) ?? new Map<string, ExistingProposal>();
      if (!byContractor.has(contractorId)) {
        byContractor.set(contractorId, {
          contractorId,
          status: row.status as ProposalStatus,
        });
      }
      result.set(deliverableId, byContractor);
    }
    return result;
  }, [proposalRows]);

  const selectedRequestCount = Object.values(selectedAssignments).reduce(
    (total, contractorIds) => total + contractorIds.length,
    0,
  );
  const selectedDeliverableCount = Object.values(selectedAssignments).filter(
    (contractorIds) => contractorIds.length > 0,
  ).length;
  const canInvite = selectedRequestCount > 0 && Boolean(deadline);

  function toggleAssignment(deliverableId: string, contractorId: string) {
    setSelectedAssignments((current) => {
      const selected = current[deliverableId] ?? [];
      const next = selected.includes(contractorId)
        ? selected.filter((id) => id !== contractorId)
        : [...selected, contractorId];
      return { ...current, [deliverableId]: next };
    });
  }

  async function invite() {
    const projectId = await ensureProject();
    if (!projectId || !canInvite) return;
    setInviting(true);
    setError(null);
    try {
      for (const [deliverableId, contractorPartyIds] of Object.entries(selectedAssignments)) {
        if (contractorPartyIds.length === 0) continue;
        const deliverable = p.deliverables.find((item) => item.id === deliverableId);
        if (!deliverable) continue;
        const scheduled = p.schedule.items.find((item) => item.id === deliverable.id);
        const collateralCutoff = deliverable.collateralCutoffDate ?? scheduled?.start;
        await inviteContractors({
          data: {
            projectId,
            deliverable: {
              id: deliverable.id,
              name: deliverable.name,
              description: deliverable.description ?? "",
              category: deliverable.category,
              requirements: deliverable.requirements ?? "",
              requiredFormats: deliverable.requiredFormats ?? [],
              collateralCutoffAt: collateralCutoff?.toISOString(),
              collectionLeadBusinessDays: p.standardCollectionBusinessDays,
            },
            contractorPartyIds,
            submissionDeadline: new Date(`${deadline}T17:00:00`).toISOString(),
            origin: window.location.origin,
          },
        });
      }
      setSelectedAssignments({});
      setDeadline("");
      await refresh(projectId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send invitations.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-lg border border-brand/35 bg-brand/10 p-4 text-sm">
        <Info className="mt-0.5 size-5 shrink-0 text-foreground" />
        <div>
          <p className="font-semibold">A price request does not assign the work.</p>
          <p className="mt-1 text-muted-foreground">
            Below, add or reuse contractors, then check a box against a deliverable to send that
            contractor a private price request. You can request competing prices from multiple
            contractors, then award one in Procurement.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          className={p.projectParties.length > 0 ? "cursor-pointer select-none" : undefined}
          onClick={p.projectParties.length > 0 ? () => setDirectoryOpen((v) => !v) : undefined}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Contractor directory</CardTitle>
              <CardDescription>
                {directoryOpen
                  ? "Reuse project parties and contractors across future projects. Only portal contractors receive account access."
                  : `${p.projectParties.length} ${p.projectParties.length === 1 ? "contractor" : "contractors"} in this project. Manage`}
              </CardDescription>
            </div>
            {p.projectParties.length > 0 && (
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${directoryOpen ? "" : "-rotate-90"}`}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className={`space-y-4 ${directoryOpen ? "" : "hidden"}`}>
          {loading ? <Loader2 className="size-5 animate-spin" /> : null}
          {directory.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {directory.map((party) => {
                const partyId = String(party.id);
                const added = p.projectParties.some(
                  (projectParty) => projectParty.contactId === partyId,
                );
                return (
                  <div key={partyId} className="rounded-md border p-3">
                    <p className="font-medium">{String(party.organisation_name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {PROJECT_PARTY_ROLE_LABELS[party.role as ProjectPartyRole]}
                    </p>
                    {party.representative_name ? (
                      <p className="mt-2 text-sm">{String(party.representative_name)}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {party.portal_enabled ? (
                        <Badge variant="secondary">Portal contractor</Badge>
                      ) : null}
                      {added ? (
                        <Badge>
                          <Check className="mr-1 size-3.5" />
                          Added to project
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={attachingPartyId === partyId}
                          onClick={() => void addExistingParty(party)}
                        >
                          {attachingPartyId === partyId ? (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                          ) : (
                            <Plus className="mr-1 size-3.5" />
                          )}
                          Add to project
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Organisation">
              <Input
                value={form.organisationName}
                onChange={(event) => setForm({ ...form, organisationName: event.target.value })}
              />
            </Field>
            <Field label="Representative">
              <Input
                value={form.representativeName}
                onChange={(event) => setForm({ ...form, representativeName: event.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onValueChange={(value) => setForm({ ...form, role: value as ProjectPartyRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_PARTY_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {PROJECT_PARTY_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button
                type="button"
                onClick={() => void addParty()}
                disabled={!form.organisationName.trim()}
              >
                <Plus className="mr-1 size-4" />
                Add to project and directory
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choose who will quote each deliverable</CardTitle>
          <CardDescription>
            Deliverables are grouped by the contractor specialties added to this project. Select one
            or more contractors against each output.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_280px] sm:items-end">
            <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
              <span className="font-semibold">{selectedDeliverableCount}</span>{" "}
              {selectedDeliverableCount === 1 ? "deliverable" : "deliverables"} selected ·{" "}
              <span className="font-semibold">{selectedRequestCount}</span>{" "}
              {selectedRequestCount === 1 ? "price request" : "price requests"}
            </div>
            <Field label="Submission deadline">
              <Input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </Field>
          </div>

          <ContractorAssignmentBoard
            contractors={contractorOptions}
            existingByDeliverable={existingByDeliverable}
            groups={assignmentGroups}
            selectedByDeliverable={selectedAssignments}
            onToggle={toggleAssignment}
          />

          <Button type="button" disabled={!canInvite || inviting} onClick={() => void invite()}>
            {inviting ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Send className="mr-1 size-4" />
            )}
            {selectedRequestCount > 0
              ? `Send ${selectedRequestCount} price request${selectedRequestCount === 1 ? "" : "s"}`
              : "Select deliverables and contractors"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function ReviewStep() {
  const p = usePlanner();
  const mapUrl = googleMapsUrl(p.address);
  const sections = useMemo(
    () => [
      { label: "Project details", value: p.projectName || "Not supplied" },
      { label: "Deliverables", value: `${p.deliverables.length}` },
      {
        label: "Media budget",
        value: p.mediaBudget ? `$${Number(p.mediaBudget).toLocaleString("en-AU")}` : "Not supplied",
      },
      { label: "Project parties", value: `${p.projectParties.length}` },
    ],
    [p.deliverables.length, p.mediaBudget, p.projectName, p.projectParties.length],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Ready to plan</CardTitle>
          <CardDescription>
            Your project remains editable after the wizard. Missing information is omitted from
            client-facing output.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {sections.map((item) => (
            <div key={item.label} className="rounded-md border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-semibold">{item.value}</p>
            </div>
          ))}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border p-4 text-sm hover:bg-muted sm:col-span-2"
            >
              <MapPin className="size-4" />
              Location is ready for the summary map
            </a>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>What happens next</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {[
              "Refine costs, dates and dependencies in the project planner.",
              "Review private contractor proposals and award each deliverable.",
              "Track messages, collateral requests and approvals.",
              "Share or export the approved client-facing summary.",
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm">{item}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <Icon className="size-7 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
