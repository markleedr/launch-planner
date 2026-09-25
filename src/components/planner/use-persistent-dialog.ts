import { useEffect, useRef, useState } from "react";
import { usePlannerOptional } from "./planner-provider";

/**
 * Open state for a dialog that survives its page unmounting, such as switching
 * planner tabs and coming back. Falls back to local state outside a
 * PlannerProvider. `onOpen` runs when the dialog opens and again whenever it
 * mounts already open, so the dialog can (re)initialise its fields.
 */
export function usePersistentDialog(
  key: string,
  { defaultOpen = false, onOpen }: { defaultOpen?: boolean; onOpen?: () => void } = {},
): [boolean, (open: boolean) => void] {
  const planner = usePlannerOptional();
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = planner ? planner.openDialog === key : localOpen;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!defaultOpen || !planner) return;
    // Fires once per key even across remounts, so closing the dialog sticks.
    if (planner.consumeDefaultOpen(key)) planner.setOpenDialog(key);
    // Only on mount: defaultOpen is a one-off request to open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) onOpenRef.current?.();
  }, [open]);

  function setOpen(next: boolean) {
    if (!planner) {
      setLocalOpen(next);
      return;
    }
    if (next) planner.setOpenDialog(key);
    else if (planner.openDialog === key) planner.setOpenDialog(null);
  }

  return [open, setOpen];
}
