import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/home/Footer";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "You're subscribed - Launch Planner" }] }),
  component: WelcomePage,
});

const STEPS = [
  "Check your email for a message from Launch Planner. It can take a few minutes, so check your spam folder too.",
  "Open the email and click the link to set your password.",
  "Sign in and start your first project.",
];

function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-10 text-positive" />
            <CardTitle>You're subscribed</CardTitle>
            <CardDescription>Your Launch Planner subscription is active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="space-y-3 text-sm">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                Already set your password?
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t get the email?{" "}
              <Link
                to="/login"
                search={{ mode: "forgot" }}
                className="font-medium text-foreground underline underline-offset-2"
              >
                Send it again
              </Link>{" "}
              or email{" "}
              <a
                href="mailto:admin@launchplanner.com.au"
                className="font-medium text-foreground underline underline-offset-2"
              >
                admin@launchplanner.com.au
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
