import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import type { ProjectRow } from "@/lib/project-store";
import {
  formatAuDate,
  formatAudWhole,
  parseDollarsToCents,
  PROJECT_TYPE_LABELS,
  resolveHeroImage,
  UNIT_LABELS,
} from "@/lib/planner";
import { guestPath, type GuestDemoBasePath } from "@/lib/guest-demo/campaign";
import { EXAMPLE_TENERIFFE_ID } from "@/lib/urban-developer/guest-store";

export function GuestProjectCard({ project }: { project: ProjectRow }) {
  const campaign = useGuestDemo();
  const planTo = guestPath(campaign.basePath, "/plan") as `${GuestDemoBasePath}/plan`;
  const hero = resolveHeroImage(project.heroImageId, project.heroImageUrl);
  const location = [project.suburb, project.state].filter(Boolean).join(", ");
  const grvCents = parseDollarsToCents(project.grv);
  const mediaBudgetCents = parseDollarsToCents(project.mediaBudget);
  const launchDate = project.launchDate ? new Date(`${project.launchDate}T00:00:00`) : null;
  const unitLabel = capitalise(UNIT_LABELS[project.projectType].replace(/^Number of /, ""));
  const isExample = project.id === EXAMPLE_TENERIFFE_ID;

  return (
    <Card className="group flex h-full flex-col overflow-hidden">
      <Link
        to={planTo}
        search={{ projectId: project.id }}
        className="relative block aspect-[16/8] bg-muted"
        aria-label={`Open ${project.name}`}
      >
        <img
          src={hero.src}
          alt={hero.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <Badge variant="secondary" className="absolute left-3 top-3 shadow-sm">
          {PROJECT_TYPE_LABELS[project.projectType]}
        </Badge>
        {isExample ? (
          <Badge className="absolute right-3 top-3 bg-brand text-black shadow-sm hover:bg-brand">
            Example
          </Badge>
        ) : null}
      </Link>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="min-w-0">
          <Link
            to={planTo}
            search={{ projectId: project.id }}
            className="block truncate text-base font-semibold hover:underline"
          >
            {project.name}
          </Link>
          {location ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{location}</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Fact label={unitLabel} value={String(project.units || "-")} />
          <Fact label="GRV" value={grvCents ? formatAudWhole(grvCents) : "-"} />
          <Fact
            label="Media budget"
            value={mediaBudgetCents ? formatAudWhole(mediaBudgetCents) : "-"}
          />
          <Fact
            label="Launch"
            value={
              launchDate && !Number.isNaN(launchDate.getTime()) ? formatAuDate(launchDate) : "-"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function capitalise(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}
