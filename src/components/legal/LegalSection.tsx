import type { ReactNode } from "react";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 text-[0.95rem] leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
