import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
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

            <Field label="Sell price (per unit)">
              <DollarInput value={p.sellPrice} onChange={p.setSellPrice} />
            </Field>

            <Field label="Media budget">
              <div className="flex items-center gap-2">
                <DollarInput value={p.mediaBudget} onChange={p.setMediaBudget} />
                <MediaCalculatorDialog
                  initialSalesTarget={p.units}
                  initialPricePoint={parseDollarsToCents(p.sellPrice) / 100}
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

            <div className="sm:col-span-2 flex justify-end">
              <RecommendDialog />
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
              hint={`${p.units} × ${formatAudWhole(parseDollarsToCents(p.sellPrice))}`}
            />
            <Separator />
            <Stat
              label="Media budget"
              value={formatAudWhole(p.financials.mediaBudgetCents)}
              hint={`${formatPercent(p.financials.mediaBudgetPctOfGrv)} of GRV`}
            />
            <Separator />
            <Stat
              label="Planned spend (deliverables)"
              value={formatAudWhole(p.budget.grandTotalCents)}
              hint={`${formatPercent(p.budget.totalPctOfGrv)} of GRV`}
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
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Deliverables & budget</CardTitle>
            <CardDescription>
              Grouped by category. Adjust production and media costs; totals update live.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <CatalogDialog onAdd={(items) => p.setDeliverables((prev) => [...prev, ...items])} />
            <Button onClick={p.addDeliverable} size="sm" variant="outline">
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
                  <th className="w-40 py-2 px-2 text-right font-medium">Production</th>
                  <th className="w-40 py-2 px-2 text-right font-medium">Media</th>
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
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 pr-2">Grand total</td>
                  <td className="py-3 px-2 text-right">
                    {formatAud(p.budget.productionTotalCents)}
                  </td>
                  <td className="py-3 px-2 text-right">{formatAud(p.budget.mediaTotalCents)}</td>
                  <td className="py-3 px-2 text-right">{formatAud(p.budget.grandTotalCents)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Schedule & critical path */}
      <Card className="mt-6">
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
      <Card className="mt-6">
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
      <Card className="mt-6">
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
}: {
  category: DeliverableCategory;
  items: Deliverable[];
  subtotalCents: number;
  allDeliverables: Deliverable[];
  onUpdate: (id: string, patch: Partial<Deliverable>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <tr className="bg-muted/50">
        <td
          colSpan={5}
          className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {CATEGORY_LABELS[category]}
        </td>
      </tr>
      <tr className="border-b text-left text-xs text-muted-foreground">
        <th className="py-1 pr-2 font-medium">Deliverable</th>
        <th className="w-40 py-1 px-2 text-right font-medium">Production</th>
        <th className="w-40 py-1 px-2 text-right font-medium">Media</th>
        <th className="w-32 py-1 px-2 text-right font-medium">Total</th>
        <th className="w-10 py-1" />
      </tr>
      {items.map((d) => {
        const costs = deliverableCosts(d);
        return (
          <tr key={d.id} className="border-b">
            <td className="py-2 pr-2">
              <Input
                value={d.name}
                onChange={(e) => onUpdate(d.id, { name: e.target.value })}
                className="h-8"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onRemove(d.id)}
                  aria-label="Remove deliverable"
                >
                  <Trash2 className="size-4" />
                </Button>
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

function DollarInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-6"
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
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
