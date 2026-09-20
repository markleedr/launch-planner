import { useEffect, useMemo, useState } from "react";
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
  dependencyWouldCreateCycle,
  formatAud,
  setupTimeToBusinessDays,
  toCents,
  toDollars,
  type Deliverable,
  type SetupTimeUnit,
} from "@/lib/planner";
import { calculateProposalCost } from "@/lib/procurement";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "No recurrence" },
  { value: "monthly_full_bar", label: "Monthly - full active period" },
  { value: "monthly_second_thursday", label: "Monthly - second Thursday" },
  { value: "monthly_second_friday", label: "Monthly - second Friday" },
  { value: "monthly_third_monday", label: "Monthly - third Monday" },
] as const;

export function DeliverableEditorDialog({
  deliverable,
  allDeliverables,
  onSave,
  compact = false,
}: {
  deliverable: Deliverable;
  allDeliverables: Deliverable[];
  onSave: (patch: Partial<Deliverable>) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Deliverable>(deliverable);

  useEffect(() => {
    if (open) setDraft(deliverable);
  }, [deliverable, open]);

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
    setDraft((current) => ({ ...current, ...values }));
  }

  function save() {
    const setupTimeValue = Math.max(0, draft.setupTimeValue ?? draft.setupLeadDays);
    const setupTimeUnit = draft.setupTimeUnit ?? "business_days";
    onSave({
      ...draft,
      name: draft.name.trim() || "Untitled service",
      setupTimeValue,
      setupTimeUnit,
      setupLeadDays: setupTimeToBusinessDays(setupTimeValue, setupTimeUnit),
    });
    setOpen(false);
  }

  const dependencyId = draft.dependsOn?.[0] ?? "none";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "size-8" : undefined}
          aria-label={`Edit ${deliverable.name}`}
        >
          <Pencil className={compact ? "size-4" : "mr-1 size-4"} />
          {!compact ? "Edit service" : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit service</DialogTitle>
          <DialogDescription>Update service details, timing, pricing and rules.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <Field label="Service name *">
            <Input value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
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

          <section className="grid gap-3 border-t pt-5">
            <Label>Set-up time</Label>
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
            <p className="text-xs text-muted-foreground">
              Time required before this service can go live. Weeks are converted to five business
              days for scheduling.
            </p>
          </section>

          <section className="grid gap-3 border-t pt-5">
            <Field label="Collateral cutoff date">
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
            <p className="text-xs text-muted-foreground">
              Leave empty to use the deliverable&apos;s scheduled start date when proposals are
              issued.
            </p>
          </section>

          <CostSection title="Agency cost" hint="Design, creation, delivery and management.">
            <MoneyField
              label="One-off ($)"
              cents={draft.agencyCostCents ?? 0}
              onChange={(cents) => patch({ agencyCostCents: cents })}
            />
            <MoneyField
              label="Ongoing monthly ($/mo)"
              cents={draft.agencyMonthlyCostCents ?? 0}
              onChange={(cents) => patch({ agencyMonthlyCostCents: cents })}
            />
          </CostSection>

          <section className="grid gap-3 border-t pt-5">
            <Label>Third-party production cost ($/unit)</Label>
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
            <p className="text-xs text-muted-foreground">
              Printing, delivery, press, fulfilment or other external production.
            </p>
          </section>

          <CostSection
            title="Media cost"
            hint="Placement on a platform such as Meta, Google, radio, TV or magazine."
          >
            <MoneyField
              label="One-off ($)"
              cents={draft.mediaCostCents}
              disabled={draft.mediaCostLocked}
              onChange={(cents) => patch({ mediaCostCents: cents })}
            />
            <MoneyField
              label="Ongoing monthly ($/mo)"
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
            <Field label="Quantity">
              <Input
                type="number"
                min={0}
                value={draft.quantity ?? 1}
                onChange={(event) => patch({ quantity: Math.max(0, Number(event.target.value)) })}
              />
            </Field>
            <Field label="Months">
              <Input
                type="number"
                min={0}
                value={draft.months ?? 0}
                onChange={(event) => patch({ months: Math.max(0, Number(event.target.value)) })}
              />
            </Field>
          </div>

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
            <Field label="Linked dependency">
              <Select
                value={dependencyId}
                onValueChange={(value) => patch({ dependsOn: value === "none" ? [] : [value] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked dependency</SelectItem>
                  {allDeliverables
                    .filter((item) => item.id !== draft.id)
                    .map((item) => {
                      const createsCycle = dependencyWouldCreateCycle(allDeliverables, draft.id, [
                        item.id,
                      ]);
                      return (
                        <SelectItem key={item.id} value={item.id} disabled={createsCycle}>
                          {item.name}
                          {createsCycle ? " - creates a circular dependency" : ""}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
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

          <Field label="Dependency guidance">
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
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </section>
  );
}

function MoneyField({
  label,
  cents,
  disabled,
  onChange,
}: {
  label: string;
  cents: number;
  disabled?: boolean;
  onChange: (cents: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <MoneyInput cents={cents} disabled={disabled} onChange={onChange} />
      <span className="text-xs text-muted-foreground">{label}</span>
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

function dateInputValue(value?: Date): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
