import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanner } from "@/components/planner/planner-provider";
import {
  catalogItemToDeliverable,
  CHANNEL_LABELS,
  DELIVERABLE_CATALOG,
  recommend,
  type ChannelCode,
} from "@/lib/planner";

/** "Recommend for me" - runs the rules engine and lets the user accept/adjust
 *  recommended channels, buyer personas and deliverables before applying. */
export function RecommendDialog() {
  const p = usePlanner();
  const [open, setOpen] = useState(false);
  const [channelSel, setChannelSel] = useState<Set<ChannelCode>>(new Set());
  const [personaSel, setPersonaSel] = useState<Set<string>>(new Set());
  const [deliverableSel, setDeliverableSel] = useState<Set<string>>(new Set());

  const rec = useMemo(
    () => recommend({ projectType: p.projectType, buyerTypes: p.buyerTypes }),
    [p.projectType, p.buyerTypes],
  );

  function handleOpenChange(next: boolean) {
    if (next) {
      // Pre-select everything the engine recommends.
      setChannelSel(new Set(rec.channels.map((c) => c.code)));
      setPersonaSel(new Set(rec.personas.map((x) => x.id)));
      setDeliverableSel(new Set(rec.suggestedCatalogIds));
    }
    setOpen(next);
  }

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function apply() {
    // Channels: merge accepted recommendations with any existing selection.
    const mergedChannels = new Set<ChannelCode>([...p.channels, ...channelSel]);
    p.setChannels([...mergedChannels]);

    // Personas: replace with the accepted set.
    p.setPersonas(rec.personas.filter((x) => personaSel.has(x.id)));

    // Deliverables: append the accepted catalog items.
    const byId = new Map(DELIVERABLE_CATALOG.map((c) => [c.catalogId, c]));
    const newDeliverables = [...deliverableSel]
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map(catalogItemToDeliverable);
    if (newDeliverables.length > 0) {
      p.setDeliverables((prev) => [...prev, ...newDeliverables]);
    }

    setOpen(false);
  }

  const catalogName = (id: string) =>
    DELIVERABLE_CATALOG.find((c) => c.catalogId === id)?.name ?? id;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="mr-1 size-4" />
          Recommend for me
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recommendations</DialogTitle>
          <DialogDescription>
            Based on your project type and buyer type. Deselect anything you don&apos;t want; the
            rest is applied to your plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Channels */}
          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold">Recommended channels</h4>
            {rec.channels.length === 0 && (
              <p className="text-xs text-muted-foreground">No channel matches.</p>
            )}
            {rec.channels.map((c) => (
              <label
                key={c.code}
                className="flex items-start gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={channelSel.has(c.code)}
                  onCheckedChange={() => setChannelSel((s) => toggle(s, c.code))}
                />
                <span>
                  <span className="font-medium">{CHANNEL_LABELS[c.code]}</span>
                  <span className="block text-xs text-muted-foreground">{c.rationale}</span>
                </span>
              </label>
            ))}
          </section>

          {/* Personas */}
          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold">Who the buyers will be</h4>
            {rec.personas.length === 0 && (
              <p className="text-xs text-muted-foreground">Select a buyer type to see personas.</p>
            )}
            {rec.personas.map((x) => (
              <label
                key={x.id}
                className="flex items-start gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={personaSel.has(x.id)}
                  onCheckedChange={() => setPersonaSel((s) => toggle(s, x.id))}
                />
                <span>
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-muted-foreground">{x.description}</span>
                </span>
              </label>
            ))}
          </section>

          {/* Deliverables */}
          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold">Suggested deliverables</h4>
            {rec.suggestedCatalogIds.map((id) => (
              <label
                key={id}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={deliverableSel.has(id)}
                  onCheckedChange={() => setDeliverableSel((s) => toggle(s, id))}
                />
                {catalogName(id)}
              </label>
            ))}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply recommendations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
