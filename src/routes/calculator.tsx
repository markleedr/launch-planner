import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Wordmark } from "@/components/brand";
import {
  computeMediaPlan,
  DEFAULT_MEDIA_INPUTS,
  MEDIA_CHANNELS,
  type MediaCalcInputs,
  type MediaChannelKey,
} from "@/lib/planner";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Media Spend Calculator - Property Marketing" },
      {
        name: "description",
        content:
          "Work backwards from a sales target to the media budget required across Meta, Google Ads and listing portals.",
      },
      { property: "og:title", content: "Media Spend Calculator" },
      {
        property: "og:description",
        content: "Plan a property marketing media budget from a sales target.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalculatorPage,
});

// Channel colours are page-local - the shared MEDIA_CHANNELS defines
// key/label/benchmark only.
const CHANNEL_COLORS: Record<MediaChannelKey, string> = {
  meta: "var(--chart-1)",
  google: "var(--chart-2)",
  listing: "var(--chart-3)",
};

const KEYS: MediaChannelKey[] = MEDIA_CHANNELS.map((c) => c.key);

// ---------- Formatting ----------

const nfMoney = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });
const nfPlain = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });
const fmtMoney = (n: number) => `$${nfMoney.format(Math.round(n || 0))}`;
const fmtNum = (n: number) => nfPlain.format(Math.round(n || 0));
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

// ---------- Share redistribution helpers ----------

