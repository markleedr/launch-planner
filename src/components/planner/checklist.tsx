import { useState } from "react";
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  checklistProgress,
  SEVERITY_LABELS,
  SEVERITY_RANK,
  type ChecklistItem,
  type Severity,
} from "@/lib/planner";

/** Editable critical-issue checklist: tick off, set severity, add or remove. */
export function CriticalIssueChecklist({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const progress = checklistProgress(items);

  const sorted = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  });

  function toggle(id: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }
  function setSeverity(id: string, severity: Severity) {
    onChange(items.map((i) => (i.id === id ? { ...i, severity } : i)));
  }
  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }
  function startEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
  }
  function saveEdit() {
    const title = editTitle.trim();
    if (!title || !editingId) return;
    onChange(items.map((i) => (i.id === editingId ? { ...i, title } : i)));
    setEditingId(null);
  }
  function add() {
    const title = newTitle.trim();
    if (!title) return;
    onChange([
      ...items,
      { id: `chk-custom-${crypto.randomUUID()}`, title, severity: "medium", done: false },
    ]);
    setNewTitle("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.done} of {progress.total} reviewed
          </span>
          {progress.openHigh > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="size-4" />
              {progress.openHigh} high-priority open
            </span>
          )}
        </div>
        <Progress value={progress.pct * 100} />
      </div>

      <ul className="divide-y">
        {sorted.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2">
            <Checkbox
              checked={item.done}
              onCheckedChange={() => toggle(item.id)}
              aria-label={`Mark ${item.title}`}
            />
            <div className="min-w-0 flex-1">
              {editingId === item.id ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="h-8"
                  aria-label="Issue title"
                />
              ) : (
                <>
                  <div
                    className={`text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {item.title}
                  </div>
                  {item.description && !item.done && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </>
              )}
            </div>
            {editingId === item.id ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={saveEdit}
                  aria-label="Save issue"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setEditingId(null)}
                  aria-label="Cancel editing"
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Select
                  value={item.severity}
                  onValueChange={(v) => setSeverity(item.id, v as Severity)}
                >
                  <SelectTrigger className="h-8 w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SEVERITY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => startEdit(item)}
                  aria-label="Edit issue"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => remove(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          placeholder="Add a critical issue to track…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button variant="outline" onClick={add}>
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
