import { useState } from "react";
import { CalendarClock } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistentDialog } from "@/components/planner/use-persistent-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDays,
  CATEGORY_LABELS,
  daysBetween,
  dependencyWouldCreateCycle,
  type Deliverable,
  type DeliverableCategory,
  type RecurrenceFreq,
  type RecurrenceRule,
} from "@/lib/planner";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
type EndKind = "none" | "count" | "until";

/** Per-deliverable schedule editor: lead time, run length, dependencies and
 *  recurrence. Validates that dependency edits don't introduce a cycle. */
export function ScheduleDialog({
  deliverable,
  allDeliverables,
  onSave,
}: {
  deliverable: Deliverable;
  allDeliverables: Deliverable[];
  onSave: (patch: Partial<Deliverable>) => void;
}) {
  const [open, setOpen] = usePersistentDialog(`schedule:${deliverable.id}`, {
    onOpen: initFromDeliverable,
  });
  const [leadDays, setLeadDays] = useState(0);
  const [runDays, setRunDays] = useState(0);
  const [deps, setDeps] = useState<string[]>([]);
  const [freq, setFreq] = useState<RecurrenceFreq>("none");
  const [interval, setIntervalVal] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [endKind, setEndKind] = useState<EndKind>("none");
  const [count, setCount] = useState(6);
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [depsQuery, setDepsQuery] = useState("");

  function initFromDeliverable() {
    setLeadDays(deliverable.setupLeadDays);
    setRunDays(daysBetween(deliverable.startDate, deliverable.endDate));
    setDeps(deliverable.dependsOn ?? []);
    const r = deliverable.recurrence;
    setFreq(r?.freq ?? "none");
    setIntervalVal(r?.interval ?? 1);
    setWeekdays(r?.byWeekday ?? []);
    setEndKind(r?.end?.kind ?? "none");
    if (r?.end?.kind === "count") setCount(r.end.count);
    if (r?.end?.kind === "until") setUntil(toDateInput(r.end.until));
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  function toggleDep(id: string) {
    setDeps((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function handleSave() {
    if (dependencyWouldCreateCycle(allDeliverables, deliverable.id, deps)) {
      setError("Those dependencies would create a circular loop.");
      return;
    }
    const recurrence = buildRecurrence({
      freq,
      interval,
      weekdays,
      endKind,
      count,
      until,
      existingHour: deliverable.recurrence?.byHour,
    });
    onSave({
      setupLeadDays: Math.max(0, Math.trunc(leadDays)),
      endDate: addDays(deliverable.startDate, Math.max(0, Math.trunc(runDays))),
      dependsOn: deps,
      recurrence,
    });
    setOpen(false);
  }

  const others = allDeliverables.filter((d) => d.id !== deliverable.id);
  const normalizedQuery = depsQuery.trim().toLowerCase();
  const filteredOthers = normalizedQuery
    ? others.filter((d) => d.name.toLowerCase().includes(normalizedQuery))
    : others;
  const othersByCategory = new Map<DeliverableCategory, Deliverable[]>();
  for (const d of filteredOthers) {
    const list = othersByCategory.get(d.category) ?? [];
    list.push(d);
    othersByCategory.set(d.category, list);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Edit schedule">
              <CalendarClock className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Schedule</TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule: {deliverable.name}</DialogTitle>
          <DialogDescription>
            Set timings, dependencies and recurrence. Total duration ={" "}
            {Math.max(0, Math.trunc(leadDays)) + Math.max(0, Math.trunc(runDays))} days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Setup / lead time (days)</Label>
              <Input
                type="number"
                min={0}
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Active run (days)</Label>
              <Input
                type="number"
                min={0}
                value={runDays}
                onChange={(e) => setRunDays(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Depends on</Label>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other deliverables.</p>
            ) : (
              <>
                {others.length > 6 && (
                  <Input
                    placeholder="Search deliverables…"
                    value={depsQuery}
                    onChange={(e) => setDepsQuery(e.target.value)}
                    className="h-8"
                  />
                )}
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {othersByCategory.size === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No deliverables match &ldquo;{depsQuery}&rdquo;.
                    </p>
                  ) : (
                    [...othersByCategory.entries()].map(([category, items]) => (
                      <div key={category}>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABELS[category]}
                        </p>
                        <div className="grid gap-1.5">
                          {items.map((d) => (
                            <label key={d.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={deps.includes(d.id)}
                                onCheckedChange={() => toggleDep(d.id)}
                              />
                              {d.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Recurrence</Label>
              <Select value={freq} onValueChange={(v) => setFreq(v as RecurrenceFreq)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No recurrence</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {freq !== "none" && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span>Every</span>
                  <Input
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setIntervalVal(Math.max(1, Number(e.target.value)))}
                    className="h-8 w-16"
                  />
                  <span>
                    {freq === "daily" ? "day(s)" : freq === "weekly" ? "week(s)" : "month(s)"}
                  </span>
                </div>

                {freq === "weekly" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">On days</Label>
                    <div className="flex gap-1">
                      {WEEKDAYS.map((label, day) => (
                        <Button
                          key={day}
                          type="button"
                          size="sm"
                          variant={weekdays.includes(day) ? "default" : "outline"}
                          className="size-8 p-0"
                          onClick={() => toggleWeekday(day)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ends</Label>
                  <div className="flex items-center gap-2">
                    <Select value={endKind} onValueChange={(v) => setEndKind(v as EndKind)}>
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">When run ends</SelectItem>
                        <SelectItem value="count">After N times</SelectItem>
                        <SelectItem value="until">On a date</SelectItem>
                      </SelectContent>
                    </Select>
                    {endKind === "count" && (
                      <Input
                        type="number"
                        min={1}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                        className="h-8 w-20"
                      />
                    )}
                    {endKind === "until" && (
                      <Input
                        type="date"
                        value={until}
                        onChange={(e) => setUntil(e.target.value)}
                        className="h-8"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildRecurrence(opts: {
  freq: RecurrenceFreq;
  interval: number;
  weekdays: number[];
  endKind: EndKind;
  count: number;
  until: string;
  existingHour?: number;
}): RecurrenceRule | undefined {
  if (opts.freq === "none") return undefined;
  const rule: RecurrenceRule = {
    freq: opts.freq,
    interval: Math.max(1, Math.trunc(opts.interval)),
    byHour: opts.existingHour,
  };
  if (opts.freq === "weekly" && opts.weekdays.length > 0) {
    rule.byWeekday = opts.weekdays;
  }
  if (opts.endKind === "count") {
    rule.end = { kind: "count", count: Math.max(1, Math.trunc(opts.count)) };
  } else if (opts.endKind === "until" && opts.until) {
    rule.end = { kind: "until", until: new Date(`${opts.until}T00:00:00`) };
  }
  return rule;
}

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
