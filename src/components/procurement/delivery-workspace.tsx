import { useCallback, useEffect, useState } from "react";
import { Check, Download, FileUp, Loader2, MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  completeDeliverableDelivery,
  createCollateralUpload,
  finaliseCollateralUpload,
  getCollateralDownloadUrl,
  reviewCollateral,
  scheduleCollateralRequest,
  sendDeliverableMessage,
  startDeliverableDelivery,
} from "@/lib/procurement/delivery.server";
import {
  listCollateral,
  listThreadMessages,
  uploadToSignedCollateralPath,
} from "@/lib/procurement/procurement-store";

const DELIVERY_LABELS: Record<string, string> = {
  invitation_sent: "Invitation sent",
  proposal_submitted: "Proposal submitted",
  awarded: "Awarded",
  in_progress: "In progress",
  collateral_requested: "Collateral requested",
  collateral_submitted: "Collateral submitted",
  changes_requested: "Changes requested",
  approved: "Approved",
  completed: "Completed",
};

/** What's currently expected, per delivery status and who's viewing. */
const STATUS_GUIDANCE: Record<string, { owner: string; contractor: string }> = {
  awarded: {
    owner: "Waiting for the contractor to start work.",
    contractor: "You've been awarded this deliverable. Start work when you're ready.",
  },
  in_progress: {
    owner:
      "The contractor is working on this deliverable and will submit collateral here for your review.",
    contractor: "Upload your collateral below when it's ready for review.",
  },
  collateral_requested: {
    owner: "An automatic request for the final collateral has been sent to the contractor.",
    contractor: "The owner has requested your final collateral. Upload it below.",
  },
  collateral_submitted: {
    owner: "A new version is ready for your review below.",
    contractor: "Your version is with the owner for review.",
  },
  changes_requested: {
    owner: "You asked for changes. The contractor will submit a new version here.",
    contractor: "The owner asked for changes. Upload a new version below.",
  },
  approved: {
    owner:
      "You've approved the latest version. Mark the deliverable complete when you're ready to close it out.",
    contractor: "Your latest version has been approved.",
  },
  completed: {
    owner: "This deliverable is complete.",
    contractor: "This deliverable is complete.",
  },
};

