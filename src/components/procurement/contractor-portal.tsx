import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Bell, Building2, Check, Clock3, Loader2, LogOut, RefreshCw, Send, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Wordmark } from "@/components/brand";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { DeliveryWorkspace } from "./delivery-workspace";
import { ProposalPricing } from "./proposal-pricing";
import { emptyProposalValues, proposalValuesFromRow, type ProposalValues } from "@/lib/procurement";
import {
  listContractorProposals,
  listNotifications,
  markNotificationRead,
} from "@/lib/procurement/procurement-store";
import { submitProposal, submitVariation } from "@/lib/procurement/procurement.server";

export function ContractorPortal() {
  const navigate = useNavigate();
  const { invited } = useSearch({ from: "/contractor" });
  const [showWelcome, setShowWelcome] = useState(Boolean(invited));
  const { user, loading: authLoading } = useSession();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [nextRows, nextNotifications] = await Promise.all([
        listContractorProposals(),
        listNotifications(),
      ]);
      setRows(nextRows as Array<Record<string, unknown>>);
      setNotifications(nextNotifications as Array<Record<string, unknown>>);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the contractor portal.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/contractor" } });
      return;
    }
    void refresh();
  }, [authLoading, navigate, refresh, user]);

  const active = useMemo(
    () => rows.filter((row) => !["unsuccessful", "withdrawn"].includes(String(row.status))),
    [rows],
  );
  const archived = useMemo(
    () => rows.filter((row) => ["unsuccessful", "withdrawn"].includes(String(row.status))),
    [rows],
  );
  const unread = notifications.filter((item) => !item.read_at).length;

  async function updatePassword() {
    if (newPassword.length < 8) {
      setPasswordStatus({ kind: "error", message: "Use at least 8 characters." });
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordStatus(
      passwordError
        ? { kind: "error", message: passwordError.message }
        : { kind: "success", message: "Password updated." },
    );
    if (!passwordError) setNewPassword("");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-baseline gap-2">
            <Wordmark />
            <span className="text-sm text-muted-foreground">Contractor portal</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Bell className="mr-1 size-3.5" />
              {unread} unread
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                supabase.auth.signOut().then(() => navigate({ to: "/login", search: {} }))
              }
            >
              <LogOut className="mr-1 size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Private workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Your deliverables</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit private proposals, manage awarded work and keep collateral with each
              deliverable.
            </p>
          </div>
          <Button variant="outline" disabled={loading} onClick={() => void refresh()}>
            <RefreshCw className={`mr-1 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {showWelcome && (
          <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4">
            <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Welcome to your contractor portal</p>
              <p className="mt-1 text-muted-foreground">
                Proposal requests you&apos;ve been invited to appear below. Open one to see the
                brief and submit your quote, no other setup needed.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Dismiss welcome message"
              onClick={() => setShowWelcome(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading your workspace…
          </div>
        ) : active.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-5" />
                No active deliverables
              </CardTitle>
              <CardDescription>
                New invitations and awarded work will appear here automatically.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {active.map((proposal) => (
              <ContractorProposalCard
                key={String(proposal.id)}
                proposal={proposal}
                onChanged={refresh}
              />
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={String(notification.id)}
                  type="button"
                  className="block w-full py-3 text-left"
                  onClick={() => {
                    if (!notification.read_at) {
                      void markNotificationRead(String(notification.id)).then(refresh);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{String(notification.title)}</span>
                    {!notification.read_at && <span className="size-2 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{String(notification.body)}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {archived.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="archive">
              <AccordionTrigger>Past proposal outcomes ({archived.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {archived.map((proposal) => {
                    const brief = asRecord(proposal.brief);
                    const project = asRecord(brief.project);
                    return (
                      <div
                        key={String(proposal.id)}
                        className="flex items-center justify-between rounded-md border p-3 text-sm"
                      >
                        <span>
                          {String(project.name)} · {String(brief.name)}
                        </span>
                        <Badge variant="outline">{String(proposal.status)}</Badge>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account access</CardTitle>
            <CardDescription>
              You can always sign in using an email magic link. Set a password here if you also want
              password access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-w-lg gap-2">
            <Input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
            />
            <Button onClick={() => void updatePassword()}>Set password</Button>
          </CardContent>
          {passwordStatus && (
            <p
              className={`px-6 pb-5 text-sm ${
                passwordStatus.kind === "error" ? "text-destructive" : "text-positive"
              }`}
            >
              {passwordStatus.message}
            </p>
          )}
        </Card>
      </main>
    </div>
  );
}

function ContractorProposalCard({
  proposal,
  onChanged,
}: {
  proposal: Record<string, unknown>;
  onChanged: () => void;
}) {
  const brief = asRecord(proposal.brief);
  const project = asRecord(brief.project);
  const revisions = Array.isArray(proposal.revisions)
    ? (proposal.revisions as Array<Record<string, unknown>>)
    : [];
  const latest =
    revisions.find((item) => Number(item.revision) === Number(proposal.current_revision)) ?? null;
  const [values, setValues] = useState<ProposalValues>(
    latest ? proposalValuesFromRow(latest) : emptyProposalValues(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variationReason, setVariationReason] = useState("");
  const status = String(proposal.status);
  const deadline = brief.proposal_deadline ? new Date(String(brief.proposal_deadline)) : null;
  const deadlineOpen = !deadline || deadline.getTime() >= Date.now();
  const thread = extractThread(proposal);
  const variations = Array.isArray(proposal.variations)
    ? ([...proposal.variations] as Array<Record<string, unknown>>).sort(
        (a, b) => Number(b.revision) - Number(a.revision),
      )
    : [];

  async function submit() {
    setBusy(true);
    try {
      await submitProposal({ data: { proposalId: String(proposal.id), values } });
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit the proposal.");
    } finally {
      setBusy(false);
    }
  }

  async function variation() {
    if (!variationReason.trim()) return;
    setBusy(true);
    try {
      await submitVariation({
        data: {
          proposalId: String(proposal.id),
          reason: variationReason,
          values,
        },
      });
      setVariationReason("");
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit the variation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {String(project.name ?? "Project")}
            </p>
            <CardTitle className="mt-1">{String(brief.name)}</CardTitle>
            <CardDescription className="mt-1">{String(brief.description ?? "")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{status.replaceAll("_", " ")}</Badge>
            {deadline && (
              <Badge variant="outline">
                <Clock3 className="mr-1 size-3.5" />
                Due {deadline.toLocaleDateString("en-AU")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 rounded-lg bg-muted/50 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Requirements
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {String(brief.requirements || "No additional requirements supplied.")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Required formats
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Array.isArray(brief.required_formats) ? brief.required_formats : []).length > 0 ? (
                (brief.required_formats as string[]).map((format) => (
                  <Badge key={format} variant="secondary">
                    {format}
                  </Badge>
                ))
              ) : (
                <span className="text-sm">No specific formats supplied.</span>
              )}
            </div>
          </div>
        </div>

        {["invited", "submitted"].includes(status) && deadlineOpen && (
          <div>
            <ProposalPricing values={values} onChange={setValues} />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Submitting again before the deadline creates a new retained revision.
              </p>
              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Send className="mr-1 size-4" />
                )}
                {status === "submitted" ? "Submit revised proposal" : "Submit proposal"}
              </Button>
            </div>
          </div>
        )}
        {status === "submitted" && !deadlineOpen ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            The revision window has closed. Your submitted proposal remains with the project owner
            for consideration.
          </p>
        ) : null}

        {status === "awarded" && (
          <>
            <Accordion type="single" collapsible>
              <AccordionItem value="variation">
                <AccordionTrigger>Request a cost or timing variation</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <ProposalPricing values={values} onChange={setValues} />
                    <div className="space-y-1.5">
                      <Label>Reason for variation</Label>
                      <Textarea
                        rows={3}
                        value={variationReason}
                        onChange={(event) => setVariationReason(event.target.value)}
                      />
                    </div>
                    <Button
                      disabled={busy || !variationReason.trim()}
                      onClick={() => void variation()}
                    >
                      Submit variation for approval
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {thread && (
              <DeliveryWorkspace thread={thread} mode="contractor" onChanged={onChanged} />
            )}
          </>
        )}

        {revisions.length > 1 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="history">
              <AccordionTrigger>Proposal revision history ({revisions.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {[...revisions]
                    .sort((a, b) => Number(b.revision) - Number(a.revision))
                    .map((revision) => (
                      <div
                        key={String(revision.id)}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>Revision {String(revision.revision)}</span>
                        <span className="text-muted-foreground">
                          {new Date(String(revision.submitted_at)).toLocaleString("en-AU")}
                        </span>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {variations.length > 0 ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="variations">
              <AccordionTrigger>Variation history ({variations.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {variations.map((variation) => (
                    <div
                      key={String(variation.id)}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        Variation {String(variation.revision)} · {String(variation.reason)}
                      </span>
                      <Badge variant="outline">{String(variation.status)}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
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
