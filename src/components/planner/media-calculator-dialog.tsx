import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { HelpTip } from "@/components/ui/help-tip";
import { usePersistentDialog } from "@/components/planner/use-persistent-dialog";
import {
  computeMediaPlan,
  DEFAULT_MEDIA_INPUTS,
  formatAudWhole,
  MEDIA_CHANNELS,
  toCents,
  type MediaCalcInputs,
  type MediaChannelKey,
  type MediaPlan,
} from "@/lib/planner";

const fmt = (dollars: number) => formatAudWhole(toCents(dollars));

/** Media spend calculator - works backwards from a sales target to the media
 *  budget required, then applies it to the project. */
export function MediaCalculatorDialog({
  initialSalesTarget,
  initialPricePoint,
  onApply,
}: {
  initialSalesTarget?: number;
  initialPricePoint?: number;
  onApply: (
    totalBudgetDollars: number,
    details: { inputs: MediaCalcInputs; plan: MediaPlan },
  ) => void;
}) {
  const [inputs, setInputs] = useState<MediaCalcInputs>(DEFAULT_MEDIA_INPUTS);
  const [open, setOpen] = usePersistentDialog("media-calc", {
    onOpen: () =>
      setInputs({
        ...DEFAULT_MEDIA_INPUTS,
        salesTarget:
          initialSalesTarget && initialSalesTarget > 0
            ? initialSalesTarget
            : DEFAULT_MEDIA_INPUTS.salesTarget,
        pricePoint:
          initialPricePoint && initialPricePoint > 0
            ? initialPricePoint
            : DEFAULT_MEDIA_INPUTS.pricePoint,
      }),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  const plan = useMemo(() => computeMediaPlan(inputs), [inputs]);

  function setField<K extends keyof MediaCalcInputs>(key: K, value: MediaCalcInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }
  function setChannel(
    key: MediaChannelKey,
    patch: Partial<MediaCalcInputs["channels"][MediaChannelKey]>,
  ) {
    setInputs((prev) => ({
      ...prev,
      channels: { ...prev.channels, [key]: { ...prev.channels[key], ...patch } },
    }));
  }

  const activeCount = MEDIA_CHANNELS.filter((c) => inputs.channels[c.key].active).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Calculator className="mr-1 size-4" />
          Calculate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media spend calculator</DialogTitle>
          <DialogDescription>
            Works backwards from your sales target to the media budget required. Media spend only -
            excludes agency fees, creative and production.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 md:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumField
                label="Sales target"
                value={inputs.salesTarget}
                onChange={(v) => setField("salesTarget", v)}
              />
              <NumField
                label="Cost per lead ($)"
                value={inputs.costPerLead}
                onChange={(v) => setField("costPerLead", v)}
              />
              <NumField
                label="Campaign weeks"
                value={inputs.campaignWeeks}
                onChange={(v) => setField("campaignWeeks", v)}
              />
              <NumField
                label="Price point ($)"
                value={inputs.pricePoint}
                onChange={(v) => setField("pricePoint", v)}
                step={50000}
              />
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="inline-flex items-center gap-1">
                  <Label>Unqualified lead buffer</Label>
                  <HelpTip label="What is the unqualified lead buffer?">
                    Extra leads added on top of your target to cover enquiries that never turn into
                    genuine buyers.
                  </HelpTip>
                </span>
                <span className="text-sm font-semibold">{inputs.leadBuffer}%</span>
              </div>
              <Slider
                value={[inputs.leadBuffer]}
                onValueChange={([v]) => setField("leadBuffer", v)}
                min={0}
                max={50}
                step={5}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <Label>Ramping pacing</Label>
                <HelpTip label="What is ramping pacing?">
                  Spend builds up gradually over the first few weeks of the campaign instead of
                  staying flat throughout.
                </HelpTip>
              </span>
              <Switch
                checked={inputs.useRamping}
                onCheckedChange={(v) => setField("useRamping", v)}
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_84px_68px] items-center gap-2">
                <Label>Channels</Label>
                <span className="inline-flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  CPS $
                  <HelpTip label="What is CPS?">
                    Cost per sale: how much media spend it takes to generate one sale through this
                    channel.
                  </HelpTip>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Share %
                </span>
              </div>
              {activeCount === 0 && (
                <p className="text-xs text-destructive">Select at least one channel.</p>
              )}
              {MEDIA_CHANNELS.map((ch) => {
                const c = inputs.channels[ch.key];
                return (
                  <div
                    key={ch.key}
                    className="grid grid-cols-[minmax(0,1fr)_84px_68px] items-center gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Switch
                        checked={c.active}
                        onCheckedChange={(v) => setChannel(ch.key, { active: v })}
                        aria-label={`Toggle ${ch.label}`}
                      />
                      <span className="truncate text-sm">{ch.label}</span>
                    </div>
                    <NumInput
                      ariaLabel={`${ch.label} cost per sale`}
                      value={c.cps}
                      onChange={(v) => setChannel(ch.key, { cps: v })}
                      disabled={!c.active}
                      step={500}
                    />
                    <NumInput
                      ariaLabel={`${ch.label} share`}
                      value={c.share}
                      onChange={(v) => setChannel(ch.key, { share: v })}
                      disabled={!c.active}
                    />
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Shares are normalised across active channels.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4 rounded-lg bg-foreground p-5 text-background">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-background/60">
                Total media budget required
              </div>
              <div className="text-3xl font-bold tabular-nums">{fmt(plan.totalBudget)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="Leads required"
                value={Math.round(plan.bufferedLeads).toLocaleString()}
              />
              <Metric label="Weekly spend" value={fmt(plan.weeklySpend)} />
              <Metric
                label="Blended cost/sale"
                value={fmt(plan.blendedCps)}
                help="The average cost per sale across all active channels, weighted by spend."
              />
              <Metric label="Leads per sale" value={plan.leadsPerSale.toFixed(1)} />
              <Metric
                label="Campaign ROI"
                value={`${plan.roi.toFixed(1)}x`}
                help="Sales value generated for every dollar spent on media, as a multiple."
              />
              <Metric
                label="Media % of GRV"
                value={`${plan.mediaPctGdv.toFixed(2)}%`}
                help="Media budget as a percentage of gross realisation value, the total expected sales revenue."
              />
            </div>
            <div className="space-y-2 border-t border-background/15 pt-3">
              {MEDIA_CHANNELS.filter((c) => inputs.channels[c.key].active).map((ch) => (
                <div key={ch.key} className="flex items-center justify-between text-xs">
                  <span>{ch.label}</span>
                  <span className="tabular-nums text-background/80">
                    {fmt(plan.channelTotals[ch.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly schedule */}
        <div className="max-h-72 overflow-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Week</th>
                {MEDIA_CHANNELS.filter((c) => inputs.channels[c.key].active).map((ch) => (
                  <th key={ch.key} className="px-3 py-2 text-right font-medium">
                    {ch.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {plan.weeks.map((w) => (
                <tr key={w.week} className="border-t">
                  <td className="px-3 py-1.5 text-muted-foreground">W{w.week}</td>
                  {MEDIA_CHANNELS.filter((c) => inputs.channels[c.key].active).map((ch) => (
                    <td key={ch.key} className="px-3 py-1.5 text-right tabular-nums">
                      {fmt(w[ch.key])}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                    {fmt(w.total)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(w.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={activeCount === 0 || plan.totalBudget <= 0}
            onClick={() => {
              onApply(Math.round(plan.totalBudget), { inputs, plan });
              setOpen(false);
            }}
          >
            Use {fmt(plan.totalBudget)} as media budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="h-8"
      />
    </div>
  );
}

function NumInput({
  ariaLabel,
  value,
  onChange,
  disabled,
  step = 1,
}: {
  ariaLabel: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  step?: number;
}) {
  return (
    <Input
      type="number"
      min={0}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="h-8 w-full px-2 text-right tabular-nums"
    />
  );
}

function Metric({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-background/60">
        {label}
        {help && (
          <HelpTip
            label={`What is ${label.toLowerCase()}?`}
            triggerClassName="text-background/50 hover:text-background"
          >
            {help}
          </HelpTip>
        )}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
