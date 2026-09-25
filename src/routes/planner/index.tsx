import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarInput } from "@/components/planner/dollar-input";
import { Gantt, CriticalPathSummary } from "@/components/planner/gantt";
import { ScheduleDialog } from "@/components/planner/schedule-dialog";
import { CriticalIssueChecklist } from "@/components/planner/checklist";
import { ContactsAndSuppliers } from "@/components/planner/contacts";
import { CatalogDialog } from "@/components/planner/catalog-dialog";
import { DeliverableEditorDialog } from "@/components/planner/deliverable-editor-dialog";
import { MediaCalculatorDialog } from "@/components/planner/media-calculator-dialog";
import { RecommendDialog } from "@/components/planner/recommend-dialog";
import { usePlanner } from "@/components/planner/planner-provider";
import {
  BUYER_TYPE_LABELS,
  BUYER_TYPES,
  CATEGORY_LABELS,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
  UNIT_LABELS,
  checklistProgress,
  deliverableCosts,
  formatAud,
  formatAudWhole,
  formatPercent,
  parseDollarsToCents,
  toCents,
  toDollars,
  type Deliverable,
  type DeliverableCategory,
  type ProjectType,
} from "@/lib/planner";

const SECTIONS = [
  { id: "details", label: "Details" },
  { id: "budget", label: "Budget" },
  { id: "schedule", label: "Schedule" },
  { id: "checklist", label: "Checklist" },
  { id: "team", label: "Team" },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export const Route = createFileRoute("/planner/")({
  validateSearch: (search: Record<string, unknown>): { mediaBudget?: number } => {
    const mb = Number(search.mediaBudget);
    return Number.isFinite(mb) && mb > 0 ? { mediaBudget: mb } : {};
  },
  head: () => ({
    meta: [{ title: "New project plan - Project Planner" }],
  }),
  component: PlannerEditor,
});

function PlannerEditor() {
  const p = usePlanner();
  const { mediaBudget } = Route.useSearch();
  const applied = useRef(false);
  useEffect(() => {
    if (!applied.current && mediaBudget) {
      p.setMediaBudget(String(mediaBudget));
      applied.current = true;
    }
  }, [mediaBudget, p]);
  const overBudget = p.budget.varianceVsMediaBudgetCents > 0;
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const checklist = checklistProgress(p.checklist);
  const daysLate = p.launchDateObj
    ? differenceInCalendarDays(p.schedule.projectEnd, p.launchDateObj)
    : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <nav
        aria-label="Plan sections"
        className="sticky top-16 z-20 -mx-6 mb-6 flex gap-1 overflow-x-auto border-b bg-background/95 px-6 py-2 backdrop-blur"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(s.id);
            }}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatusTile
          tone={overBudget ? "bad" : "good"}
          label="Budget"
          value={
            overBudget
              ? `${formatAudWhole(p.budget.varianceVsMediaBudgetCents)} over`
              : `${formatAudWhole(-p.budget.varianceVsMediaBudgetCents)} under`
          }
          onClick={() => scrollToSection("budget")}
        />
        <StatusTile
          tone={daysLate === null ? "neutral" : daysLate > 0 ? "bad" : "good"}
          label="Schedule"
          value={
            daysLate === null
              ? "No launch date set"
              : daysLate > 0
                ? `${daysLate} days late`
                : daysLate === 0
                  ? "On time"
                  : `${Math.abs(daysLate)} days buffer`
          }
          onClick={() => scrollToSection("schedule")}
        />
        <StatusTile
          tone={checklist.openHigh > 0 ? "bad" : "good"}
          label="Checklist"
          value={
            checklist.openHigh > 0
              ? `${checklist.openHigh} high-priority open`
              : `${checklist.done} of ${checklist.total} reviewed`
          }
          onClick={() => scrollToSection("checklist")}
        />
      </div>

      <div id="details" className="grid scroll-mt-32 gap-6 lg:grid-cols-3">
        {/* Intake */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>
              These inputs drive the GRV, budget benchmark and recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Project name">
              <Input value={p.projectName} onChange={(e) => p.setProjectName(e.target.value)} />
            </Field>

            <Field label="Project type">
              <Select
                value={p.projectType}
                onValueChange={(v) => p.setProjectType(v as ProjectType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {PROJECT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={UNIT_LABELS[p.projectType]}>
              <Input
                type="number"
                min={1}
                value={p.units}
                onChange={(e) => p.setUnits(Math.max(0, Number(e.target.value)))}
              />
            </Field>

            <Field label="Gross realisation value (GRV)">
              <DollarInput value={p.grv} onChange={p.setGrv} />
            </Field>

            <Field label="Media budget">
              <div className="flex items-center gap-2">
                <DollarInput value={p.mediaBudget} onChange={p.setMediaBudget} />
                <MediaCalculatorDialog
                  initialSalesTarget={p.units}
                  initialPricePoint={p.financials.averageSellPriceCents / 100}
                  onApply={(dollars) => p.setMediaBudget(String(dollars))}
                />
              </div>
            </Field>

            <Field label="Launch date">
              <Input
                type="date"
                value={p.launchDate}
                onChange={(e) => p.setLaunchDate(e.target.value)}
              />
            </Field>

            <Field label="Collateral request lead time">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={p.standardCollectionBusinessDays}
                  onChange={(e) =>
                    p.setStandardCollectionBusinessDays(
                      Math.max(0, Math.min(365, Number(e.target.value))),
                    )
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  business days
                </span>
              </div>
            </Field>

            <Field label="Location">
              <Input
                placeholder="Suburb, state"
                value={p.location}
                onChange={(e) => p.setLocation(e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Label className="mb-2 block">Buyer type</Label>
              <ToggleRow
                options={BUYER_TYPES}
                labels={BUYER_TYPE_LABELS}
                selected={p.buyerTypes}
                onToggle={(v) => p.setBuyerTypes(toggle(p.buyerTypes, v))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial summary */}
        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Financials</CardTitle>
            <CardDescription>Calculated from your inputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Stat
              label="Gross Realisation Value (GRV)"
              value={formatAudWhole(p.financials.grvCents)}
              hint={
                p.units > 0 && p.financials.grvCents > 0
                  ? `About ${formatAudWhole(p.financials.averageSellPriceCents)} per lot, unit or home`
                  : "Enter the project's total expected sales value"
              }
              help={
                <HelpTip label="What is GRV?">
                  Total expected sales revenue for the project, as entered in the details. This is
                  the base figure every other budget percentage is measured against.
                </HelpTip>
              }
            />
            <Separator />
            <Stat
              label="Media budget"
              value={formatAudWhole(p.financials.mediaBudgetCents)}
              hint={`${formatPercent(p.financials.mediaBudgetPctOfGrv)} of GRV`}
              help={
                <HelpTip label="What is media budget?">
                  The target you set (or calculated with the media calculator) for total campaign
                  spend. Compare it against &ldquo;Planned spend&rdquo; below.
                </HelpTip>
              }
            />
            <Separator />
            <Stat
              label="Planned spend (deliverables)"
              value={formatAudWhole(p.budget.grandTotalCents)}
              hint={`${formatPercent(p.budget.totalPctOfGrv)} of GRV`}
              help={
                <HelpTip label="What is planned spend?">
                  What your itemised deliverables below currently add up to. Compared against your
                  media budget above in the banner underneath.
                </HelpTip>
              }
            />
            <div
              className={
                overBudget
                  ? "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  : "rounded-md bg-positive/10 px-3 py-2 text-sm text-positive"
              }
            >
              {overBudget
                ? `${formatAudWhole(p.budget.varianceVsMediaBudgetCents)} over media budget`
                : `${formatAudWhole(-p.budget.varianceVsMediaBudgetCents)} under media budget`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliverables & budget */}
      <Card id="budget" className="mt-6 scroll-mt-32">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Deliverables & budget</CardTitle>
            <CardDescription>
              Grouped by category. Adjust production and media costs; totals update live.
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <RecommendDialog />
            <CatalogDialog onAdd={(items) => p.setDeliverables((prev) => [...prev, ...items])} />
            <Button onClick={() => setJustAddedId(p.addDeliverable())} size="sm" variant="outline">
              <Plus className="mr-1 size-4" />
              Add custom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Deliverable</th>
                  <th className="w-40 py-2 px-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1">
                      Production
                      <HelpTip label="What is production cost?">
                        Printing, delivery, press or fulfilment cost per unit.
                      </HelpTip>
                    </span>
                  </th>
                  <th className="w-40 py-2 px-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1">
                      Media
                      <HelpTip label="What is media cost?">
                        Placement on Meta, Google, radio, TV, magazines or another platform.
                      </HelpTip>
                    </span>
                  </th>
                  <th className="w-32 py-2 px-2 text-right font-medium">Total</th>
                  <th className="w-10 py-2" />
                </tr>
              </thead>
              <tbody>
                {p.grouped.map(({ category, items }) => {
                  const cat = p.budget.categories.find((c) => c.category === category);
                  return (
                    <CategoryGroup
                      key={category}
                      category={category}
                      items={items}
                      subtotalCents={cat?.totalCents ?? 0}
                      allDeliverables={p.deliverables}
                      onUpdate={p.updateDeliverable}
                      onRemove={p.removeDeliverable}
                      justAddedId={justAddedId}
                      onJustAddedFocused={() => setJustAddedId(null)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-right text-xs text-muted-foreground">
            Grand total lines up with &ldquo;Planned spend (deliverables)&rdquo; in Financials
            above.
          </p>
        </CardContent>
      </Card>

      {/* Schedule & critical path */}
      <Card id="schedule" className="mt-6 scroll-mt-32">
        <CardHeader>
          <CardTitle>Marketing schedule & critical path</CardTitle>
          <CardDescription>
            Deliverables scheduled from their dependencies, lead times and recurrence. The critical
            path drives the earliest completion date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CriticalPathSummary schedule={p.schedule} launchDate={p.launchDateObj} />
          <Gantt schedule={p.schedule} launchDate={p.launchDateObj} />
        </CardContent>
      </Card>

      {/* Critical-issue checklist */}
      <Card id="checklist" className="mt-6 scroll-mt-32">
        <CardHeader>
          <CardTitle>Critical issues checklist</CardTitle>
          <CardDescription>
            Key risks and considerations to review and sign off before launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CriticalIssueChecklist items={p.checklist} onChange={p.setChecklist} />
        </CardContent>
      </Card>

      {/* Team & suppliers */}
      <Card id="team" className="mt-6 scroll-mt-32">
        <CardHeader>
          <CardTitle>Team & suppliers</CardTitle>
          <CardDescription>
            Build your directory, then allocate an owner and suppliers to each deliverable to plan
            delegation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactsAndSuppliers
            contacts={p.contacts}
            onContactsChange={p.setContacts}
            deliverables={p.deliverables}
            onUpdateDeliverable={p.updateDeliverable}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function CategoryGroup({
  category,
  items,
  subtotalCents,
  allDeliverables,
  onUpdate,
  onRemove,
  justAddedId,
  onJustAddedFocused,
}: {
  category: DeliverableCategory;
  items: Deliverable[];
  subtotalCents: number;
  allDeliverables: Deliverable[];
  onUpdate: (id: string, patch: Partial<Deliverable>) => void;
  onRemove: (id: string) => void;
  justAddedId?: string | null;
  onJustAddedFocused?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <tr className="bg-muted/50">
        <td colSpan={5} className="p-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 px-0 py-2 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            <ChevronDown
              className={`size-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
            />
            {CATEGORY_LABELS[category]}
            <span className="font-normal normal-case text-muted-foreground/70">
              ({items.length})
            </span>
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-1 pr-2 font-medium">Deliverable</th>
          <th className="w-40 py-1 px-2 text-right font-medium">Production</th>
          <th className="w-40 py-1 px-2 text-right font-medium">Media</th>
          <th className="w-32 py-1 px-2 text-right font-medium">Total</th>
          <th className="w-10 py-1" />
        </tr>
      )}
      {open &&
        items.map((d) => {
          const costs = deliverableCosts(d);
          return (
            <tr key={d.id} className="border-b">
              <td className="py-2 pr-2">
                <Input
                  value={d.name}
                  onChange={(e) => onUpdate(d.id, { name: e.target.value })}
                  className="h-8"
                  autoFocus={d.id === justAddedId}
                  onFocus={(e) => {
                    if (d.id === justAddedId) {
                      e.target.select();
                      onJustAddedFocused?.();
                    }
                  }}
                />
              </td>
              <td className="py-2 px-2 align-top">
                <CentsInput
                  cents={d.productionCostCents}
                  onChange={(cents) => onUpdate(d.id, { productionCostCents: cents })}
                />
                {costs.productionCents !== d.productionCostCents && (
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    = {formatAud(costs.productionCents)}
                  </p>
                )}
              </td>
              <td className="py-2 px-2 align-top">
                <CentsInput
                  cents={d.mediaCostCents}
                  onChange={(cents) => onUpdate(d.id, { mediaCostCents: cents })}
                />
                {costs.mediaCents !== d.mediaCostCents && (
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    = {formatAud(costs.mediaCents)}
                  </p>
                )}
              </td>
              <td className="py-2 px-2 text-right align-top tabular-nums">
                {formatAud(costs.totalCents)}
              </td>
              <td className="py-2 text-right">
                <div className="flex justify-end">
                  <DeliverableEditorDialog
                    deliverable={d}
                    allDeliverables={allDeliverables}
                    onSave={(patch) => onUpdate(d.id, patch)}
                    compact
                  />
                  <ScheduleDialog
                    deliverable={d}
                    allDeliverables={allDeliverables}
                    onSave={(patch) => onUpdate(d.id, patch)}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onRemove(d.id)}
                        aria-label="Remove deliverable"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                </div>
              </td>
            </tr>
          );
        })}
      <tr className="border-b text-muted-foreground">
        <td className="py-2 pr-2 text-right text-xs" colSpan={3}>
          {CATEGORY_LABELS[category]} subtotal
        </td>
        <td className="py-2 px-2 text-right text-xs font-medium tabular-nums">
          {formatAud(subtotalCents)}
        </td>
        <td />
      </tr>
    </>
  );
}

function CentsInput({ cents, onChange }: { cents: number; onChange: (cents: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        $
      </span>
      <Input
        type="number"
        min={0}
        value={toDollars(cents)}
        onChange={(e) => onChange(toCents(Math.max(0, Number(e.target.value))))}
        className="h-8 pl-5 text-right tabular-nums"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatusTile({
  tone,
  label,
  value,
  onClick,
}: {
  tone: "good" | "bad" | "neutral";
  label: string;
  value: string;
  onClick: () => void;
}) {
  const toneClass =
    tone === "bad"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : tone === "good"
        ? "border-positive/30 bg-positive/5 text-positive"
        : "border-border bg-muted/30 text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition-shadow hover:shadow-sm ${toneClass}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </button>
  );
}

function Stat({
  label,
  value,
  hint,
  help,
}: {
  label: string;
  value: string;
  hint?: string;
  help?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {label}
        {help}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function ToggleRow<T extends string>({
  options,
  labels,
  selected,
  onToggle,
}: {
  options: T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Button
            key={opt}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => onToggle(opt)}
          >
            {labels[opt]}
          </Button>
        );
      })}
    </div>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
