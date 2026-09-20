import {
  CATEGORY_LABELS,
  deliverableCosts,
  formatAud,
  type BudgetSummary,
  type Deliverable,
  type DeliverableCategory,
} from "@/lib/planner";

interface GroupedCategory {
  category: DeliverableCategory;
  items: Deliverable[];
}

/** Read-only budget breakdown as a spreadsheet: category → deliverable rows
 *  with production / media / total, subtotals and a grand total. */
export function BudgetSpreadsheet({
  grouped,
  budget,
}: {
  grouped: GroupedCategory[];
  budget: BudgetSummary;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-2 font-medium">Deliverable</th>
            <th className="w-32 py-2 px-2 text-right font-medium">Production</th>
            <th className="w-32 py-2 px-2 text-right font-medium">Media</th>
            <th className="w-32 py-2 px-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ category, items }) => {
            const cat = budget.categories.find((c) => c.category === category);
            return (
              <CategoryRows
                key={category}
                category={category}
                items={items}
                subtotalCents={cat?.totalCents ?? 0}
              />
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="py-3 pr-2">Grand total</td>
            <td className="py-3 px-2 text-right tabular-nums">
              {formatAud(budget.productionTotalCents)}
            </td>
            <td className="py-3 px-2 text-right tabular-nums">
              {formatAud(budget.mediaTotalCents)}
            </td>
            <td className="py-3 px-2 text-right tabular-nums">
              {formatAud(budget.grandTotalCents)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CategoryRows({
  category,
  items,
  subtotalCents,
}: {
  category: DeliverableCategory;
  items: Deliverable[];
  subtotalCents: number;
}) {
  return (
    <>
      <tr className="bg-muted/50">
        <td
          colSpan={4}
          className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {CATEGORY_LABELS[category]}
        </td>
      </tr>
      {items.map((d) => {
        const costs = deliverableCosts(d);
        return (
          <tr key={d.id} className="border-b">
            <td className="py-2 pr-2">{d.name}</td>
            <td className="py-2 px-2 text-right tabular-nums">
              {formatAud(costs.productionCents)}
            </td>
            <td className="py-2 px-2 text-right tabular-nums">{formatAud(costs.mediaCents)}</td>
            <td className="py-2 px-2 text-right tabular-nums">{formatAud(costs.totalCents)}</td>
          </tr>
        );
      })}
      <tr className="border-b text-muted-foreground">
        <td className="py-2 pr-2 text-right text-xs" colSpan={3}>
          {CATEGORY_LABELS[category]} subtotal
        </td>
        <td className="py-2 px-2 text-right text-xs font-medium tabular-nums">
          {formatAud(subtotalCents)}
        </td>
      </tr>
    </>
  );
}
