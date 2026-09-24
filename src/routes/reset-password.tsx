import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile/profile.server";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password - Project Planner" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [destination, setDestination] = useState<"/projects" | "/account">("/projects");
  const [expired, setExpired] = useState(false);

  // The recovery link puts a token in the URL; the Supabase client parses it and
  // establishes a temporary session (PASSWORD_RECOVERY). Wait for that before
  // allowing a password change. The email says this can take a few minutes, so a
  // stale or already-used link is a real possibility - if no session shows up
  // within a few seconds, treat the link as expired instead of leaving the form
  // disabled with no explanation.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    const timeout = setTimeout(() => {
      if (active) setExpired(true);
    }, 4000);
    return () => {
      active = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // New pay-first customers land here with onboarding never completed; send
      // them to set up their profile instead of straight to an empty project list.
      // A returning user doing a routine password reset already has a profile and
      // goes straight to their projects, as before.
      let target: "/projects" | "/account" = "/projects";
      try {
        const profile = await getMyProfile();
        if (!profile.onboardingCompletedAt) target = "/account";
      } catch {
        // If the profile can't be checked, fall back to the existing behaviour.
      }

      setDestination(target);
      setDone(true);
      setTimeout(() => {
        if (target === "/account") {
          navigate({ to: "/account", search: { onboarding: true } });
        } else {
          navigate({ to: "/projects" });
        }
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Wordmark />
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>
              {ready
                ? "Choose a new password for your account."
                : expired
                  ? "This link may have expired or already been used."
                  : "Open this page from the reset link in your email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-sm text-positive">
                Password updated.{" "}
                {destination === "/account"
                  ? "Taking you to set up your profile…"
                  : "Taking you to your projects…"}
              </p>
            ) : !ready && expired ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Reset links are single-use and can take a few minutes to arrive, so this one may
                  have already expired. Send yourself a new one.
                </p>
                <Button asChild className="w-full">
                  <Link to="/login" search={{ mode: "forgot" }}>
                    Send a new reset link
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={!ready}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={!ready}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={busy || !ready}>
                  {busy ? "Saving…" : "Update password"}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
