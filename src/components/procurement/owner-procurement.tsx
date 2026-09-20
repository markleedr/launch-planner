import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Loader2, RefreshCw, Trophy, Users } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeliveryWorkspace } from "./delivery-workspace";
import { ProposalPricing } from "./proposal-pricing";
import { usePlanner } from "@/components/planner/planner-provider";
import { loadProject } from "@/lib/project-store";
import {
  calculateProposalCost,
  proposalValuesFromRow,
  type ProposalValues,
} from "@/lib/procurement";
import {
  awardProposal,
  decideVariation,
  updateProposalDeadline,
} from "@/lib/procurement/procurement.server";
import { dispatchDueCollateralRequests } from "@/lib/procurement/delivery.server";
import { listOwnerProposals } from "@/lib/procurement/procurement-store";
import { formatAudWhole } from "@/lib/planner";

export function OwnerProcurement() {
  const p = usePlanner();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!p.currentProjectId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await listOwnerProposals(p.currentProjectId);
      setRows(next as Array<Record<string, unknown>>);
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The procurement workspace could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [p.currentProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!p.currentProjectId) return;
    dispatchDueCollateralRequests({
      data: { projectId: p.currentProjectId, origin: window.location.origin },
    })
      .then(() => refresh())
      .catch(() => {});
  }, [p.currentProjectId, refresh]);

  const groups = useMemo(() => groupByDeliverable(rows), [rows]);

  async function award(row: Record<string, unknown>) {
    const contractor = asRecord(row.contractor);
    const brief = asRecord(row.brief);
    const name = String(contractor.organisation_name ?? "this contractor");
    if (
      !window.confirm(`Award ${String(brief.name)} to ${name}? Competing proposals will close.`)
    ) {
      return;
    }
    setBusyId(String(row.id));
    setError(null);
    try {
      await awardProposal({
        data: { proposalId: String(row.id), origin: window.location.origin },
      });
      if (p.currentProjectId) {
        const loaded = await loadProject(p.currentProjectId);
        if (loaded) p.hydrate(loaded.snapshot);
      }
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not award this proposal.");
    } finally {
      setBusyId(null);
    }
  }

  async function decideSubmittedVariation(variationId: string, decision: "approved" | "rejected") {
    setBusyId(variationId);
    setError(null);
    try {
      await decideVariation({
        data: { variationId, decision, origin: window.location.origin },
      });
      if (p.currentProjectId) {
        const loaded = await loadProject(p.currentProjectId);
        if (loaded) p.hydrate(loaded.snapshot);
      }
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not decide this variation.");
    } finally {
      setBusyId(null);
    }
  }

  if (!p.currentProjectId) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Save the project to manage proposals</CardTitle>
            <CardDescription>
              Procurement activity is linked to a saved project so contractor privacy can be
              enforced.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Private procurement</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Contractor proposals</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Compare independent submissions, award one provider, then manage delivery and collateral
            in a separate workspace for each deliverable.
          </p>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void refresh()}>
          <RefreshCw className={`mr-1 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading proposals…
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5" />
              No proposal requests yet
            </CardTitle>
            <CardDescription>
              Add contractors and invite them to selected deliverables from the project wizard.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <DeliverableProposalGroup
              key={group.deliverableId}
              group={group}
              busyId={busyId}
              onAward={award}
              onDecideVariation={decideSubmittedVariation}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function DeliverableProposalGroup({
  group,
  busyId,
  onAward,
  onDecideVariation,
  onChanged,
}: {
  group: ProposalGroup;
  busyId: string | null;
  onAward: (row: Record<string, unknown>) => void;
  onDecideVariation: (variationId: string, decision: "approved" | "rejected") => void;
  onChanged: () => void;
}) {
  const awarded = group.proposals.find((proposal) => proposal.status === "awarded");
  const submitted = group.proposals.filter((proposal) => proposal.status === "submitted");
  const [nextDeadline, setNextDeadline] = useState("");
  const [deadlineBusy, setDeadlineBusy] = useState(false);
  const deadline = group.brief.proposal_deadline
    ? new Date(String(group.brief.proposal_deadline))
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{String(group.brief.name)}</CardTitle>
            <CardDescription className="mt-1">
              {group.proposals.length} invited · {submitted.length} submitted
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {deadline && (
              <Badge variant="outline">
                <Clock3 className="mr-1 size-3.5" />
                Due {deadline.toLocaleDateString("en-AU")}
              </Badge>
            )}
            {awarded && (
              <Badge>
                <Trophy className="mr-1 size-3.5" />
                Awarded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!awarded && (
          <div className="grid gap-3 rounded-md bg-muted/50 p-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label>Extend or reopen proposal deadline</Label>
              <Input
                type="date"
                value={nextDeadline}
                onChange={(event) => setNextDeadline(event.target.value)}
              />
            </div>
            <Button
              className="self-end"
              variant="outline"
              disabled={!nextDeadline || deadlineBusy}
              onClick={async () => {
                setDeadlineBusy(true);
                try {
                  await updateProposalDeadline({
                    data: {
                      projectId: String(group.brief.project_id),
                      deliverableId: group.deliverableId,
                      submissionDeadline: new Date(`${nextDeadline}T17:00:00`).toISOString(),
                      origin: window.location.origin,
                    },
                  });
                  setNextDeadline("");
                  onChanged();
                } finally {
                  setDeadlineBusy(false);
                }
              }}
            >
              Update deadline
            </Button>
          </div>
        )}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Contractor</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Agency</th>
                <th className="px-3 py-2 text-right font-medium">Production</th>
                <th className="px-3 py-2 text-right font-medium">Media</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {group.proposals.map((proposal) => {
                const latest = latestRevision(proposal);
                const values = latest ? proposalValuesFromRow(latest) : null;
                const costs = values ? calculateProposalCost(values) : null;
                const contractor = asRecord(proposal.contractor);
                return (
                  <tr key={String(proposal.id)} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium">
                      {String(contractor.organisation_name)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={proposal.status === "awarded" ? "default" : "outline"}>
                        {String(proposal.status).replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {costs ? formatAudWhole(costs.agencyCents) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {costs ? formatAudWhole(costs.productionCents) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {costs ? formatAudWhole(costs.mediaCents) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {costs ? formatAudWhole(costs.totalCents) : "Awaiting"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {proposal.status === "submitted" && !awarded ? (
                        <Button
                          size="sm"
                          disabled={busyId === proposal.id}
                          onClick={() => onAward(proposal)}
                        >
                          {busyId === proposal.id ? (
                            <Loader2 className="mr-1 size-4 animate-spin" />
                          ) : (
                            <Check className="mr-1 size-4" />
                          )}
                          Award
                        </Button>
                      ) : proposal.status === "awarded" ? (
                        <span className="text-xs font-medium">Winner</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Accordion type="single" collapsible>
          {group.proposals
            .filter((proposal) => latestRevision(proposal))
            .map((proposal) => {
              const contractor = asRecord(proposal.contractor);
              const latest = latestRevision(proposal)!;
              return (
                <AccordionItem key={String(proposal.id)} value={String(proposal.id)}>
                  <AccordionTrigger>
                    Review {String(contractor.organisation_name)} submission
                  </AccordionTrigger>
                  <AccordionContent>
                    <ProposalPricing values={proposalValuesFromRow(latest)} readOnly />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>

        {awarded ? (
          <VariationDecisions proposal={awarded} busyId={busyId} onDecide={onDecideVariation} />
        ) : null}

        {awarded && extractThread(awarded) && (
          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-semibold">Delivery workspace</h3>
            <DeliveryWorkspace
              thread={extractThread(awarded)!}
              mode="owner"
              onChanged={onChanged}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VariationDecisions({
  proposal,
  busyId,
  onDecide,
}: {
  proposal: Record<string, unknown>;
  busyId: string | null;
  onDecide: (variationId: string, decision: "approved" | "rejected") => void;
}) {
  const variations = Array.isArray(proposal.variations)
    ? ([...proposal.variations] as Array<Record<string, unknown>>).sort(
        (a, b) => Number(b.revision) - Number(a.revision),
      )
    : [];
  if (variations.length === 0) return null;

  return (
    <div className="space-y-3 border-t pt-5">
      <div>
        <h3 className="font-semibold">Cost and timing variations</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Submitted changes only update the approved plan after your approval.
        </p>
      </div>
      {variations.map((variation) => {
        const values = asRecord(variation.values) as unknown as ProposalValues;
        const cost = calculateProposalCost(values);
        const pending = variation.status === "submitted";
        return (
          <div key={String(variation.id)} className="rounded-md border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Variation {String(variation.revision)}</span>
                  <Badge variant={pending ? "default" : "outline"}>
                    {String(variation.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm">{String(variation.reason)}</p>
                <p className="mt-1 text-sm font-semibold">
                  Revised total: {formatAudWhole(cost.totalCents)}
                </p>
              </div>
              {pending ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === variation.id}
                    onClick={() => onDecide(String(variation.id), "rejected")}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === variation.id}
                    onClick={() => onDecide(String(variation.id), "approved")}
                  >
                    {busyId === variation.id ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 size-4" />
                    )}
                    Approve
                  </Button>
                </div>
              ) : null}
            </div>
            <Accordion type="single" collapsible className="mt-3">
              <AccordionItem value={`variation-${String(variation.id)}`}>
                <AccordionTrigger>Review revised costs and timing</AccordionTrigger>
                <AccordionContent>
                  <ProposalPricing values={values} readOnly />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        );
      })}
    </div>
  );
}

interface ProposalGroup {
  deliverableId: string;
  brief: Record<string, unknown>;
  proposals: Array<Record<string, unknown>>;
}

function groupByDeliverable(rows: Array<Record<string, unknown>>): ProposalGroup[] {
  const map = new Map<string, ProposalGroup>();
  for (const row of rows) {
    const brief = asRecord(row.brief);
    const deliverableId = String(brief.deliverable_id);
    const group = map.get(deliverableId) ?? { deliverableId, brief, proposals: [] };
    group.proposals.push(row);
    if (Number(brief.revision) > Number(group.brief.revision)) group.brief = brief;
    map.set(deliverableId, group);
  }
  return [...map.values()];
}

function latestRevision(proposal: Record<string, unknown>): Record<string, unknown> | null {
  const revisions = Array.isArray(proposal.revisions)
    ? (proposal.revisions as Array<Record<string, unknown>>)
    : [];
  return (
    revisions.find((revision) => Number(revision.revision) === Number(proposal.current_revision)) ??
    null
  );
}

function extractThread(proposal: Record<string, unknown>): Record<string, unknown> | null {
  if (Array.isArray(proposal.thread)) {
    return (proposal.thread[0] as Record<string, unknown> | undefined) ?? null;
  }
  return proposal.thread ? asRecord(proposal.thread) : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
