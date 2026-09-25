import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_LABELS,
  dateInputValue,
  dependencyWouldCreateCycle,
  formatAud,
  setupTimeToBusinessDays,
  toCents,
  toDollars,
  type Deliverable,
  type SetupTimeUnit,
} from "@/lib/planner";
import { calculateProposalCost } from "@/lib/procurement";
import { usePlannerOptional } from "./planner-provider";
import { usePersistentDialog } from "./use-persistent-dialog";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "No recurrence" },
  { value: "monthly_full_bar", label: "Monthly - full active period" },
  { value: "monthly_second_thursday", label: "Monthly - second Thursday" },
  { value: "monthly_second_friday", label: "Monthly - second Friday" },
  { value: "monthly_third_monday", label: "Monthly - third Monday" },
] as const;

type TimingMode = "lead_time" | "due_date" | "both";

const TIMING_OPTIONS: { value: TimingMode; label: string; description: string }[] = [
  {
    value: "lead_time",
    label: "Lead time",
    description:
      "The contractor needs a set period to deliver a standard item. The schedule works back from your launch date using it.",
  },
  {
    value: "due_date",
    label: "Fixed due date",
    description:
      "The contractor doesn't work to a standard turnaround, so you set the date everything must be delivered by.",
  },
  {
    value: "both",
    label: "Both",
    description: "Schedule with the lead time and also hold the contractor to a fixed date.",
  },
];

/** "1 × EDM, every month for 12 months" or "6 × Hero Render, one-off". */
function describeCadence(deliverable: Deliverable): string {
  const quantity = deliverable.quantity ?? 1;
  const months = deliverable.months ?? 0;
  const name = deliverable.name.trim() || "item";
  const cadence =
    months > 0 ? `every month for ${months} ${months === 1 ? "month" : "months"}` : "one-off";
  return `${quantity} × ${name}, ${cadence}`;
}

function timingModeOf(deliverable: Deliverable): TimingMode {
  const hasDueDate = Boolean(deliverable.collateralCutoffDate);
  const hasLeadTime = (deliverable.setupTimeValue ?? deliverable.setupLeadDays) > 0;
  if (hasDueDate && hasLeadTime) return "both";
  if (hasDueDate) return "due_date";
  return "lead_time";
}

