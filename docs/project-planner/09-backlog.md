# Backlog

Running list of feature/fix requests raised in session, not yet scoped or
scheduled. Add to it; don't build from it without picking an item up
explicitly.

1. **Sidebar: current project missing on the Projects list page.** On
   `/projects`, the sidebar only shows "Projects" and "New project" under
   Workspace, there's no "Current project" section for a saved project
   (e.g. Example Project), unlike inside the planner itself. Confirm whether
   that's intentional (the section may only be meant to show once you're
   inside a project) or should also appear from the projects list.

2. **Simplify the "Edit service" (deliverable) modal.** It shows every field
   at once (name, description, category, required file formats,
   requirements, notes, recurrence, dependency, etc.). Consider conditional/
   piped questions instead, e.g. "Is this one-off or recurring?" then only
   reveal the fields relevant to that answer, rather than showing
   everything up front.

3. **Remove "Recurrence pattern"** from the deliverable editor, unless
   something else depends on it. Needs checking before removing.

4. **"Dependency guidance" field is unclear.** Needs a plain explanation of
   what it's for (and possibly a clearer label/help text once we know).

5. **"Must be finished first" dependency picker needs multi-select.** It's
   currently a single-select dropdown ("Nothing, it can start straight
   away" plus one other deliverable). Needs to allow choosing more than one
   dependency, and the list should also include "Plans" and "Fits and
   finishes" as selectable items.