function redistributeEvenly(activeKeys: MediaChannelKey[]): Record<MediaChannelKey, number> {
  const out: Record<MediaChannelKey, number> = { meta: 0, google: 0, listing: 0 };
  if (activeKeys.length === 0) return out;
  const base = Math.floor(100 / activeKeys.length);
  activeKeys.forEach((k) => (out[k] = base));
  const remainder = 100 - base * activeKeys.length;
  out[activeKeys[0]] += remainder;
  return out;
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// ---------- Page ----------

function CalculatorPage() {
  const [inputs, setInputs] = useState<MediaCalcInputs>(() => ({
    ...DEFAULT_MEDIA_INPUTS,
    channels: {
      meta: { ...DEFAULT_MEDIA_INPUTS.channels.meta },
      google: { ...DEFAULT_MEDIA_INPUTS.channels.google },
      listing: { ...DEFAULT_MEDIA_INPUTS.channels.listing },
    },
  }));

  const setField = <K extends keyof MediaCalcInputs>(key: K, value: MediaCalcInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const activeKeys = KEYS.filter((k) => inputs.channels[k].active);

  function toggleChannel(key: MediaChannelKey, next: boolean) {
    setInputs((prev) => {
      const channels = {
        meta: { ...prev.channels.meta },
        google: { ...prev.channels.google },
        listing: { ...prev.channels.listing },
      };
      channels[key].active = next;
      const nowActive = KEYS.filter((k) => channels[k].active);
      if (nowActive.length === 0) {
        channels[key].active = true;
        return { ...prev, channels };
      }
      const even = redistributeEvenly(nowActive);
      for (const k of KEYS) channels[k].share = even[k];
      return { ...prev, channels };
    });
  }

  function setChannelCps(key: MediaChannelKey, cps: number) {
    setInputs((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [key]: { ...prev.channels[key], cps: clamp(cps, 500, 100_000) },
      },
    }));
  }

  function setChannelShare(key: MediaChannelKey, value: number) {
    setInputs((prev) => {
      const active = KEYS.filter((k) => prev.channels[k].active);
      if (!prev.channels[key].active) return prev;
      if (active.length === 1) {
        return {
          ...prev,
          channels: { ...prev.channels, [key]: { ...prev.channels[key], share: 100 } },
        };
      }
      const v = clamp(Math.round(value), 0, 100);
      const others = active.filter((k) => k !== key);
      const otherSum = others.reduce((s, k) => s + prev.channels[k].share, 0);
      const remaining = 100 - v;
      const rounded: Record<MediaChannelKey, number> = { meta: 0, google: 0, listing: 0 };
      rounded[key] = v;
      if (otherSum > 0) {
        others.forEach((k) => {
          rounded[k] = Math.round((prev.channels[k].share / otherSum) * remaining);
        });
      } else {
        const each = remaining / others.length;
        others.forEach((k) => (rounded[k] = Math.round(each)));
      }
      const sum = active.reduce((s, k) => s + rounded[k], 0);
      const diff = 100 - sum;
      if (others.length > 0) rounded[others[0]] += diff;

      return {
        ...prev,
        channels: {
          meta: { ...prev.channels.meta, share: rounded.meta },
          google: { ...prev.channels.google, share: rounded.google },
          listing: { ...prev.channels.listing, share: rounded.listing },
        },
      };
    });
  }

  const plan = useMemo(() => computeMediaPlan(inputs), [inputs]);

  // Cumulative running total per week (not on MediaPlan).
  const cumulativeByWeek = useMemo(() => {
    let running = 0;
    return plan.weeks.map((w) => (running += w.total));
  }, [plan.weeks]);

  const activeChannelDefs = MEDIA_CHANNELS.filter((c) => inputs.channels[c.key].active);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-2">
            <Wordmark />
            <span className="text-sm font-medium text-muted-foreground">
              Media Spend Calculator
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Media Spend Calculator</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Works backwards from your sales target to the media budget required across Meta, Google
            Ads and listing portals.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* INPUTS */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Campaign
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumField
                  label="Sales target"
                  suffix="sales"
                  value={inputs.salesTarget}
                  min={1}
                  max={500}
                  step={1}
                  onChange={(v) => setField("salesTarget", v)}
                />
                <NumField
                  label="Cost per lead"
                  prefix="$"
                  value={inputs.costPerLead}
                  min={10}
                  max={500}
                  step={5}
                  onChange={(v) => setField("costPerLead", v)}
                />
                <NumField
                  label="Campaign duration"
                  suffix="weeks"
                  value={inputs.campaignWeeks}
                  min={2}
                  max={52}
                  step={1}
                  onChange={(v) => setField("campaignWeeks", v)}
                />
                <NumField
                  label="Property price point"
                  prefix="$"
                  value={inputs.pricePoint}
                  min={100_000}
                  max={50_000_000}
                  step={50_000}
                  onChange={(v) => setField("pricePoint", v)}
                  format
                />
              </div>

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <Label>Unqualified lead buffer</Label>
                  <span className="text-sm font-semibold tabular-nums">{inputs.leadBuffer}%</span>
                </div>
                <Slider
                  value={[inputs.leadBuffer]}
                  onValueChange={([v]) => setField("leadBuffer", v)}
                  min={0}
                  max={50}
                  step={5}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Allowance for unqualified leads and drop-off.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Channels
              </h2>
              <div className="space-y-3">
                {MEDIA_CHANNELS.map((ch) => {
                  const c = inputs.channels[ch.key];
                  const singleActive = activeKeys.length === 1 && c.active;
                  return (
                    <div key={ch.key} className="rounded-lg border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="size-3 shrink-0 rounded-full"
                            style={{ background: CHANNEL_COLORS[ch.key] }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="font-medium">{ch.label}</div>
                            <div className="text-xs text-muted-foreground">
                              Benchmark ${nfMoney.format(ch.benchmark)} per sale
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={c.active}
                          onCheckedChange={(v) => toggleChannel(ch.key, v)}
                          aria-label={`Toggle ${ch.label}`}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Cost per sale ($)</Label>
                          <Input
                            type="number"
                            min={500}
                            max={100_000}
                            step={500}
                            value={c.cps}
                            disabled={!c.active}
                            onChange={(e) => setChannelCps(ch.key, Number(e.target.value))}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-baseline justify-between">
                            <Label className="text-xs">Budget share</Label>
                            <span className="text-xs font-semibold tabular-nums">{c.share}%</span>
                          </div>
                          <Slider
                            value={[c.share]}
                            onValueChange={([v]) => setChannelShare(ch.key, v)}
                            min={0}
                            max={100}
                            step={1}
                            disabled={!c.active || singleActive}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Shares always total 100% across active channels.
                </p>
              </div>
            </section>
          </div>

          {/* RESULTS */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="space-y-5 rounded-2xl bg-foreground p-6 text-background">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-background/60">
                  Total media investment required
                </div>
                <div className="mt-1 text-4xl font-bold tabular-nums">
                  {fmtMoney(plan.totalBudget)}
                </div>
              </div>

              <Button
                asChild
                className="w-full bg-background text-foreground hover:bg-background/90"
              >
                <Link to="/planner" search={{ mediaBudget: Math.round(plan.totalBudget) }}>
                  Apply to my project
                </Link>
              </Button>

              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Leads required"
                  value={fmtNum(plan.bufferedLeads)}
                  sub="incl. buffer"
                />
                <Stat
                  label="Weekly spend"
                  value={fmtMoney(plan.weeklySpend)}
                  sub={`${fmtNum(plan.bufferedLeads / Math.max(1, inputs.campaignWeeks))} leads/wk`}
                />
                <Stat
                  label="Blended cost / sale"
                  value={fmtMoney(plan.blendedCps)}
                  sub="weighted by share"
                />
                <Stat
                  label="Leads per sale"
                  value={fmtNum(plan.leadsPerSale)}
                  sub={`${fmtPct(plan.conversionRate)} conv.`}
                />
                <Stat
                  label="Campaign ROI"
                  value={`${plan.roi.toFixed(1)}x`}
                  sub="revenue / media"
                />
                <Stat
                  label="Media % of GDV"
                  value={fmtPct(plan.mediaPctGdv)}
                  sub="of total sale revenue"
                />
              </div>

              <div className="space-y-3 border-t border-background/15 pt-4">
                <div className="text-[10px] uppercase tracking-wider text-background/60">
                  Budget by channel
                </div>
                {activeChannelDefs.length === 0 && (
                  <p className="text-xs text-background/70">No active channels.</p>
                )}
                {activeChannelDefs.map((ch) => {
                  const amount = plan.channelTotals[ch.key];
                  const share = inputs.channels[ch.key].share;
                  return (
                    <div key={ch.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{ch.label}</span>
                        <span className="tabular-nums text-background/80">
                          {fmtMoney(amount)} · {share}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background/10">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${share}%`, background: CHANNEL_COLORS[ch.key] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* WEEKLY SCHEDULE */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Weekly schedule</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className={inputs.useRamping ? "text-muted-foreground" : "font-medium"}>
                Flat
              </span>
              <Switch
                checked={inputs.useRamping}
                onCheckedChange={(v) => setField("useRamping", v)}
                aria-label="Toggle ramping pacing"
              />
              <span className={inputs.useRamping ? "font-medium" : "text-muted-foreground"}>
                Ramping
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Week</th>
                  {activeChannelDefs.map((ch) => (
                    <th key={ch.key} className="px-3 py-2 text-right font-medium">
                      {ch.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total spend</th>
                  <th className="px-3 py-2 text-right font-medium">Target leads</th>
                  <th className="px-3 py-2 text-right font-medium">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {plan.weeks.map((w, i) => (
                  <tr key={w.week} className="border-t">
                    <td className="px-3 py-2 font-medium">W{w.week}</td>
                    {activeChannelDefs.map((ch) => (
                      <td key={ch.key} className="px-3 py-2 text-right tabular-nums">
                        {fmtMoney(w[ch.key])}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(w.total)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(w.leads)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {fmtMoney(cumulativeByWeek[i])}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  {activeChannelDefs.map((ch) => (
                    <td key={ch.key} className="px-3 py-2 text-right tabular-nums">
                      {fmtMoney(plan.channelTotals[ch.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtMoney(plan.totalBudget)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtNum(plan.bufferedLeads)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtMoney(plan.totalBudget)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          All figures are media spend only and exclude agency fees, creative production, and landing
          page costs. Cost per sale is forecast per channel; the blended figure is weighted by
          budget share. CPL is a planning assumption. Actual performance may vary by channel,
          targeting, and creative quality.
        </p>
      </main>
    </div>
  );
}

// ---------- Small components ----------

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  format,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  format?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          className={prefix ? "pl-6" : suffix ? "pr-14" : ""}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {format && (
        <div className="text-[11px] text-muted-foreground tabular-nums">
          ${nfMoney.format(value)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-background/60">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-background/60">{sub}</div>}
    </div>
  );
}
