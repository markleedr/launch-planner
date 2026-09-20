# Project Planner — Future Build Prompts

Ready-to-paste prompts for upcoming sprints. Drop the relevant block into a new
Claude Code session (in the `markleedr/project-base-2` repo) when you're ready.

---

## A. Connect Supabase (via Lovable) — how-to

Supabase is connected through **Lovable's UI**, not from code:

1. Open the project in **Lovable** (the `project-base-2` / Project Planner project).
2. Top-right, click the **Supabase** button (green icon) → **"Connect Supabase"**.
3. Authorise Lovable, then **create a new Supabase project** (or pick an existing
   one). Lovable injects the Supabase URL + anon key into the app automatically.
4. Once connected, either prompt Lovable to build the schema, or tell me in a
   Claude Code session "Supabase is connected — wire persistence" and I'll add the
   migrations + client + auth in this repo.

**Optional Lovable prompt to scaffold the schema** (paste into Lovable's chat
after connecting):

> Create Supabase tables for the Project Planner with Row Level Security so each
> account only sees its own rows. Tables: `account`, `membership`,
> `subscription`, `project` (name, project_type, units, sell_price_cents,
> media_budget_cents, launch_date, location_suburb, location_state,
> buyer_types[], currency), `deliverable` (project_id, name, category,
> production_cost_cents, media_cost_cents, setup_lead_days, start_date, end_date,
> recurrence jsonb, owner_contact_id, status), `deliverable_dependency`,
> `deliverable_supplier`, `contact` (name, organisation, type, role_category,
> email), `checklist_item`, `buyer_persona`, `project_channel`, `share_link`.
> All money as bigint cents. Add `created_at`/`updated_at`. RLS: rows are scoped
> by `account_id = the caller's account`. See docs/project-planner/02-architecture.md
> §3 for the full data model.

---

## B. Recommendation engine — full build prompt

> **Task: Build the Project Planner recommendation engine (rules + templates).**
>
> **Context — the product:** Project Planner is a launch-planning SaaS for
> Australian property developers, built in this repo (`markleedr/project-base-2`):
> TanStack Start + React 19 + TypeScript + Tailwind v4 + shadcn/ui, with a pure,
> unit-tested domain core in `src/lib/planner/` and a shared state context in
> `src/components/planner/planner-provider.tsx`. Read
> `docs/project-planner/01-prd.md` (§4.3) and `02-architecture.md` (§3.2) first.
>
> **Context — what already exists (reuse, don't duplicate):**
> - Enums in `src/lib/planner/types.ts` + labels in `labels.ts`:
>   - `ProjectType`: `house | house_and_land | multi_residential`
>   - `BuyerType`: `owner_occupier | investor | downsizer | first_home_buyer | upsizer`
>   - `ChannelCode`: `ppc | paid_social | ooh | radio | tv | press | email | pr | signage`
>   - `DeliverableCategory`: `digital_performance | outdoor | print_press | brand_collateral | physical_display | website_build | pr_events`
> - `DELIVERABLE_CATALOG` (`deliverable-catalog.ts`) — 18 catalog items with
>   `catalogId`, category, costs, lead/run days, and `catalogItemToDeliverable()`.
> - Intake state in the provider: `projectType`, `buyerTypes`, `channels`,
>   `location`, plus `setChannels`, `setDeliverables`, etc.
> - The intake form lives in `src/routes/planner/index.tsx`.
>
> **What to build:**
> 1. `src/lib/planner/recommend.ts` — a PURE function:
>    `recommend(input: { projectType: ProjectType; buyerTypes: BuyerType[]; state?: string })
>     => { channels: { code: ChannelCode; rationale: string }[]; personas: BuyerPersona[]; suggestedCatalogIds: string[] }`
>    Deterministic, driven by data tables (below). Rank channels; de-dupe.
> 2. `src/lib/planner/recommendation-data.ts` — the rule/template DATA
>    (seedable, business-tunable; ship PLACEHOLDER values clearly flagged):
>    - `CHANNEL_RULES`: for each `projectType × buyerType` (optional state), the
>      recommended `ChannelCode[]` + a short rationale string.
>    - `PERSONA_TEMPLATES`: `BuyerPersona { id, name, description, motivations,
>      suggestedChannels: ChannelCode[], appliesToBuyerTypes: BuyerType[],
>      appliesToProjectTypes: ProjectType[] }`.
>    - `DELIVERABLE_SUGGESTIONS`: per `projectType` (and/or selected channels),
>      a list of `catalogId`s from `DELIVERABLE_CATALOG` to suggest.
> 3. Add a `BuyerPersona` type to `types.ts`; export everything via
>    `src/lib/planner/index.ts`.
> 4. Unit tests (`bun test`, colocated `*.test.ts`): determinism, channel ranking,
>    de-duplication, personas filtered correctly, suggestions resolve to real
>    catalog ids. Match the existing test style.
> 5. UI: a **"Recommend for me"** button in the intake (`planner/index.tsx`). On
>    click, run `recommend()` and show a review panel (a dialog or inline card)
>    listing recommended channels (with rationale), personas, and suggested
>    deliverables — each acceptable/removable. On accept: `setChannels(...)`,
>    append personas to a new provider `personas` state, and append
>    `suggestedCatalogIds.map(id => catalogItemToDeliverable(catalogById[id]))`
>    to deliverables. Nothing is auto-applied without confirmation.
> 6. Add a **Buyer personas** section to the Summary (`planner/summary.tsx`):
>    name, description, motivations, channels — read-only, on brand.
>
> **Constraints / definition of done:**
> - Keep all logic in the pure core; UI only renders + dispatches.
> - AUD, AU dates, Project Profile brand (yellow #FFD600 / Montserrat+Inter) — match existing components.
> - `bun run typecheck`, `bun run lint` (0 errors), `bun run test` (all pass),
>   `bun run build` all green; keep the Lovable branch buildable (no force-push).
> - Everything stays in local state (provider) until Supabase persistence lands.
>
> **Business data still needed from the product owner** (ship placeholders, leave
> a clear `// TODO: replace with real data` + note in
> `docs/project-planner/04-open-questions.md`):
> - The real `projectType × buyerType (× state)` → channel mapping.
> - The standard buyer personas (name, description, motivations, channels) and
>   which project/buyer types they map to.
> - Which catalog deliverables to suggest per project type / channel mix.
