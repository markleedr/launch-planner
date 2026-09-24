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
            <Button asChild className="w-full">
              <Link to="/login">Already set your password? Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