export function DeliveryWorkspace({
  thread,
  mode,
  onChanged,
}: {
  thread: Record<string, unknown>;
  mode: "owner" | "contractor";
  onChanged?: () => void;
}) {
  const threadId = String(thread.id);
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [collateral, setCollateral] = useState<Array<Record<string, unknown>>>([]);
  const [body, setBody] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);
  const [cutoff, setCutoff] = useState("");
  const [leadDays, setLeadDays] = useState(10);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadNotes, setUploadNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changesTarget, setChangesTarget] = useState<string | null>(null);
  const [changesFeedback, setChangesFeedback] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [nextMessages, nextCollateral] = await Promise.all([
        listThreadMessages(threadId),
        listCollateral(threadId),
      ]);
      setMessages(nextMessages as Array<Record<string, unknown>>);
      setCollateral(nextCollateral as Array<Record<string, unknown>>);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load delivery activity.");
    }
  }, [threadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function sendMessage() {
    if (!body.trim()) return;
    setMessageBusy(true);
    try {
      await sendDeliverableMessage({
        data: {
          threadId,
          body,
          attachmentNames: [],
          origin: window.location.origin,
        },
      });
      setBody("");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send message.");
    } finally {
      setMessageBusy(false);
    }
  }

  async function schedule() {
    if (!cutoff) return;
    setBusy(true);
    try {
      await scheduleCollateralRequest({
        data: {
          threadId,
          cutoffAt: new Date(`${cutoff}T17:00:00`).toISOString(),
          collectionLeadBusinessDays: leadDays,
          origin: window.location.origin,
        },
      });
      await refresh();
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not schedule the request.");
    } finally {
      setBusy(false);
    }
  }

  async function startWork() {
    setBusy(true);
    try {
      await startDeliverableDelivery({
        data: { threadId, origin: window.location.origin },
      });
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start the deliverable.");
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (uploadFiles.length === 0) return;
    setBusy(true);
    try {
      const prepared = await createCollateralUpload({
        data: {
          threadId,
          notes: uploadNotes,
          files: uploadFiles.map((file) => ({
            name: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          })),
        },
      });
      for (const item of prepared.uploads) {
        const file = uploadFiles.find((candidate) => candidate.name === item.fileName);
        if (!file) throw new Error(`Could not match ${item.fileName} to its upload.`);
        await uploadToSignedCollateralPath({
          path: item.path,
          token: item.token,
          file,
        });
      }
      await finaliseCollateralUpload({
        data: { versionId: prepared.versionId, origin: window.location.origin },
      });
      setUploadFiles([]);
      setUploadNotes("");
      await refresh();
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload collateral.");
    } finally {
      setBusy(false);
    }
  }

  async function review(
    versionId: string,
    decision: "changes_requested" | "approved",
    feedback = "",
  ) {
    if (decision === "changes_requested" && !feedback.trim()) return;
    setBusy(true);
    try {
      await reviewCollateral({
        data: { versionId, decision, feedback: feedback.trim(), origin: window.location.origin },
      });
      await refresh();
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not review collateral.");
    } finally {
      setBusy(false);
    }
  }

  function requestChanges(versionId: string) {
    setChangesTarget(versionId);
    setChangesFeedback("");
  }

  function confirmChanges() {
    if (changesTarget) void review(changesTarget, "changes_requested", changesFeedback);
    setChangesTarget(null);
  }

  async function download(fileId: string) {
    try {
      const { url } = await getCollateralDownloadUrl({ data: { fileId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not download the file.");
    }
  }

  async function complete() {
    setBusy(true);
    try {
      await completeDeliverableDelivery({
        data: { threadId, origin: window.location.origin },
      });
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete the deliverable.");
    } finally {
      setBusy(false);
    }
  }

  const status = String(thread.delivery_status ?? "awarded");
  const guidance = STATUS_GUIDANCE[status]?.[mode];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{DELIVERY_LABELS[status] ?? status}</Badge>
        <HelpTip label="What is collateral?">
          Collateral is the final files a contractor delivers for this piece of work, such as
          artwork, copy or renders, ready for you to review and approve.
        </HelpTip>
        <span className="text-xs text-muted-foreground">
          All delivery activity and files stay with this deliverable.
        </span>
        {status === "awarded" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void startWork()}
          >
            Start work
          </Button>
        ) : null}
      </div>
      {guidance && <p className="text-sm text-muted-foreground">{guidance}</p>}

      {mode === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collateral schedule</CardTitle>
            <CardDescription>
              Set the final collection date and when the automatic request should be sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Collateral cut-off">
              <Input
                type="date"
                value={cutoff}
                onChange={(event) => setCutoff(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Due by 5:00pm on this date.</p>
            </Field>
            <Field label="Request before cut-off (business days)">
              <Input
                type="number"
                min={0}
                value={leadDays}
                onChange={(event) => setLeadDays(Math.max(0, Number(event.target.value)))}
              />
            </Field>
            <Button className="self-end" disabled={!cutoff || busy} onClick={() => void schedule()}>
              Schedule request
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "contractor" &&
        ["in_progress", "collateral_requested", "changes_requested"].includes(status) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload collateral</CardTitle>
              <CardDescription>
                Every submission becomes a numbered version and remains in the review history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="file"
                multiple
                onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
              />
              <Textarea
                rows={3}
                value={uploadNotes}
                onChange={(event) => setUploadNotes(event.target.value)}
                placeholder="Optional notes for this version"
              />
              <Button disabled={uploadFiles.length === 0 || busy} onClick={() => void upload()}>
                {busy ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <FileUp className="mr-1 size-4" />
                )}
                Submit version
              </Button>
            </CardContent>
          </Card>
        )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collateral versions</CardTitle>
        </CardHeader>
        <CardContent>
          {collateral.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mode === "contractor"
                ? "No collateral submitted yet. Upload your files above when they're ready."
                : "No collateral submitted yet. It will appear here as soon as the contractor uploads it."}
            </p>
          ) : (
            <div className="space-y-3">
              {collateral.map((version) => {
                const files = (version.files ?? []) as Array<Record<string, unknown>>;
                return (
                  <div key={String(version.id)} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">Version {String(version.version)}</span>
                        <Badge className="ml-2" variant="outline">
                          {String(version.status).replaceAll("_", " ")}
                        </Badge>
                      </div>
                      {mode === "owner" && version.status === "submitted" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => requestChanges(String(version.id))}
                          >
                            Request changes
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void review(String(version.id), "approved")}
                          >
                            <Check className="mr-1 size-4" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                    {version.notes ? <p className="mt-2 text-sm">{String(version.notes)}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {files.map((file) => (
                        <Button
                          key={String(file.id)}
                          size="sm"
                          variant="secondary"
                          onClick={() => void download(String(file.id))}
                        >
                          <Download className="mr-1 size-3.5" />
                          {String(file.file_name)}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {mode === "owner" && status === "approved" && (
            <Button className="mt-4" disabled={busy} onClick={() => void complete()}>
              <Check className="mr-1 size-4" />
              Mark deliverable complete
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Deliverable messages
          </CardTitle>
          <CardDescription>
            This private conversation is separate from every other deliverable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation below.
              </p>
            ) : (
              messages.map((message) => (
                <div key={String(message.id)} className="rounded-md bg-muted px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm">{String(message.body)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(String(message.created_at)).toLocaleString("en-AU")}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a message about this deliverable"
            />
            <Button
              size="icon"
              className="h-auto w-12"
              disabled={!body.trim() || messageBusy}
              onClick={() => void sendMessage()}
            >
              {messageBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <ConfirmDialog
        open={changesTarget !== null}
        onOpenChange={(next) => {
          if (!next) setChangesTarget(null);
        }}
        title="Request changes"
        description="Tell the contractor what needs to change before you can approve this version."
        confirmLabel="Send request"
        confirmDisabled={!changesFeedback.trim()}
        onConfirm={confirmChanges}
      >
        <Textarea
          rows={3}
          value={changesFeedback}
          onChange={(event) => setChangesFeedback(event.target.value)}
          placeholder="Describe the changes required"
          autoFocus
        />
      </ConfirmDialog>
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
