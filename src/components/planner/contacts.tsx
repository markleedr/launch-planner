import { useState } from "react";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignmentCoverage,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPES,
  ownerCandidates,
  supplierCandidates,
  type Contact,
  type ContactType,
  type Deliverable,
} from "@/lib/planner";

const UNASSIGNED = "__unassigned__";

/** Contacts directory + per-deliverable owner/supplier allocation. */
export function ContactsAndSuppliers({
  contacts,
  onContactsChange,
  deliverables,
  onUpdateDeliverable,
}: {
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  deliverables: Deliverable[];
  onUpdateDeliverable: (id: string, patch: Partial<Deliverable>) => void;
}) {
  const owners = ownerCandidates(contacts);
  const suppliers = supplierCandidates(contacts);
  const coverage = assignmentCoverage(deliverables);
  const nameById = new Map(contacts.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <ContactsDirectory contacts={contacts} onContactsChange={onContactsChange} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Allocate to deliverables</h3>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              {coverage.owned}/{coverage.total} owned
            </Badge>
            <Badge variant="outline">
              {coverage.supplied}/{coverage.total} supplied
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Deliverable</th>
                <th className="w-56 py-2 px-2 font-medium">Owner (agency / dept)</th>
                <th className="w-64 py-2 px-2 font-medium">Suppliers</th>
                <th className="w-24 py-2 px-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d) => {
                const supplierIds = d.supplierIds ?? [];
                const notApplicable = d.supplierNotApplicable ?? false;
                const status = d.ownerContactId
                  ? supplierIds.length > 0 || notApplicable
                    ? "full"
                    : "partial"
                  : "none";
                return (
                  <tr key={d.id} className="border-b">
                    <td className="py-2 pr-2">{d.name}</td>
                    <td className="py-2 px-2">
                      <Select
                        value={d.ownerContactId ?? UNASSIGNED}
                        onValueChange={(v) =>
                          onUpdateDeliverable(d.id, {
                            ownerContactId: v === UNASSIGNED ? undefined : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {owners.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-2">
                      <SupplierPicker
                        suppliers={suppliers}
                        selectedIds={supplierIds}
                        notApplicable={notApplicable}
                        nameById={nameById}
                        onChange={(ids) =>
                          onUpdateDeliverable(d.id, {
                            supplierIds: ids,
                            supplierNotApplicable: false,
                          })
                        }
                        onNotApplicableChange={(value) =>
                          onUpdateDeliverable(d.id, {
                            supplierNotApplicable: value,
                            supplierIds: value ? [] : supplierIds,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-2">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ContactsDirectory({
  contacts,
  onContactsChange,
}: {
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
}) {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [type, setType] = useState<ContactType>("supplier");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editType, setEditType] = useState<ContactType>("supplier");

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditOrg(c.organisation ?? "");
    setEditType(c.type);
  }

  function saveEdit() {
    const trimmed = editName.trim();
    if (!trimmed || !editingId) return;
    onContactsChange(
      contacts.map((c) =>
        c.id === editingId
          ? { ...c, name: trimmed, organisation: editOrg.trim() || undefined, type: editType }
          : c,
      ),
    );
    setEditingId(null);
  }

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onContactsChange([
      ...contacts,
      {
        id: `c-${crypto.randomUUID()}`,
        name: trimmed,
        organisation: org.trim() || undefined,
        type,
      },
    ]);
    setName("");
    setOrg("");
  }

  function remove(id: string) {
    onContactsChange(contacts.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4" />
        Contacts directory
      </h3>

      <ul className="divide-y rounded-md border">
        {contacts.length === 0 && (
          <li className="px-3 py-4 text-sm text-muted-foreground">
            No contacts yet - add agencies, department heads and suppliers below.
          </li>
        )}
        {contacts.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                className="h-8 w-32 flex-1"
                aria-label="Contact name"
              />
              <Input
                value={editOrg}
                onChange={(e) => setEditOrg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                placeholder="Organisation"
                className="h-8 w-36 flex-1"
                aria-label="Contact organisation"
              />
              <Select value={editType} onValueChange={(v) => setEditType(v as ContactType)}>
                <SelectTrigger className="h-8 w-36" aria-label="Contact type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CONTACT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={saveEdit}
                aria-label="Save contact"
              >
                <Check className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditingId(null)}
                aria-label="Cancel editing"
              >
                <X className="size-4" />
              </Button>
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                {c.organisation && c.organisation !== c.name && (
                  <div className="truncate text-xs text-muted-foreground">{c.organisation}</div>
                )}
              </div>
              {c.roleCategory && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {c.roleCategory}
                </span>
              )}
              <Badge variant="secondary">{CONTACT_TYPE_LABELS[c.type]}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => startEdit(c)}
                aria-label={`Edit ${c.name}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => remove(c.id)}
                aria-label={`Remove ${c.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ),
        )}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="w-40"
        />
        <Input
          placeholder="Organisation (optional)"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="w-48"
        />
        <Select value={type} onValueChange={(v) => setType(v as ContactType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {CONTACT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={add}>
          <Plus className="mr-1 size-4" />
          Add contact
        </Button>
      </div>
    </div>
  );
}

function SupplierPicker({
  suppliers,
  selectedIds,
  notApplicable,
  nameById,
  onChange,
  onNotApplicableChange,
}: {
  suppliers: Contact[];
  selectedIds: string[];
  notApplicable: boolean;
  nameById: Map<string, string>;
  onChange: (ids: string[]) => void;
  onNotApplicableChange: (value: boolean) => void;
}) {
  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  const label = notApplicable
    ? "N/A"
    : selectedIds.length === 0
      ? "Add suppliers"
      : selectedIds.map((id) => nameById.get(id) ?? id).join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start truncate font-normal"
        >
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="grid gap-1 border-b pb-1">
          <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
            <Checkbox
              checked={notApplicable}
              onCheckedChange={(checked) => onNotApplicableChange(checked === true)}
            />
            N/A - no supplier needed
          </label>
        </div>
        {suppliers.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">Add supplier contacts first.</p>
        ) : (
          <div className="grid gap-1 pt-1">
            {suppliers.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={!notApplicable && selectedIds.includes(s.id)}
                  disabled={notApplicable}
                  onCheckedChange={() => toggle(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function StatusBadge({ status }: { status: "full" | "partial" | "none" }) {
  if (status === "full") return <Badge>Assigned</Badge>;
  if (status === "partial") return <Badge variant="secondary">Owner only</Badge>;
  return <Badge variant="outline">Unassigned</Badge>;
}
