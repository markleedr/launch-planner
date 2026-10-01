import { LetterheadFooter } from "@/components/brand";

export function SharedSummaryUnavailable({
  heading = "This shared summary is unavailable",
  body = "The link may have expired, been revoked or no longer be valid. Please ask the project owner for a new provider link.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Launch Planner
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        <div className="mt-8 w-full text-left">
          <LetterheadFooter />
        </div>
      </div>
    </main>
  );
}
