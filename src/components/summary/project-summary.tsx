import { ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetSpreadsheet } from "@/components/planner/budget-spreadsheet";
import { CriticalPathSummary, Gantt } from "@/components/planner/gantt";
import { BrandTagline, LetterheadFooter, Wordmark } from "@/components/brand";
import {
  BUYER_TYPE_LABELS,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  PROJECT_TYPE_LABELS,
  SEVERITY_LABELS,
  checklistProgress,
  formatAudWhole,
  formatPercent,
  formatProjectAddress,
  googleMapsUrl,
  resolveHeroImage,
  type PlannerSnapshot,
} from "@/lib/planner";
import { calculateProposalCost, PROJECT_PARTY_ROLE_LABELS } from "@/lib/procurement";
import { deriveProjectSummary, type PublicProjectParty } from "./summary-model";

export function ProjectSummary({
  snapshot,
  parties,
  sharedFor,
  sharedBy,
}: {
  snapshot: PlannerSnapshot;
  parties: PublicProjectParty[];
  sharedFor?: string;
  sharedBy?: { fullName: string | null; organisationName: string | null } | null;
}) {
  const sharedByLabel = sharedBy
    ? [sharedBy.fullName, sharedBy.organisationName].filter(Boolean).join(", ")
    : "";
  const { financials, budget, grouped, schedule, launchDate } = deriveProjectSummary(snapshot);
  const hero = resolveHeroImage(snapshot.heroImageId, snapshot.heroImageUrl);
  const address = formatProjectAddress(snapshot.address) || snapshot.location;
  const mapUrl = googleMapsUrl(snapshot.address);
  const checklist = checklistProgress(snapshot.checklist);
  const overBudget = budget.varianceVsMediaBudgetCents > 0;

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="space-y-0.5">
          <Wordmark className="text-xl" />
          <BrandTagline className="block" />
          {sharedByLabel ? (
            <p className="pt-1 text-xs text-muted-foreground">Shared by {sharedByLabel}</p>
          ) : null}
        </div>
        {sharedFor ? (
          <p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Prepared for {sharedFor}
          </p>
        ) : null}
      </header>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="relative aspect-[16/6] min-h-52 bg-muted">
          <img src={hero.src} alt={hero.alt} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              {PROJECT_TYPE_LABELS[snapshot.projectType]}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              {snapshot.projectName}
            </h1>
            {address ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
                <MapPin className="size-4" />
                {address}
              </p>
            ) : null}
          </div>
        </div>
        {snapshot.projectBlurb ? (
          <div className="max-w-4xl px-6 py-6 text-base leading-7 text-muted-foreground md:px-8">
            {snapshot.projectBlurb}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label={overBudget ? "Over media budget" : "Under media budget"}
          value={formatAudWhole(Math.abs(budget.varianceVsMediaBudgetCents))}
          tone={overBudget ? "bad" : "good"}
          emphasize
        />
        <Metric
          label="Gross realisation value"
          value={formatAudWhole(financials.grvCents)}
          hint={snapshot.units ? `${snapshot.units} units` : undefined}
        />
        <Metric
          label="Media budget"
          value={formatAudWhole(financials.mediaBudgetCents)}
          hint={`${formatPercent(financials.mediaBudgetPctOfGrv)} of GRV`}
        />
        <Metric
          label="Approved plan"
          value={formatAudWhole(budget.grandTotalCents)}
          hint={`${formatPercent(budget.totalPctOfGrv)} of GRV`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audience & channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tags
            label="Buyer types"
            values={snapshot.buyerTypes.map((buyer) => BUYER_TYPE_LABELS[buyer])}
          />
          <Tags
            label="Channels"
            values={snapshot.channels.map((channel) => CHANNEL_LABELS[channel])}
          />
        </CardContent>
      </Card>

      {snapshot.personas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who the buyers will be</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {snapshot.personas.map((persona) => (
              <div key={persona.id} className="rounded-md border p-4">
                <div className="font-medium">{persona.name}</div>
                {persona.description ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {persona.description}
                  </p>
                ) : null}
                {persona.motivations ? (
                  <p className="mt-2 text-xs leading-5">
                    <span className="text-muted-foreground">Motivations: </span>
                    {persona.motivations}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1">
                  {persona.suggestedChannels.map((channel) => (
                    <Badge key={channel} variant="secondary">
                      {CHANNEL_LABELS[channel]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {address ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-lg border bg-muted">
              <iframe
                title={`Map of ${address}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{address}</span>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                >
                  Open in Google Maps
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved budget</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetSpreadsheet grouped={grouped} budget={budget} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deliverables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {grouped.map((group) => (
            <section key={group.category}>
              <h3 className="mb-2 text-sm font-semibold">{CATEGORY_LABELS[group.category]}</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Deliverable</th>
                      <th className="px-3 py-2 font-medium">Timing</th>
                      <th className="px-3 py-2 font-medium">Quantity</th>
                      <th className="px-3 py-2 text-right font-medium">Approved cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((deliverable) => {
                      const total = calculateProposalCost({
                        notes: "",
                        setupBusinessDays: deliverable.setupLeadDays,
                        agencyOneOffCents: deliverable.agencyCostCents ?? 0,
                        agencyMonthlyCents: deliverable.agencyMonthlyCostCents ?? 0,
                        productionUnitCents: deliverable.productionCostCents,
                        productionToBeConfirmed: deliverable.productionCostTbc ?? false,
                        mediaOneOffCents: deliverable.mediaCostCents,
                        mediaMonthlyCents: deliverable.mediaMonthlyCostCents ?? 0,
                        quantity: deliverable.quantity ?? 1,
                        months: deliverable.months ?? 0,
                      }).totalCents;
                      return (
                        <tr key={deliverable.id} className="border-b last:border-0">
                          <td className="px-3 py-3">
                            <div className="font-medium">{deliverable.name}</div>
                            {deliverable.description ? (
                              <div className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                                {deliverable.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            {deliverable.setupLeadDays} business days
                            {(deliverable.months ?? 0) > 0 ? ` · ${deliverable.months} months` : ""}
                          </td>
                          <td className="px-3 py-3">{deliverable.quantity ?? 1}</td>
                          <td className="px-3 py-3 text-right font-medium tabular-nums">
                            {formatAudWhole(total)}
                            {deliverable.productionCostTbc ? (
                              <div className="text-xs font-normal text-muted-foreground">
                                production TBC
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {snapshot.deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Deliverables will be added as the plan develops.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule & critical path</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CriticalPathSummary schedule={schedule} launchDate={launchDate} />
          <Gantt schedule={schedule} launchDate={launchDate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project team & suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          {parties.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {parties.map((party) => (
                <div key={`${party.role}-${party.id}`} className="rounded-md border p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {PROJECT_PARTY_ROLE_LABELS[party.role]}
                  </div>
                  <div className="mt-1 font-medium">{party.organisationName}</div>
                  {party.representativeName ? (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {party.representativeName}
                    </div>
                  ) : null}
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {party.email ? <div>{party.email}</div> : null}
                    {party.phone ? <div>{party.phone}</div> : null}
                    {party.website ? <div>{party.website}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Project team details will be added as appointments are confirmed.
            </p>
          )}
        </CardContent>
      </Card>

      {snapshot.checklist.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Project readiness ({checklist.done}/{checklist.total} reviewed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {snapshot.checklist.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className={item.done ? "text-muted-foreground" : ""}>{item.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={item.severity === "high" ? "destructive" : "outline"}>
                      {SEVERITY_LABELS[item.severity]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.done ? "Complete" : "Open"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <LetterheadFooter />
    </article>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  emphasize = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
  emphasize?: boolean;
}) {
  const toneClass =
    tone === "bad" ? "text-destructive" : tone === "good" ? "text-positive" : "text-foreground";
  const borderClass = emphasize
    ? tone === "bad"
      ? "border-destructive/40"
      : tone === "good"
        ? "border-positive/40"
        : "border-primary/40"
    : "";
  return (
    <Card className={emphasize ? `sm:col-span-2 border-2 ${borderClass}` : undefined}>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`mt-1 font-semibold tabular-nums ${toneClass} ${emphasize ? "text-3xl" : "text-2xl"}`}
        >
          {value}
        </div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function Tags({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}:</span>
      {values.length === 0 ? (
        <span className="text-sm text-muted-foreground">Not specified</span>
      ) : (
        values.map((value) => (
          <Badge key={value} variant="secondary">
            {value}
          </Badge>
        ))
      )}
    </div>
  );
}
