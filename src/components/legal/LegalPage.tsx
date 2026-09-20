import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/home/Footer";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

type LegalPageProps = {
  title: string;
  summary: string;
  children: ReactNode;
};

export function LegalPage({ title, summary, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Launch Planner home">
            <Wordmark />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        <div className="border-b pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Launch Planner
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{summary}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Effective 25 July 2026 · Last updated 25 July 2026
          </p>
        </div>

        <article className="legal-content py-8">{children}</article>
      </main>

      <Footer />
    </div>
  );
}
