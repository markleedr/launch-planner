import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Lock,
  Palette,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wordmark } from "@/components/brand";
import Footer from "@/components/home/Footer";
import { useSession } from "@/hooks/use-session";
import { BILLING_ENABLED, useSubscription } from "@/hooks/use-subscription";
import { BILLING_PLAN } from "@/lib/billing/subscription";
import { createCheckoutSession, startSignupCheckout } from "@/lib/billing/billing.server";

export const Route = createFileRoute("/pricing")({
  validateSearch: (s: Record<string, unknown>): { checkout?: "cancel" } =>
    s.checkout === "cancel" ? { checkout: "cancel" } : {},
  head: () => ({
    meta: [
      { title: "Pricing - Launch Planner" },
      {
        name: "description",
        content:
          "Launch Planner - unlimited property launch plans, media budgeting, and contractor coordination for $49/month.",
      },
      { property: "og:title", content: "Pricing - Launch Planner" },
      {
        property: "og:description",
        content:
          "Launch Planner - unlimited property launch plans, media budgeting, and contractor coordination for $49/month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { active } = useSubscription();
  const { checkout } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const hasSubscription = Boolean(user) && BILLING_ENABLED && active;

  async function subscribe() {
    if (hasSubscription) {
      navigate({ to: "/projects" });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { url, error: checkoutError } = user
        ? await createCheckoutSession()
        : await startSignupCheckout();
      if (url) window.location.href = url;
      else throw new Error(checkoutError ?? "Could not start checkout.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
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

      <main className="flex-1">
        {/* Hero pricing card */}
        <section className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              One plan. Every feature.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground whitespace-pre-line">
              Plan, cost, and coordinate property marketing campaigns without limits. {"\n"}
              No hidden fees, no seat charges.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Pricing card */}
            <Card className="relative overflow-hidden lg:col-span-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-primary to-brand" />
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Zap className="size-4 text-brand" />
                  Plan Your Project
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight">
                  {BILLING_PLAN.name}
                </CardTitle>
                <CardDescription className="text-base">
                  Everything you need to plan and cost a property launch.
                </CardDescription>
                <div className="pt-2">
                  <span className="text-5xl font-bold tracking-tight text-foreground">
                    {BILLING_PLAN.priceLabel}
                  </span>
                  <span className="ml-2 text-muted-foreground">{BILLING_PLAN.pricePeriod}</span>
                </div>
                <p className="text-sm text-muted-foreground">Billed monthly. Cancel anytime.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {BILLING_PLAN.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/20">
                        <Check className="size-3.5 text-brand-foreground" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {checkout === "cancel" && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Checkout cancelled - you haven&apos;t been charged.
                  </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                {!BILLING_ENABLED && (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Billing isn&apos;t switched on yet. This page is a preview of the plan.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={subscribe}
                  disabled={busy || !BILLING_ENABLED}
                >
                  {busy
                    ? "Starting…"
                    : hasSubscription
                      ? "Open my projects"
                      : `Subscribe for ${BILLING_PLAN.priceLabel}/month`}
                </Button>
                {!hasSubscription && (
                  <p className="text-center text-xs text-muted-foreground">
                    You&apos;ll pay on Stripe&apos;s secure checkout, then we&apos;ll email you a
                    link to set your password.
                  </p>
                )}
                <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg" variant="outline">
                      Request a demo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-0 sm:max-w-3xl">
                    <DialogHeader className="px-6 pt-6">
                      <DialogTitle>Book a demo</DialogTitle>
                      <DialogDescription>
                        Pick a time that suits you and we&apos;ll walk you through Launch Planner.
                      </DialogDescription>
                    </DialogHeader>
                    <iframe
                      src="https://projectprofile.online/book/mark-4358"
                      title="Book a demo"
                      className="h-[70vh] w-full rounded-b-lg border-0"
                    />
                  </DialogContent>
                </Dialog>

                <p className="text-center text-xs leading-5 text-muted-foreground">
                  Secure checkout by Stripe. By subscribing, you agree to our{" "}
                  <Link
                    to="/terms"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Terms
                  </Link>{" "}
                  and acknowledge our{" "}
                  <Link
                    to="/privacy"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </CardFooter>
            </Card>

            {/* Detailed value prop */}
            <div className="space-y-6 lg:col-span-7">
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-display text-xl font-semibold tracking-tight">What you get</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A complete toolkit for property marketing teams, from first brief to final
                  invoice.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ValueItem
                    icon={LayoutDashboard}
                    title="Unlimited projects"
                    description="Create as many launch plans as you need. One per development, campaign, or client."
                  />
                  <ValueItem
                    icon={Gauge}
                    title="Media calculator"
                    description="Model weekly spend across Meta, Google, and portals. Get lead targets and ROI at a glance."
                  />
                  <ValueItem
                    icon={Layers}
                    title="Costed deliverables"
                    description="Build schedules, assign contractors, and track production and agency costs in one place."
                  />
                  <ValueItem
                    icon={Users}
                    title="Buyer personas"
                    description="Capture target audiences and channel recommendations for every project."
                  />
                  <ValueItem
                    icon={Palette}
                    title="Branded summaries"
                    description="Generate shareable project summaries with your hero image, budget, and team details."
                  />
                  <ValueItem
                    icon={FileText}
                    title="Export-ready plans"
                    description="Print or save summaries as PDFs for client sign-off and internal approvals."
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lock className="size-4 text-brand" />
                    Cancel anytime
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No lock-in contracts. Manage or cancel your subscription from your account
                    settings.
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Shield className="size-4 text-brand" />
                    Secure payments
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Payments processed by Stripe. We never store your card details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Get started in minutes
            </h2>
            <p className="mt-2 text-muted-foreground">
              No onboarding calls. No setup spreadsheets. Just sign up and start planning.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: "1",
                title: "Subscribe",
                description: "Enter your email and card on Stripe's secure checkout.",
              },
              {
                step: "2",
                title: "Check your email",
                description: "We'll send a link to set your password within a few minutes.",
              },
              {
                step: "3",
                title: "Start a launch plan",
                description: "Enter the project name, address, GRV, and media budget.",
              },
              {
                step: "4",
                title: "Add deliverables",
                description:
                  "Pick from the service catalog or add custom items with timing and costs.",
              },
              {
                step: "5",
                title: "Share and approve",
                description: "Send a branded summary link or export a PDF for sign-off.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                  {item.step}
                </span>
                <h3 className="mt-3 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
          <div className="mb-8 text-center">
            <HelpCircle className="mx-auto size-8 text-brand" />
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="what-is">
              <AccordionTrigger>What is Launch Planner?</AccordionTrigger>
              <AccordionContent>
                Launch Planner is the full version of the product. It gives you unlimited projects,
                the media budget calculator, costed deliverables, contractor coordination, and
                branded project summaries for one flat monthly price.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="change-plan">
              <AccordionTrigger>Can I change or cancel my plan?</AccordionTrigger>
              <AccordionContent>
                Yes. You can cancel anytime from your account page. Your access continues until the
                end of your current billing period. There are no cancellation fees.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="free-trial">
              <AccordionTrigger>Is there a free trial?</AccordionTrigger>
              <AccordionContent>
                We don&apos;t offer a free trial. You can explore the calculator and the public
                pages before subscribing, and you can cancel within the first billing period if it
                isn&apos;t the right fit.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="team">
              <AccordionTrigger>Can my team use one account?</AccordionTrigger>
              <AccordionContent>
                Yes. One subscription covers one user account, but you can share project summaries
                with stakeholders via public links or PDF exports without extra seats.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment">
              <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
              <AccordionContent>
                All major credit and debit cards via Stripe. Invoices are available in your Stripe
                billing portal after purchase.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger>How do I get support?</AccordionTrigger>
              <AccordionContent>
                Email{" "}
                <a
                  href="mailto:admin@projectprofile.agency"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  admin@projectprofile.agency
                </a>{" "}
                and we&apos;ll get back to you within one business day.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Separator />

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
          <div className="relative overflow-hidden rounded-2xl bg-foreground px-6 py-10 text-center text-white sm:px-12 sm:py-14">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-brand/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-brand/10 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to plan your next launch?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/80">
                Join property marketers using Launch Planner to scope faster, budget smarter, and
                coordinate launches from one place.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={subscribe}
                  disabled={busy || !BILLING_ENABLED}
                >
                  {hasSubscription
                    ? "Open my projects"
                    : user
                      ? `Subscribe for ${BILLING_PLAN.priceLabel}/month`
                      : "Sign in to subscribe"}
                  <ChevronRight className="ml-1 size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/calculator">Try the calculator</Link>
                </Button>
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/60">
                <CreditCard className="size-3.5" />
                Secure Stripe checkout. Cancel anytime.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ValueItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
        <Icon className="size-5 text-brand" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
