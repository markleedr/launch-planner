import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  Building2,
  Calculator,
  ListChecks,
  Users,
  CalendarClock,
  Menu,
  X,
} from "lucide-react";
import Footer from "@/components/home/Footer";
import { GetStartedButton } from "@/components/billing/get-started-button";
import heroBg from "@/assets/hero-property-bg.jpg";
import calculatorShot from "@/assets/features/calculator.jpg";
import scheduleShot from "@/assets/features/schedule.jpg";
import budgetShot from "@/assets/features/budget.jpg";
import teamShot from "@/assets/features/team.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launch Planner - plan, scope & cost property projects." },
      {
        name: "description",
        content:
          "Plan your property marketing workflow. Scope with accurate estimates, build service deliverables, and coordinate contractors.",
      },
      { property: "og:title", content: "Launch Planner - plan, scope & cost property projects." },
      {
        property: "og:description",
        content:
          "Plan your property marketing workflow. Scope with accurate estimates, build service deliverables, and coordinate contractors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full bg-brand/15 text-brand-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
      <span className="text-brand">{children}</span>
    </div>
  );
}

function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const steps = [
    {
      icon: Building2,
      title: "Define your project",
      desc: "Enter the property details, development type, price point and launch timeline. Everything starts from a single, accurate brief.",
    },
    {
      icon: ListChecks,
      title: "Build your deliverables",
      desc: "Select service deliverables and create a structured activity schedule that maps to your launch plan - no blank-page syndrome.",
    },
    {
      icon: Calculator,
      title: "Estimate your budget",
      desc: "Generate a detailed cost proposal, media plan and lead forecast based on your inputs and channel benchmarks.",
    },
    {
      icon: Users,
      title: "Coordinate your team",
      desc: "Invite contractors, suppliers and stakeholders to the project. Assign tasks, track approvals and keep everyone aligned.",
    },
  ];

  const features = [
    {
      icon: Calculator,
      title: "Media Spend Calculator",
      desc: "Forecast leads, budget and ROI across Meta, Google and portals before you spend a dollar.",
      image: calculatorShot,
      alt: "Launch Planner media spend calculator showing a $246,000 media investment for the River Bend project",
    },
    {
      icon: ListChecks,
      title: "Deliverable planning",
      desc: "Build a complete activity schedule and inclusion list from your chosen services, with a live critical path.",
      image: scheduleShot,
      alt: "River Bend marketing schedule and critical path timeline in Launch Planner",
    },
    {
      icon: Calculator,
      title: "Budget estimates",
      desc: "See production, media and total costs recalculate as you adjust your plan.",
      image: budgetShot,
      alt: "River Bend deliverables and budget table with production and media costs by category",
    },
    {
      icon: Users,
      title: "Team & suppliers",
      desc: "Keep contractors, roles and contact details attached to every project and deliverable.",
      image: teamShot,
      alt: "River Bend contacts directory with contractors allocated to each deliverable",
    },
  ];


  const coordinationPillars = [
    {
      icon: Users,
      title: "Contractors coordinated",
      desc: "Assign photographers, copywriters and media buyers to a shared plan - everyone sees the same brief.",
    },
    {
      icon: Calculator,
      title: "Assisted budgeting",
      desc: "Build accurate media and production budgets with rate-card estimates and CPL-driven calculators.",
    },
    {
      icon: ListChecks,
      title: "Deliverable lists",
      desc: "Every asset, ad and creative accounted for - with owners, due dates and status in one place.",
    },
    {
      icon: CalendarClock,
      title: "Media schedules",
      desc: "Weekly spend across Meta, Google and portals - ramped, scheduled and ready to hand to the buyer.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-transparent backdrop-blur-md supports-[backdrop-filter]:bg-black/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand">
              <span className="text-xs sm:text-sm font-bold text-black">LP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-normal text-white text-sm sm:text-base">Launch Planner</span>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex rounded-full text-xs font-semibold bg-transparent text-white/80 border-white/40 px-2 py-0.5"
              >
                beta
              </Badge>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how"
              className="text-sm font-normal text-white/80 hover:text-white transition-colors"
            >
              How it works
            </a>
            <a
              href="#features"
              className="text-sm font-normal text-white/80 hover:text-white transition-colors"
            >
              Features
            </a>
            <Link
              to="/pricing"
              className="text-sm font-normal text-white/80 hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              className="text-white hover:bg-white/10 rounded-full font-semibold"
            >
              <Link to="/login">Sign In</Link>
            </Button>
            <GetStartedButton
              withArrow={false}
              className="bg-brand hover:bg-brand/90 text-black rounded-full font-semibold px-6"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10 z-30">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a
                href="#how"
                className="text-sm text-white/80 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-sm text-white/80 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <Link
                to="/pricing"
                className="text-sm text-white/80 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full text-white hover:bg-white/10 rounded-full font-semibold"
                >
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <GetStartedButton
                  withArrow={false}
                  onNavigate={() => setMobileMenuOpen(false)}
                  className="w-full bg-brand hover:bg-brand/90 text-black rounded-full font-semibold"
                />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section
        className="relative min-h-[600px] md:min-h-[700px] flex flex-col"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 flex-1 flex flex-col justify-center container mx-auto px-4 sm:px-6 pt-28 pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6 sm:mb-8 leading-[1.05]">
              plan, scope & cost your
              <br />
              <span className="relative inline-block">
                property project
                <span className="absolute bottom-0.5 sm:bottom-1 left-0 w-full h-2 sm:h-3 bg-brand/90 -z-10" />
              </span>
              <span className="text-brand">.</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-white/80 mb-8 sm:mb-10 max-w-2xl mx-auto">
              Plan your property marketing workflow. Scope with accurate estimates, build service
              deliverables, and coordinate contractors.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <GetStartedButton
                size="lg"
                className="w-full sm:w-auto bg-brand hover:bg-brand/90 text-black rounded-full font-semibold text-base px-8"
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full bg-brand">
          <div className="container mx-auto px-4 sm:px-6 py-3 text-center text-xs sm:text-sm text-black">
            Plan your next campaign budget before you spend a dollar.&nbsp;
            <Link to="/calculator" className="font-semibold underline underline-offset-2">
              Try the Media Calculator →
            </Link>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              every step, accounted for<span className="text-brand">.</span>
              <br />
              from brief to launch plan.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              One platform. Every stage of the property marketing journey - scoped, costed,
              scheduled and coordinated.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="relative bg-card border border-border rounded-2xl p-6 sm:p-8 hover:border-brand/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-4xl sm:text-5xl font-bold text-brand">{i + 1}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ QUALITY GATE ============ */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
                accurate isn't a hope<span className="text-brand">.</span>
                <br />
                it's a rule.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                Launch Planner turns your project details into a detailed media plan, cost proposal
                and activity schedule - automatically checked against your inputs and benchmarks.
              </p>
              <ul className="space-y-3">
                {[
                  "Media spend is calculated from live channel benchmarks and your sales target.",
                  "Deliverables are built from templates, not from scratch.",
                  "Schedules map to your campaign duration and pacing choice.",
                  "Every cost, lead and ROI estimate is live as you adjust inputs.",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm sm:text-base text-foreground/90"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Calculator className="h-5 w-5 text-brand" />
                  <span className="font-semibold text-foreground">Media calculator - 25 sales</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Sales target", value: "25" },
                    { label: "Blended cost per sale", value: "$8,200" },
                    { label: "Leads required (incl. buffer)", value: "4,920" },
                    { label: "Total media investment", value: "$246,000" },
                    { label: "Campaign ROI", value: "254.1x" },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/50 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">{r.label}</span>
                      <span className="text-sm font-semibold text-brand">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Adjust inputs and the plan recalculates live
                  </span>
                  <Button
                    size="sm"
                    asChild
                    className="bg-brand text-black hover:bg-brand/90 rounded-full"
                  >
                    <Link to="/calculator">Try it</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
              everything the planning process was missing<span className="text-brand">.</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Every feature built in - from the first brief to the final launch plan.
            </p>
          </div>

          <div className="space-y-16 sm:space-y-24">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center"
              >
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand mb-5">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                    {f.title}
                  </h3>
                  <p className="text-base text-muted-foreground max-w-md">{f.desc}</p>
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                    <img
                      src={f.image}
                      alt={f.alt}
                      loading="lazy"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ============ COORDINATION ============ */}
      <section className="py-20 sm:py-28 bg-foreground text-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-5">
              One plan. One source of truth.
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-[1.1]">
              your new project, all in one place<span className="text-brand">.</span>
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              Bring the pieces together contractors, budgets, deliverables and media schedules, so
              you can coordinate property marketing from a single plan instead of chasing
              spreadsheets and email threads.
            </p>
          </div>

          {/* Mock dashboard */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="bg-background text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-brand" />
                  <span className="text-sm font-semibold">Riverfront Residences - Launch plan</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Week 3 of 52</span>
              </div>
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contractors
                  </p>
                  {[
                    { name: "Belinda - Agency lead", role: "Owner" },
                    { name: "Marcus - Photographer", role: "Booked · Wk 2" },
                    { name: "Mary - Copywriter", role: "In progress" },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3"
                    >
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.role}</span>
                    </div>
                  ))}
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Media schedule
                  </p>
                  {[
                    { ch: "Meta", spend: "$4,200", pct: 45 },
                    { ch: "Google", spend: "$3,300", pct: 35 },
                    { ch: "Portals", spend: "$1,900", pct: 20 },
                  ].map((m) => (
                    <div key={m.ch} className="rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{m.ch}</span>
                        <span className="text-muted-foreground">{m.spend}/wk</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  12 deliverables · 4 contractors · $9,400 weekly spend
                </span>
                <span className="text-xs font-semibold text-foreground">Total plan · $488,800</span>
              </div>
            </div>
          </div>

          {/* Pillars */}
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto border-t border-white/10 pt-10">
            {coordinationPillars.map((p) => (
              <div key={p.title} className="flex flex-col">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand mb-4">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-14 text-center text-sm italic text-white/50">
            Start a project once. Coordinate everything from there.
          </p>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-16 sm:py-24 bg-brand">
        <div className="container mx-auto px-4 sm:px-6 text-center max-w-2xl">
          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/10">
              <Building2 className="h-6 w-6 text-black" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-black mb-4 leading-tight">
            get your projects
            <br />
            under control<span className="text-black/80">.</span>
          </h2>
          <p className="text-base sm:text-lg text-black/70 mb-8">
            Join the property marketing teams who've replaced the chaos with confidence.
          </p>
          <div className="flex justify-center">
            <GetStartedButton
              size="lg"
              className="bg-black hover:bg-black/90 text-white rounded-full font-semibold text-base px-8"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
