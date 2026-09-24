import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/home/Footer";
import { supabase } from "@/integrations/supabase/client";
import { safeLocalRedirect } from "@/lib/auth/redirect";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; checkout?: "success"; mode?: "forgot" | "magic" } => {
    const redirect = safeLocalRedirect(search.redirect, "");
    return {
      ...(redirect ? { redirect } : {}),
      ...(search.checkout === "success" ? { checkout: "success" as const } : {}),
      ...(search.mode === "forgot" || search.mode === "magic"
        ? { mode: search.mode as "forgot" | "magic" }
        : {}),
    };
  },
  head: () => ({ meta: [{ title: "Sign in - Project Planner" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect, checkout, mode: initialMode } = Route.useSearch();
  const destination = safeLocalRedirect(redirect);
  const [mode, setMode] = useState<"signin" | "forgot" | "magic">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: "signin" | "forgot" | "magic") {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(destination);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        // Always show the same message so we don't reveal which emails exist.
        setNotice("If that email has an account, a reset link is on its way.");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}${destination}`,
          },
        });
        if (error) throw error;
        setNotice("Check your email for a secure sign-in link.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin" ? "Sign in" : mode === "magic" ? "Email sign-in link" : "Reset password";
  const description =
    mode === "signin"
      ? "Sign in to save and open your projects."
      : mode === "magic"
        ? "We'll send a secure, single-use sign-in link to your email."
        : "Enter your email and we'll send you a reset link.";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-end px-6 py-4">
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
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {checkout === "success" && (
              <p className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Payment complete. Check your email for a secure link to set your password, then sign
                in here.
              </p>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {mode === "signin" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => switchMode("forgot")}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              {notice && <p className="text-sm text-positive">{notice}</p>}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "magic"
                      ? "Send sign-in link"
                      : "Send reset link"}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center">
              {mode === "signin" && (
                <button
                  type="button"
                  className="block w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => switchMode("magic")}
                >
                  Email me a sign-in link instead
                </button>
              )}
              {(mode === "forgot" || mode === "magic") && (
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => switchMode("signin")}
                >
                  Back to sign in
                </button>
              )}
              <p className="border-t pt-3 text-sm text-muted-foreground">
                New to Launch Planner?{" "}
                <Link
                  to="/pricing"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Subscribe to create your account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
