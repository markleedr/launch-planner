import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Check, Loader2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireSubscription } from "@/components/billing/require-subscription";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  finaliseProfileImageUpload,
  getMyProfile,
  prepareProfileImageUpload,
  removeProfileImage,
  saveMyProfile,
  type UserProfileResult,
} from "@/lib/profile/profile.server";

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): { onboarding?: boolean } =>
    search.onboarding === true || search.onboarding === "1" ? { onboarding: true } : {},
  head: () => ({ meta: [{ title: "Account - Launch Planner" }] }),
  component: AccountRoute,
});

function AccountRoute() {
  return (
    <RequireSubscription>
      <AccountPage />
    </RequireSubscription>
  );
}

function AccountPage() {
  const navigate = useNavigate();
  const { onboarding } = Route.useSearch();
  const [profile, setProfile] = useState<UserProfileResult | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    organisationName: "",
    jobTitle: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setForm({
          fullName: result.fullName,
          organisationName: result.organisationName,
          jobTitle: result.jobTitle,
          phone: result.phone,
        });
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(completeOnboarding: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await saveMyProfile({ data: { ...form, completeOnboarding } });
      setProfile(result);
      if (completeOnboarding) {
        navigate({ to: "/projects" });
      } else {
        setNotice("Account details saved.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save account details.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const prepared = await prepareProfileImageUpload({
        data: {
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          sizeBytes: file.size,
        },
      });
      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type,
        });
      if (uploadError) throw uploadError;
      setProfile(await finaliseProfileImageUpload({ data: { path: prepared.path } }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload this image.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    setUploading(true);
    setError(null);
    try {
      setProfile(await removeProfileImage());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove this image.");
    } finally {
      setUploading(false);
    }
  }

  const initials =
    form.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") ||
    profile?.email.slice(0, 2).toUpperCase() ||
    "PP";
  const canFinish = form.fullName.trim().length > 0 && form.organisationName.trim().length > 0;

  return (
    <AppShell active="account" title="Account details" showFooter>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {onboarding ? "Welcome to Launch Planner" : "Your account"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {onboarding ? "Set up your profile" : "Account details"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            These details identify you inside Launch Planner. Each login has its own subscription
            and private project workspace.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading your account…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile image</CardTitle>
                <CardDescription>JPG, PNG or WebP, up to 10 MB.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Avatar className="mx-auto aspect-square size-32 border">
                  <AvatarImage
                    src={profile?.avatarUrl ?? undefined}
                    alt={form.fullName ? `${form.fullName}'s profile image` : "Profile image"}
                  />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <Label className="flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                  {uploading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 size-4" />
                  )}
                  {profile?.avatarPath ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </Label>
                {profile?.avatarPath ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={uploading}
                    onClick={() => void removeImage()}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove image
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account details</CardTitle>
                <CardDescription>
                  Your email is managed by your secure sign-in and cannot be changed here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Email">
                  <Input value={profile?.email ?? ""} readOnly />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name *">
                    <Input
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                    />
                  </Field>
                  <Field label="Organisation *">
                    <Input
                      autoComplete="organization"
                      value={form.organisationName}
                      onChange={(event) =>
                        setForm({ ...form, organisationName: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Job title">
                    <Input
                      autoComplete="organization-title"
                      value={form.jobTitle}
                      onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </Field>
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {notice ? (
                  <p className="flex items-center gap-2 text-sm text-positive">
                    <Check className="size-4" />
                    {notice}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
                  {onboarding ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => navigate({ to: "/projects" })}
                    >
                      Skip for now
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant={onboarding ? "outline" : "default"}
                    disabled={busy}
                    onClick={() => void save(false)}
                  >
                    {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Save details
                  </Button>
                  {onboarding ? (
                    <Button
                      type="button"
                      disabled={busy || !canFinish}
                      onClick={() => void save(true)}
                    >
                      Finish setup
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
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
