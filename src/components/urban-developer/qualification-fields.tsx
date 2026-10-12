import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  LEAD_NEXT_LAUNCHES,
  LEAD_ROLES,
  type LeadNextLaunch,
  type LeadRole,
  type QualificationValue,
} from "@/lib/leads/qualification";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Two optional selects. Email stays the only required field on the forms that use this. */
export function QualificationFields({
  value,
  onChange,
  disabled,
  compact,
}: {
  value: QualificationValue;
  onChange: (next: QualificationValue) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const roleId = useId();
  const launchId = useId();
  const labelClass = compact ? "text-xs" : undefined;
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2"}>
      <div className="space-y-1.5">
        <Label htmlFor={roleId} className={labelClass}>
          Your role (optional)
        </Label>
        <select
          id={roleId}
          className={selectClass}
          value={value.role}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, role: e.target.value as LeadRole | "" })}
        >
          <option value="">Select</option>
          {LEAD_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={launchId} className={labelClass}>
          Next launch (optional)
        </Label>
        <select
          id={launchId}
          className={selectClass}
          value={value.nextLaunch}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, nextLaunch: e.target.value as LeadNextLaunch | "" })
          }
        >
          <option value="">Select</option>
          {LEAD_NEXT_LAUNCHES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
