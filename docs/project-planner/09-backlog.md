# Backlog

Running list of feature/fix requests raised in session, not yet scoped or
scheduled. Add to it; don't build from it without picking an item up
explicitly.

## Resolved

1. **Sidebar: current project missing on the Projects list page.** Confirmed
   intentional: there's no single "current" project while browsing the full
   list. Decided to leave as-is.

2. **Simplify the "Edit service" (deliverable) modal.** Decided to leave it
   as-is.

3. **Remove "Recurrence pattern"** from the deliverable editor. Checked:
   it drives the Gantt chart's recurring-occurrence dots (`expandRecurrence`
   in `schedule.ts`), so removing it would break that. Kept.

4. **"Dependency guidance" field is unclear.** Relabelled to "Dependency
   notes (private)" with a hint explaining it's a note for yourself only,
   not shown to contractors or anywhere else.

5. **"Must be finished first" dependency picker needs multi-select, plus
   "Plans" and "Fits and finishes".** Done: multi-select picker, and Plans/
   Fits and finishes added as external milestone tags (no dates, don't
   affect the schedule or critical path).
