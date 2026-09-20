import type { ReactNode } from "react";

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 marker:text-brand">{children}</ul>;
}
