import { useState } from "react";
import { LibraryBig, Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { usePlanner } from "@/components/planner/planner-provider";
import { usePersistentDialog } from "@/components/planner/use-persistent-dialog";
import {
  catalogItemToDeliverable,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DELIVERABLE_CATALOG,
  type CatalogItem,
  type ChannelCode,
  type Deliverable,
  type DeliverableCategory,
} from "@/lib/planner";

/** The catalogue category each selected marketing channel pre-selects. */
const CHANNEL_CATEGORY: Record<ChannelCode, DeliverableCategory> = {
  ppc: "ppc_advertising",
  paid_social: "paid_social",
  ooh: "outdoor",
  radio: "radio",
  tv: "tv",
  press: "print_press",
  email: "email_marketing",
  pr: "pr_events",
  signage: "site_signage",
};

const CATALOG_CATEGORIES = CATEGORY_ORDER.filter((category) =>
  DELIVERABLE_CATALOG.some((item) => item.category === category),
);

/** "Add from catalog" - pick one or more common deliverables to add. */
export function CatalogDialog({ onAdd }: { onAdd: (items: Deliverable[]) => void }) {
  const p = usePlanner();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Set<DeliverableCategory>>(new Set());
  const [open, setOpen] = usePersistentDialog("catalog", { onOpen: resetForOpen });

  function resetForOpen() {
    setSelected(new Set());
    setQuery("");
    setCategories(
      new Set(
        p.channels.flatMap((code) => (CHANNEL_CATEGORY[code] ? [CHANNEL_CATEGORY[code]] : [])),
      ),
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(category: DeliverableCategory) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function handleAdd() {
    const items = DELIVERABLE_CATALOG.filter((c) => selected.has(c.catalogId)).map(
      catalogItemToDeliverable,
    );
    if (items.length > 0) onAdd(items);
    setSelected(new Set());
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = DELIVERABLE_CATALOG.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      [item.name, CATEGORY_LABELS[item.category]].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    const matchesCategory = categories.size === 0 || categories.has(item.category);
    return matchesQuery && matchesCategory;
  });
  const grouped = groupByCategory(filtered);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LibraryBig className="mr-1 size-4" />
          Add from catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add deliverables from the catalog</DialogTitle>
          <DialogDescription>
            Select from all {DELIVERABLE_CATALOG.length} approved services. Every field remains
            editable after it is added.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search services or categories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CATALOG_CATEGORIES.map((category) => {
            const active = categories.has(category);
            return (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
              >
                {CATEGORY_LABELS[category]}
              </Button>
            );
          })}
          {categories.size > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCategories(new Set())}
            >
              Show all
            </Button>
          ) : null}
        </div>

        <div className="space-y-4 py-2">
          {grouped.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No services match “{query}”.
            </p>
          ) : null}
          {grouped.map(({ category, items }) => (
            <div key={category} className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </div>
              {items.map((item) => (
                <label
                  key={item.catalogId}
                  className="flex items-start gap-3 rounded-md border border-transparent px-2 py-2 text-sm hover:border-border hover:bg-accent"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.has(item.catalogId)}
                    onCheckedChange={() => toggle(item.catalogId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.name}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            <Plus className="mr-1 size-4" />
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function groupByCategory(items: CatalogItem[]) {
  const map = new Map<DeliverableCategory, CatalogItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return [...map.entries()]
    .sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]))
    .map(([category, list]) => ({ category, items: list }));
}
