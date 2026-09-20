import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateProposalCost, type ProposalValues } from "@/lib/procurement";
import { formatAudWhole, toCents, toDollars } from "@/lib/planner";

export function ProposalPricing({
  values,
  onChange,
  readOnly = false,
}: {
  values: ProposalValues;
  onChange?: (values: ProposalValues) => void;
  readOnly?: boolean;
}) {
  const costs = calculateProposalCost(values);
  const update = <K extends keyof ProposalValues>(key: K, value: ProposalValues[K]) => {
    onChange?.({ ...values, [key]: value });
  };

  return (
    <div className="space-y-5">
      <Field label="Notes">
        <Textarea
          rows={4}
          readOnly={readOnly}
          value={values.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Optional assumptions, exclusions or delivery notes"
        />
      </Field>

      <Field label="Set-up time">
        <div className="grid grid-cols-[1fr_180px] gap-2">
          <Input
            type="number"
            min={0}
            readOnly={readOnly}
            value={values.setupBusinessDays}
            onChange={(event) =>
              update("setupBusinessDays", Math.max(0, Number(event.target.value)))
            }
          />
          <Input value="business days" readOnly />
        </div>
        <Help>Time required before this deliverable can go live.</Help>
      </Field>

      <div className="space-y-2">
        <Label>Agency cost</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            label="One-off ($)"
            value={values.agencyOneOffCents}
            readOnly={readOnly}
            onChange={(value) => update("agencyOneOffCents", value)}
          />
          <MoneyInput
            label="Ongoing monthly ($/mo)"
            value={values.agencyMonthlyCents}
            readOnly={readOnly}
            onChange={(value) => update("agencyMonthlyCents", value)}
          />
        </div>
        <Help>Design, creation, delivery and management.</Help>
      </div>

      <div className="space-y-2">
        <Label>Third-party production cost</Label>
        <MoneyInput
          value={values.productionUnitCents}
          readOnly={readOnly || values.productionToBeConfirmed}
          onChange={(value) => update("productionUnitCents", value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            disabled={readOnly}
            checked={values.productionToBeConfirmed}
            onCheckedChange={(checked) => update("productionToBeConfirmed", checked === true)}
          />
          To be confirmed (counts as $0 until set)
        </label>
        <Help>Printing, delivery, press or fulfilment cost per unit.</Help>
      </div>

      <div className="space-y-2">
        <Label>Media cost</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            label="One-off ($)"
            value={values.mediaOneOffCents}
            readOnly={readOnly}
            onChange={(value) => update("mediaOneOffCents", value)}
          />
          <MoneyInput
            label="Ongoing monthly ($/mo)"
            value={values.mediaMonthlyCents}
            readOnly={readOnly}
            onChange={(value) => update("mediaMonthlyCents", value)}
          />
        </div>
        <Help>Placement on Meta, Google, radio, TV, magazines or another platform.</Help>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Quantity">
          <Input
            type="number"
            min={0}
            readOnly={readOnly}
            value={values.quantity}
            onChange={(event) => update("quantity", Math.max(0, Number(event.target.value)))}
          />
        </Field>
        <Field label="Months">
          <Input
            type="number"
            min={0}
            readOnly={readOnly}
            value={values.months}
            onChange={(event) => update("months", Math.max(0, Number(event.target.value)))}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-4">
        <span className="font-semibold">Calculated total cost</span>
        <span className="text-2xl font-bold tabular-nums">{formatAudWhole(costs.totalCents)}</span>
      </div>
    </div>
  );
}

function MoneyInput({
  label,
  value,
  readOnly,
  onChange,
}: {
  label?: string;
  value: number;
  readOnly: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Input
        type="number"
        min={0}
        step="0.01"
        readOnly={readOnly}
        aria-label={label}
        value={toDollars(value)}
        onChange={(event) => onChange(toCents(Math.max(0, Number(event.target.value))))}
      />
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
