import { addDays, differenceInCalendarDays, format } from "date-fns";
import { AlertTriangle, CalendarClock, Flag } from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CATEGORY_LABELS,
  formatAudWhole,
  formatAuDate,
  type Schedule,
  type ScheduledItem,
} from "@/lib/planner";

const ROW_H = 44; // px per row
const HEADER_H = 28; // px for the tick axis

interface Row {
  kind: "category" | "item";
  key: string;
  label: string;
  item?: ScheduledItem;
}

/** A lightweight Gantt: category-grouped rows, lead-in + active bars,
 *  recurrence markers, critical-path emphasis, and a launch-date line. */
export function Gantt({ schedule, launchDate }: { schedule: Schedule; launchDate?: Date | null }) {
  if (schedule.hasCycle) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        The deliverables contain a circular dependency, so a schedule can&apos;t be computed. Remove
        the cycle to see the Gantt.
      </div>
    );
  }
  if (schedule.items.length === 0) {
    return <p className="text-sm text-muted-foreground">Add deliverables to see the schedule.</p>;
  }

  // Timeline range: project window, extended to include the launch date.
  const rangeStart = schedule.projectStart;
  const rangeEnd =
    launchDate && launchDate > schedule.projectEnd
      ? addDays(launchDate, 3)
      : addDays(schedule.projectEnd, 3);
  const totalDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart));

  const pct = (date: Date) =>
    clamp((differenceInCalendarDays(date, rangeStart) / totalDays) * 100, 0, 100);

  const ticks = buildTicks(rangeStart, rangeEnd, totalDays);

  // Flatten grouped categories into renderable rows.
  const rows = toRows(schedule.items);
  const bodyH = rows.length * ROW_H;

  const launchPct = launchDate ? pct(launchDate) : null;
  const launchLate = launchDate ? launchDate < schedule.projectEnd : false;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px]">
        {/* Left: labels */}
        <div className="sticky left-0 z-10 w-56 shrink-0 border-r bg-card">
          <div style={{ height: HEADER_H }} />
          {rows.map((r) => (
            <div
              key={r.key}
              style={{ height: ROW_H }}
              className={
                r.kind === "category"
                  ? "flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  : "flex items-center justify-between gap-2 pr-3"
              }
            >
              {r.kind === "category" ? (
                <span>{r.label}</span>
              ) : (
                <>
                  <span className="truncate text-sm" title={r.label}>
                    {r.label}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatAudWhole(r.item!.costCents)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Right: timeline */}
        <div className="relative flex-1">
          {/* Tick axis */}
          <div className="relative" style={{ height: HEADER_H }}>
            {ticks.map((t) => (
              <div
                key={t.date.getTime()}
                className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground"
                style={{ left: `${t.pct}%` }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="relative" style={{ height: bodyH }}>
            {/* Gridlines */}
            {ticks.map((t) => (
              <div
                key={t.date.getTime()}
                className="absolute top-0 w-px bg-border"
                style={{ left: `${t.pct}%`, height: bodyH }}
              />
            ))}

            {/* Launch-date marker */}
            {launchPct !== null && (
              <div
                className="absolute top-0 z-10 flex flex-col items-center"
                style={{ left: `${launchPct}%`, height: bodyH }}
                title={`Launch date: ${formatAuDate(launchDate!)}${launchLate ? " (after the earliest completion date)" : ""}`}
              >
                <span
                  className={`flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${
                    launchLate ? "bg-destructive" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {launchLate ? (
                    <AlertTriangle className="size-3 shrink-0" />
                  ) : (
                    <Flag className="size-3 shrink-0" />
                  )}
                  Launch {formatAuDate(launchDate!)}
                </span>
                <div className={`w-0.5 flex-1 ${launchLate ? "bg-destructive" : "bg-primary"}`} />
              </div>
            )}

            {/* Bars */}
            {rows.map((r, i) => {
              if (r.kind !== "item") return null;
              const item = r.item!;
              const left = pct(item.start);
              const width = Math.max(0.6, pct(item.end) - left);
              const leadFrac =
                item.durationDays > 0
                  ? Math.min(
                      1,
                      differenceInCalendarDays(item.leadInEnd, item.start) / item.durationDays,
                    )
                  : 0;
              return (
                <div key={r.key}>
                  <div
                    className="absolute"
                    style={{ top: i * ROW_H + 10, left: `${left}%`, width: `${width}%` }}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`relative block h-6 w-full overflow-hidden rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            item.critical
                              ? "bg-primary ring-1 ring-primary"
                              : "bg-muted-foreground/60"
                          }`}
                          aria-label={`${item.name}: ${formatAuDate(item.start)} to ${formatAuDate(item.end)}`}
                        >
                          {/* Lead-in / setup portion */}
                          <div
                            className="absolute inset-y-0 left-0 border-r border-background/70 bg-background/45"
                            style={{ width: `${leadFrac * 100}%` }}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-64 text-xs">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="mt-1 text-muted-foreground">
                          {formatAuDate(item.start)} → {formatAuDate(item.end)} ·{" "}
                          {item.durationDays} {item.durationDays === 1 ? "day" : "days"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {item.critical
                            ? "On the critical path: zero slack."
                            : `${item.slack} ${item.slack === 1 ? "day" : "days"} of slack.`}
                        </p>
                      </PopoverContent>
                    </Popover>
                    {/* Recurrence occurrence markers */}
                    {item.occurrences.map((o, idx) => {
                      const op = pct(o);
                      const within = ((op - left) / width) * 100;
                      return (
                        <div
                          key={idx}
                          className="absolute top-1 size-1.5 -translate-x-1/2 rounded-full bg-background ring-1 ring-foreground/60"
                          style={{ left: `${clamp(within, 0, 100)}%` }}
                          title={`Occurrence: ${formatAuDate(o)}`}
                        />
                      );
                    })}
                  </div>
                  {/* Slack, shown inline so it's visible without hovering */}
                  {!item.critical && item.slack > 0 && (
                    <span
                      className="absolute flex items-center whitespace-nowrap pl-1.5 text-[10px] text-muted-foreground"
                      style={{ top: i * ROW_H, left: `${pct(item.end)}%`, height: ROW_H }}
                    >
                      +{item.slack}d slack
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GanttLegend />
    </div>
  );
}

/** Critical-path summary: duration, completion date, on-time check, the chain. */
export function CriticalPathSummary({
  schedule,
  launchDate,
}: {
  schedule: Schedule;
  launchDate?: Date | null;
}) {
  if (schedule.hasCycle) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="size-4" />
        Circular dependency detected - resolve it to compute the critical path.
      </div>
    );
  }

  const weeks = (schedule.projectDurationDays / 7).toFixed(1);
  const daysLate = launchDate ? differenceInCalendarDays(schedule.projectEnd, launchDate) : null;
  const byName = new Map(schedule.items.map((i) => [i.id, i.name]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={<CalendarClock className="size-4" />}
          label="Schedule length"
          value={`${schedule.projectDurationDays} days`}
          hint={`${weeks} weeks`}
        />
        <Metric
          icon={<Flag className="size-4" />}
          label="Earliest completion"
          value={formatAuDate(schedule.projectEnd)}
          hint={`from ${formatAuDate(schedule.projectStart)}`}
        />
        {launchDate ? (
          <Metric
            icon={<Flag className="size-4" />}
            label="Vs launch date"
            value={
              daysLate! > 0
                ? `${daysLate} days late`
                : daysLate! === 0
                  ? "On time"
                  : `${Math.abs(daysLate!)} days buffer`
            }
            hint={formatAuDate(launchDate)}
            tone={daysLate! > 0 ? "bad" : "good"}
          />
        ) : (
          <Metric
            icon={<Flag className="size-4" />}
            label="Vs launch date"
            value="No launch date set"
            hint="Set one in project details"
          />
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          Critical path ({schedule.criticalPath.length} items)
          <HelpTip label="What is the critical path?">
            The critical path is the chain of deliverables with zero slack. If any of them run late,
            your completion date moves out. Everything else has some slack: room to slip a little
            without affecting the finish date.
          </HelpTip>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {schedule.criticalPath.map((id, i) => (
            <span key={id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <span className="rounded bg-primary/15 px-2 py-1 text-xs font-medium text-foreground">
                {byName.get(id) ?? id}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          These items have zero slack - any delay pushes out the completion date.
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  const toneClass =
    tone === "bad" ? "text-destructive" : tone === "good" ? "text-positive" : "text-foreground";
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function GanttLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <LegendItem
        className="bg-primary ring-1 ring-primary"
        help="Zero slack - any delay here pushes out the completion date."
      >
        Critical path
      </LegendItem>
      <LegendItem
        className="bg-muted-foreground/60"
        help="Can slip by the number of days shown without affecting the completion date."
      >
        Has slack
      </LegendItem>
      <LegendItem className="border border-foreground/40 bg-background">Setup / lead-in</LegendItem>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-background ring-1 ring-foreground/60" />
        Recurrence
        <HelpTip label='What does "Recurrence" mean?'>
          A dot marks each repeat occurrence of a recurring deliverable, such as a weekly press ad
          or a monthly EDM.
        </HelpTip>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-primary" />
        Launch date
        <HelpTip label='What does "Launch date" mean?'>
          The date you set as the project&apos;s launch, from Project details. The line turns red if
          it falls before the earliest completion date, meaning the schedule won&apos;t be ready in
          time.
        </HelpTip>
      </span>
    </div>
  );
}

function LegendItem({
  className,
  help,
  children,
}: {
  className: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-5 rounded ${className}`} />
      {children}
      {help && <HelpTip label={`What does "${children}" mean?`}>{help}</HelpTip>}
    </span>
  );
}

function toRows(items: ScheduledItem[]): Row[] {
  const byCategory = new Map<string, ScheduledItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const rows: Row[] = [];
  for (const [category, list] of [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    rows.push({
      kind: "category",
      key: `cat-${category}`,
      label: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
    });
    for (const item of list) {
      rows.push({ kind: "item", key: item.id, label: item.name, item });
    }
  }
  return rows;
}

interface Tick {
  date: Date;
  pct: number;
  label: string;
}

function buildTicks(start: Date, end: Date, totalDays: number): Tick[] {
  const step = totalDays <= 70 ? 7 : totalDays <= 180 ? 14 : 30;
  const ticks: Tick[] = [];
  for (let offset = 0; offset <= totalDays; offset += step) {
    const date = addDays(start, offset);
    ticks.push({
      date,
      pct: (offset / totalDays) * 100,
      label: format(date, "d MMM"),
    });
  }
  return ticks;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
