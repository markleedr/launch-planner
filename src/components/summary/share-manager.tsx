import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, Link2, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProjectShareLink,
  listProjectShareLinks,
  revokeProjectShareLink,
} from "@/lib/procurement/sharing.server";

type HiddenField = "representativeName" | "email" | "phone" | "website";

interface ShareRow {
  id: string;
  providerName: string;
  expiresAt: string | null;
  revokedAt: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  createdAt: string;
  url?: string;
}

const PRIVACY_FIELDS: Array<{ id: HiddenField; label: string }> = [
  { id: "representativeName", label: "Representative names" },
  { id: "email", label: "Email addresses" },
  { id: "phone", label: "Phone numbers" },
  { id: "website", label: "Websites" },
];

export function ShareManager({ projectId }: { projectId: string | null }) {
  const [open, setOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [hiddenFields, setHiddenFields] = useState<HiddenField[]>([]);
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await listProjectShareLinks({ data: { projectId } });
      setRows((result as Array<Record<string, unknown>>).map(normaliseShareRow));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load share links.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create() {
    if (!projectId || !providerName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = (await createProjectShareLink({
        data: {
          projectId,
          providerName: providerName.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          hiddenContactFields: hiddenFields,
          origin: window.location.origin,
        },
      })) as Record<string, unknown>;
      const row = normaliseShareRow(result);
      setNewUrl(String(result.url ?? ""));
      setRows((current) => [{ ...row, url: String(result.url ?? "") }, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create share link.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await revokeProjectShareLink({ data: { linkId: id } });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not revoke link.");
    } finally {
      setBusy(false);
    }
  }

  if (!projectId) {
    return (
      <Button type="button" variant="outline" disabled title="Save this project before sharing">
        <Link2 className="mr-1 size-4" />
        Share
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Link2 className="mr-1 size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share client summary</DialogTitle>
          <DialogDescription>
            Create a unique private link for each provider. Links can be revoked independently and
            do not show the project navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="share-provider">Provider or recipient</Label>
              <Input
                id="share-provider"
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder="e.g. Ray White New Farm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-expiry">Optional expiry</Label>
              <Input
                id="share-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>

          <fieldset className="rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Hide contact details</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIVACY_FIELDS.map((field) => (
                <label key={field.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={hiddenFields.includes(field.id)}
                    onCheckedChange={(checked) =>
                      setHiddenFields((current) =>
                        checked
                          ? [...current, field.id]
                          : current.filter((item) => item !== field.id),
                      )
                    }
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </fieldset>

          {newUrl ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">New link ready</CardTitle>
                <CardDescription>
                  Copy it now. For security, the full secret is not recoverable later.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input value={newUrl} readOnly aria-label="New share URL" />
                <Button type="button" variant="outline" onClick={() => void copy(newUrl)}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Provider links</h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => void refresh()}
              >
                <RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <div className="space-y-2">
              {rows.map((row) => {
                const expired =
                  Boolean(row.expiresAt) && new Date(String(row.expiresAt)).getTime() < Date.now();
                const inactive = Boolean(row.revokedAt) || expired;
                return (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {row.providerName}
                        {inactive ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            {row.revokedAt ? "Revoked" : "Expired"}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3" />
                          {row.viewCount} views
                        </span>
                        <span>
                          Last viewed:{" "}
                          {row.lastViewedAt
                            ? new Date(row.lastViewedAt).toLocaleString("en-AU")
                            : "Never"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {row.url && !inactive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void copy(row.url!)}
                        >
                          <Copy className="mr-1 size-3.5" />
                          Copy
                        </Button>
                      ) : null}
                      {!inactive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void revoke(row.id)}
                        >
                          <ShieldOff className="mr-1 size-3.5" />
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {!loading && rows.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No provider links yet.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={busy || !providerName.trim()}
            onClick={() => void create()}
          >
            {busy ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Link2 className="mr-1 size-4" />
            )}
            Generate unique link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normaliseShareRow(row: Record<string, unknown>): ShareRow {
  return {
    id: String(row.id ?? ""),
    providerName: String(row.provider_name ?? row.providerName ?? ""),
    expiresAt: optionalString(row.expires_at ?? row.expiresAt),
    revokedAt: optionalString(row.revoked_at ?? row.revokedAt),
    firstViewedAt: optionalString(row.first_viewed_at ?? row.firstViewedAt),
    lastViewedAt: optionalString(row.last_viewed_at ?? row.lastViewedAt),
    viewCount: Number(row.view_count ?? row.viewCount ?? 0),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    url: optionalString(row.url) ?? undefined,
  };
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return String(value);
}