export function DeliverableEditorDialog({
  deliverable,
  allDeliverables,
  onSave,
  compact = false,
  defaultOpen = false,
}: {
  deliverable: Deliverable;
  allDeliverables: Deliverable[];
  onSave: (patch: Partial<Deliverable>) => void;
  compact?: boolean;
  defaultOpen?: boolean;
}) {
  const dialogKey = `edit:${deliverable.id}`;
  const planner = usePlannerOptional();
  const [open, setOpen] = usePersistentDialog(dialogKey, { defaultOpen });
  const [draft, setDraft] = useState<Deliverable>(deliverable);
  const [timing, setTiming] = useState<TimingMode>(() => timingModeOf(deliverable));
  const [nameTouched, setNameTouched] = useState(false);
  const nameError = nameTouched && !draft.name.trim() ? "Service name is required." : null;

  // Unsaved edits live in the planner while the dialog is open, so coming back
  // to this tab restores them.
  const savedDraft = planner?.dialogState[dialogKey] as Deliverable | undefined;
  const savedDraftRef = useRef(savedDraft);
  savedDraftRef.current = savedDraft;

  useEffect(() => {
    if (!open) return;
    const saved = savedDraftRef.current;
    const start = saved && saved.id === deliverable.id ? saved : deliverable;
    setDraft(start);
    setTiming(timingModeOf(start));
    setNameTouched(false);
  }, [deliverable, open]);

  function handleOpenChange(next: boolean) {
    if (!next) planner?.setDialogValue(dialogKey, undefined);
    setOpen(next);
  }

  // Values for the hidden option are kept until save, so switching back restores them.
  function changeTiming(next: TimingMode) {
    setTiming(next);
  }

  const total = useMemo(
    () =>
      calculateProposalCost({
        notes: draft.notes ?? "",
        setupBusinessDays: draft.setupLeadDays,
        agencyOneOffCents: draft.agencyCostCents ?? 0,
        agencyMonthlyCents: draft.agencyMonthlyCostCents ?? 0,
        productionUnitCents: draft.productionCostCents,
        productionToBeConfirmed: draft.productionCostTbc ?? false,
        mediaOneOffCents: draft.mediaCostCents,
        mediaMonthlyCents: draft.mediaMonthlyCostCents ?? 0,
        quantity: draft.quantity ?? 1,
        months: draft.months ?? 0,
      }),
    [draft],
  );

  function patch(values: Partial<Deliverable>) {
    const next = { ...draft, ...values };
    setDraft(next);
    planner?.setDialogValue(dialogKey, next);
  }

  function save() {
    const setupTimeValue =
      timing === "due_date" ? 0 : Math.max(0, draft.setupTimeValue ?? draft.setupLeadDays);
    const setupTimeUnit = draft.setupTimeUnit ?? "business_days";
    onSave({
      ...draft,
      name: draft.name.trim() || "Untitled service",
      collateralCutoffDate: timing === "lead_time" ? undefined : draft.collateralCutoffDate,
      setupTimeValue,
      setupTimeUnit,
      setupLeadDays: setupTimeToBusinessDays(setupTimeValue, setupTimeUnit),
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit ${deliverable.name}`}
              >
                <Pencil className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" aria-label={`Edit ${deliverable.name}`}>
            <Pencil className="mr-1 size-4" />
            Edit service
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit service</DialogTitle>
          <DialogDescription>Update service details, timing, pricing and rules.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <Field label="Service name *">
            <Input
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              onBlur={() => setNameTouched(true)}
              aria-invalid={Boolean(nameError)}
              className={nameError ? "border-destructive" : undefined}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </Field>

          <Field label="Description">
            <Textarea
              rows={6}
              value={draft.description ?? ""}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={draft.category}
                onValueChange={(value) => patch({ category: value as Deliverable["category"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Required file formats">
              <Input
                placeholder="PDF, source files, print-ready artwork"
                value={(draft.requiredFormats ?? []).join(", ")}
                onChange={(event) =>
                  patch({
                    requiredFormats: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>

          <Field label="Requirements">
            <Textarea
              rows={3}
              value={draft.requirements ?? ""}
              onChange={(event) => patch({ requirements: event.target.value })}
            />
          </Field>

          <Field label="Notes">
            <Textarea
              rows={3}
              value={draft.notes ?? ""}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </Field>

          <section className="grid gap-4 border-t pt-5">
            <div>
              <Label>Timing</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose how the deadline for this deliverable is set.
              </p>
            </div>
            <RadioGroup
              value={timing}
              onValueChange={(value) => changeTiming(value as TimingMode)}
              className="gap-3"
            >
              {TIMING_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start gap-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`timing-${option.value}`}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`timing-${option.value}`}
                    className="grid cursor-pointer gap-0.5 font-normal leading-snug"
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {timing !== "due_date" ? (
              <Field label="Time needed">
                <p className="text-xs text-muted-foreground">
                  Time the contractor needs before this can go live. Weeks count as five business
                  days for scheduling.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="number"
                    min={0}
                    value={draft.setupTimeValue ?? draft.setupLeadDays}
                    onChange={(event) =>
                      patch({ setupTimeValue: Math.max(0, Number(event.target.value)) })
                    }
                  />
                  <Select
                    value={draft.setupTimeUnit ?? "business_days"}
                    onValueChange={(value) => patch({ setupTimeUnit: value as SetupTimeUnit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business_days">business days</SelectItem>
                      <SelectItem value="weeks">weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Field>
            ) : null}

            {timing !== "lead_time" ? (
              <Field label="Due date">
                <p className="text-xs text-muted-foreground">
                  Everything is due by 5:00pm on this date. Contractor requests use it as the
                  collateral deadline.
                </p>
                <Input
                  type="date"
                  value={dateInputValue(draft.collateralCutoffDate)}
                  onChange={(event) =>
                    patch({
                      collateralCutoffDate: event.target.value
                        ? new Date(`${event.target.value}T17:00:00`)
                        : undefined,
                    })
                  }
                />
              </Field>
            ) : null}
          </section>

          <CostSection
            title="Agency cost"
            hint="What the agency charges for this service, split by how it is billed."
          >
            <MoneyField
              label="One-off / set up ($)"
              hint="Charged once: creative, design or producing the output."
              cents={draft.agencyCostCents ?? 0}
              onChange={(cents) => patch({ agencyCostCents: cents })}
            />
            <MoneyField
              label="Management per month"
              hint="Charged every month: management, retainer or monitoring."
              cents={draft.agencyMonthlyCostCents ?? 0}
              onChange={(cents) => patch({ agencyMonthlyCostCents: cents })}
            />
          </CostSection>

          <section className="grid gap-3 border-t pt-5">
            <Label>Production ($/unit)</Label>
            <p className="-mt-1.5 text-xs text-muted-foreground">
              Printing, delivery, press, fulfilment or other external production.
            </p>
            <MoneyInput
              cents={draft.productionCostCents}
              disabled={draft.productionCostTbc}
              onChange={(cents) => patch({ productionCostCents: cents })}
            />
            <CheckRow
              checked={draft.productionCostTbc ?? false}
              onCheckedChange={(checked) => patch({ productionCostTbc: checked })}
              label="To be confirmed (counts as $0 until set)"
            />
          </section>

          <CostSection
            title="Media cost"
            hint="Placement on a platform such as Meta, Google, radio, TV or magazine."
          >
            <MoneyField
              label="One-off ($)"
              hint="A single insertion or one-time media cost, such as one billboard booking or one press ad."
              cents={draft.mediaCostCents}
              disabled={draft.mediaCostLocked}
              onChange={(cents) => patch({ mediaCostCents: cents })}
            />
            <MoneyField
              label="Monthly ($ per month)"
              hint="Media bought month by month, such as ongoing Meta or Google spend or a monthly placement."
              cents={draft.mediaMonthlyCostCents ?? 0}
              disabled={draft.mediaCostLocked}
              onChange={(cents) => patch({ mediaMonthlyCostCents: cents })}
            />
            <div className="grid gap-2 sm:col-span-2">
              <CheckRow
                checked={draft.mediaCostEditable ?? false}
                disabled={draft.mediaCostLocked}
                onCheckedChange={(checked) => patch({ mediaCostEditable: checked })}
                label="Media allowance is editable"
              />
              <CheckRow
                checked={draft.mediaCostLocked ?? false}
                onCheckedChange={(checked) =>
                  patch({
                    mediaCostLocked: checked,
                    mediaCostEditable: checked ? false : draft.mediaCostEditable,
                  })
                }
                label="Lock the supplied media rate"
              />
            </div>
          </CostSection>

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
            <Field label="How many">
              <p className="text-xs text-muted-foreground">
                Number of these you need, for example 6 renders or 1 EDM. Multiplies the production
                cost per unit.
              </p>
              <Input
                type="number"
                min={0}
                value={draft.quantity ?? 1}
                onChange={(event) => patch({ quantity: Math.max(0, Number(event.target.value)) })}
              />
            </Field>
            <Field label="For how many months">
              <p className="text-xs text-muted-foreground">
                How many months it repeats, for example 12 for a monthly EDM. Leave at 0 for a
                one-off. Multiplies the monthly agency and media costs.
              </p>
              <Input
                type="number"
                min={0}
                value={draft.months ?? 0}
                onChange={(event) => patch({ months: Math.max(0, Number(event.target.value)) })}
              />
            </Field>
            <p className="rounded-md bg-muted px-3 py-2 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Reads as: </span>
              <span className="font-medium">{describeCadence(draft)}</span>
            </p>
          </div>

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
            <Field label="Must be finished first">
              <p className="text-xs text-muted-foreground">
                Pick anything this one can&apos;t start without, for example the brand before the
                website. You can pick more than one. The schedule and critical path follow it.
              </p>
              <DependencyPicker
                allDeliverables={allDeliverables}
                currentId={draft.id}
                selectedIds={draft.dependsOn ?? []}
                onChange={(ids) => patch({ dependsOn: ids })}
              />
            </Field>
            <Field label="Recurrence pattern">
              <Select
                value={draft.recurrencePattern || "none"}
                onValueChange={(value) =>
                  patch({
                    recurrencePattern: value === "none" ? "" : value,
                    recurrence: value === "none" ? undefined : { freq: "monthly", interval: 1 },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Dependency notes (private)">
            <p className="text-xs text-muted-foreground">
              A reminder for yourself about this dependency, for example what exactly to wait for.
              Only visible here, not shown to contractors or anywhere else in the app.
            </p>
            <Textarea
              rows={2}
              value={draft.dependencyNotes ?? ""}
              onChange={(event) => patch({ dependencyNotes: event.target.value })}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-4">
            <span className="font-semibold">Calculated total cost</span>
            <span className="text-xl font-bold tabular-nums">{formatAud(total.totalCents)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// Milestones outside the marketing plan (construction/development stages)
// that a deliverable can still be blocked on. Not real deliverables: they
// have no dates and computeCpm() safely ignores unknown ids, so they never
// affect the schedule or critical path - just a "waiting on" flag.
const EXTERNAL_MILESTONES: Array<{ id: string; label: string }> = [
  { id: "external:plans", label: "Plans" },
  { id: "external:fits_and_finishes", label: "Fits and finishes" },
];

function DependencyPicker({
  allDeliverables,
  currentId,
  selectedIds,
  onChange,
}: {
  allDeliverables: Deliverable[];
  currentId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const deliverableOptions = allDeliverables.filter((item) => item.id !== currentId);
  const nameById = new Map<string, string>([
    ...deliverableOptions.map((item) => [item.id, item.name] as const),
    ...EXTERNAL_MILESTONES.map((item) => [item.id, item.label] as const),
  ]);
  const selectedNames = selectedIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name));

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          {selectedNames.length === 0
            ? "Nothing, it can start straight away"
            : selectedNames.join(", ")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="grid gap-1 border-b pb-1">
          {EXTERNAL_MILESTONES.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(item.id)} />
                {item.label}
                <span className="text-xs text-muted-foreground">External milestone</span>
              </label>
            );
          })}
        </div>
        {deliverableOptions.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            No other deliverables to depend on yet.
          </p>
        ) : (
          <div className="grid gap-1 pt-1">
            {deliverableOptions.map((item) => {
              const checked = selectedIds.includes(item.id);
              const createsCycle =
                !checked &&
                dependencyWouldCreateCycle(allDeliverables, currentId, [...selectedIds, item.id]);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 rounded px-1 py-1 text-sm ${
                    createsCycle
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:bg-accent"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={createsCycle}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  {item.name}
                  {createsCycle ? (
                    <span className="text-xs text-muted-foreground">(circular)</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CostSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t pt-5">
      <Label>{title}</Label>
      <p className="-mt-1.5 text-xs text-muted-foreground">{hint}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function MoneyField({
  label,
  hint,
  cents,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  cents: number;
  disabled?: boolean;
  onChange: (cents: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <span className="-mt-1 text-xs text-muted-foreground">{hint}</span>
      <MoneyInput cents={cents} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function MoneyInput({
  cents,
  disabled,
  onChange,
}: {
  cents: number;
  disabled?: boolean;
  onChange: (cents: number) => void;
}) {
  return (
    <Input
      type="number"
      min={0}
      step="0.01"
      disabled={disabled}
      value={toDollars(cents)}
      onChange={(event) => onChange(toCents(Math.max(0, Number(event.target.value))))}
    />
  );
}

function CheckRow({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-center gap-2 font-normal">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      {label}
    </Label>
  );
}
