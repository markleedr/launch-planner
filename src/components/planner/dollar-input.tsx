import { Input } from "@/components/ui/input";

/** A plain-dollar text field with a fixed "$" prefix, for the raw dollar-string
 *  fields (GRV, media budget) rather than the cents-based deliverable
 *  cost fields, which use their own numeric MoneyInput. */
export function DollarInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-6"
      />
    </div>
  );
}
