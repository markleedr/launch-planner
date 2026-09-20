# Project Planner — Architecture & Technical Spec

Status: **Draft for build** · Date: 2026-06-20

## 1. Stack

| Layer       | Choice                                                              | Notes                                                              |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Framework   | **TanStack Start** (+ Router, Query)                                | Already in repo; SSR + server functions via Nitro.                 |
| UI runtime  | **React 19** + TypeScript                                           | Existing.                                                          |
| Styling/UI  | **Tailwind v4** + **shadcn/ui**                                     | Full component set already vendored.                               |
| Charts      | **recharts** (cost-over-time); **custom Gantt**                     | Recharts isn't a Gantt; build a lightweight custom Gantt (see §6). |
| Forms       | **react-hook-form** + **zod**                                       | Existing; shared zod schemas for client + server validation.       |
| Dates       | **date-fns** + **rrule** (new dep)                                  | `rrule` for recurrence expansion (or hand-rolled — see §5).        |
| Server data | **Supabase** (Postgres, Auth, Storage, RLS)                         | New. Access via `@supabase/supabase-js` + generated types.         |
| Billing     | **Stripe** (Checkout + Customer Portal + webhooks)                  | New. Webhooks handled by a Nitro server route.                     |
| PDF         | **@react-pdf/renderer** or server-side print (new dep)              | Decide in E9; default `@react-pdf/renderer`.                       |
| State       | TanStack Query (server cache) + local component state / small store | Derived budget/CPM computed client-side from cached project data.  |

**New dependencies to add:** `@supabase/supabase-js`, `stripe`, `rrule` (or
custom), a PDF lib. Keep additions minimal; everything else already exists.

## 2. High-level system design

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TanStack Router)                          │
│  ├─ Intake wizard        ├─ Deliverables/budget               │
│  ├─ Schedule / Gantt      ├─ Contacts/suppliers               │
│  ├─ Critical path/checklist  ├─ Media calculator              │
│  └─ Summary / share / PDF                                      │
│        │  TanStack Query (queries + mutations)                 │
└────────┼───────────────────────────────────────────────────────┘
         │ server functions / API routes (Nitro)
┌────────▼───────────────────────────────────────────────────────┐
│  Server (TanStack Start server fns + Nitro routes)             │
│  ├─ Auth guard (Supabase session)                             │
│  ├─ Stripe webhooks  ├─ Share-link resolver (public)          │
│  └─ Recommendation/seed reads                                  │
└────────┼───────────────────────────────────────────────────────┘
         │ supabase-js (service role on server / RLS on client)
┌────────▼───────────────────────────────────────────────────────┐
│  Supabase: Postgres (+RLS) · Auth · Storage (PDFs/assets)      │
└────────────────────────────────────────────────────────────────┘
```

Pure computation (GRV, budget rollups, CPM, recurrence expansion, media calc)
lives in a framework-agnostic **`src/lib/planner/`** TypeScript core so it is
unit-testable and runs on both client and server.

## 3. Data model (ERD)

```
account 1───* membership *───1 auth.user          (membership = future collaborators)
account 1───* project
account 1───* contact
account 1───1 subscription (Stripe)

project 1───* deliverable
project 1───* buyer_persona
project 1───* checklist_item        (critical issues)
project 1───* share_link
project *───* channel (via project_channel)

deliverable *───1 category
deliverable *───* deliverable (dependency, via deliverable_dependency)
deliverable *───1 contact  (owner: agency/dept head)
deliverable *───* contact  (suppliers, via deliverable_supplier)
deliverable 1───1 recurrence_rule (embedded/jsonb or 1:1 row)

-- Seed / catalog (account-agnostic, app-managed) --
deliverable_template *───1 category
recommendation_rule       (projectType+location+buyerType → channels/personas/templates)
channel_rate_card         (media calculator rates per channel)
checklist_template        (seed critical issues by project type)
buyer_persona_template
```

### 3.1 Core tables (Postgres)

> All account-scoped tables carry `account_id` and are protected by RLS:
> `account_id = auth.jwt() -> account`. Timestamps `created_at`/`updated_at` on all.

**account** — `id, name, owner_user_id, created_at`

**membership** — `id, account_id, user_id, role(owner|admin|member), status` _(v1: owner only; enables future collaborators)_

**subscription** — `id, account_id, stripe_customer_id, stripe_subscription_id, plan, status(trialing|active|past_due|canceled), current_period_end, trial_ends_at`

**project**
`id, account_id, name, project_type(house|house_and_land|multi_residential),
units(int), sell_price_cents(bigint), grv_cents(bigint, generated/derived),
media_budget_cents(bigint), launch_date(date), location_suburb, location_state,
buyer_types(text[]), status(draft|active|archived), currency('AUD')`

**contact**
`id, account_id, name, organisation, type(agency_head|department_head|supplier),
role_category, email, phone, linked_user_id(nullable -> future collaborator), notes`

**category** — `id, account_id(nullable for global), name, sort_order` _(seedable defaults + account custom)_

**deliverable**
`id, account_id, project_id, template_id(nullable), category_id, name,
production_cost_cents(bigint), media_cost_cents(bigint),
setup_lead_days(int), start_date(date), end_date(date),
owner_contact_id(nullable), status, notes, source(recommended|catalog|custom)`

**recurrence_rule** _(jsonb on deliverable OR 1:1 table)_
`freq(none|daily|weekly|monthly), interval(int), by_weekday(int[]),
by_hour(int), end_kind(count|until), count(int), until(date)`

**deliverable_supplier** — `deliverable_id, contact_id` _(M:N)_

**deliverable_dependency** — `deliverable_id, depends_on_id` _(M:N, DAG; reject cycles)_

**buyer_persona** — `id, account_id, project_id, name, description, motivations, suggested_channels(text[]), source`

**channel** — `id, code, name` _(global reference list: ppc, paid_social, ooh, radio, tv, press, email, pr, signage, …)_

**project_channel** — `project_id, channel_code, recommended(bool), selected(bool)`

**checklist_item** — `id, account_id, project_id, title, description, category, severity(low|med|high), status(open|reviewed|done), owner_contact_id, notes`

**share_link** — `id, project_id, token(unique), expires_at(nullable), revoked(bool)`

### 3.2 Seed / catalog tables (app-managed, business-tunable)

**deliverable_template** — `id, name, category_id, default_production_cost_cents, default_media_cost_cents, default_setup_lead_days, applicable_project_types(text[]), applicable_channels(text[])`

**recommendation_rule** — `id, project_types(text[]), states(text[]|null), buyer_types(text[]|null), recommend_channels(text[]), recommend_persona_template_ids(int[]), recommend_template_ids(int[]), rationale`

**channel_rate_card** — `id, channel_code, unit(cpm|cpc|per_spot|per_week|flat), rate_cents, assumptions(jsonb)` _(populates media calculator; real values TBD)_

**buyer_persona_template** — `id, name, description, motivations, typical_buyer_types(text[]), suggested_channels(text[])`

**checklist_template** — `id, title, description, category, severity, applicable_project_types(text[])`

## 4. Financial model

- `grv_cents = units * sell_price_cents`.
- `media_budget_pct_of_grv = media_budget_cents / grv_cents`.
- Budget rollup: for each category, `production_total`, `media_total`,
  `total = production + media`; grand totals sum categories.
- Variance: `grand_total vs media_budget` (over/under) and `grand_total / grv`.
- **All money stored as integer cents** (`bigint`) to avoid float errors;
  format to AUD at the edge.

## 5. Recurrence model

Each deliverable optionally repeats. Stored as an RRULE-like struct (see
`recurrence_rule`). The planner core expands a rule over `[start_date, end_date]`
into concrete **occurrences** (date + time) for the Gantt and for cost overlays.

- Use **`rrule`** for robust expansion, or a small hand-rolled expander for the
  limited set we support (daily/weekly/monthly + by-weekday + count/until).
  Recommendation: start with `rrule` to de-risk edge cases.
- Example: "radio every Monday 8am for 6 weeks" →
  `freq=weekly, interval=1, by_weekday=[MON], by_hour=8, end_kind=count, count=6`.

## 6. Gantt component (custom)

Recharts is not a Gantt; build a focused component in `src/components/planner/gantt/`:

- Time axis (week/month/quarter zoom), rows grouped by category → deliverable.
- Each row renders: **lead-in/setup** segment, **active run** bar (start→end),
  **recurrence occurrence** markers, and an optional **cost label**.
- Critical-path deliverables visually emphasised (e.g. accent border).
- Built with absolutely-positioned, Tailwind-styled divs over a date scale
  (compute x from `date-fns` day offsets); virtualise rows if needed.
- A companion **cost-over-time** chart (recharts area/bar) shows spend by week/month.

## 7. Critical Path (CPM) engine

In `src/lib/planner/cpm.ts`, pure functions:

1. Build a DAG from `deliverable_dependency` (reject cycles on save).
2. Each node duration = `setup_lead_days + (end_date - start_date)` (or an
   explicit duration field — decide in E7; default derive from dates + lead time).
3. Forward pass → earliest start/finish (ES/EF); backward pass → latest
   start/finish (LS/LF); `slack = LS - ES`.
4. **Critical path** = nodes with `slack == 0`.
5. Earliest feasible launch = max EF across terminal nodes; compare to
   `project.launch_date` and flag if late.

Exposed as `computeCpm(deliverables, dependencies): CpmResult` and consumed by
the Gantt and the critical-path view.

## 8. Media calculator

`src/lib/planner/media-calc.ts`: given channel + inputs (audience/impressions,
frequency, flight length) and a `channel_rate_card`, compute estimated media
cost. Pure + table-driven so the business can tune rates without code changes.
**Formulas/rates are a dependency** (see open questions).

## 9. Server functions / routes

- `auth`: Supabase session middleware; guard all account-scoped server fns.
- `projects.*`, `deliverables.*`, `contacts.*`, `checklist.*`, `personas.*`:
  CRUD via server functions (zod-validated), RLS enforced in DB.
- `recommend(projectId)`: runs the rules engine server-side, returns channels +
  personas + suggested deliverables (does not auto-mutate; client confirms).
- `stripe/webhook` (Nitro route): handle subscription lifecycle → update
  `subscription` table; gate access.
- `stripe/checkout` & `stripe/portal`: create Checkout / Customer Portal sessions.
- `share/:token` (public route): resolve a `share_link` → read-only summary data.
- `projects/:id/pdf`: render/stream the PDF summary.

## 10. Project structure (proposed)

```
src/
  routes/                     # TanStack routes (file-based)
    _authed/                  # gated: dashboard, projects, project/$id/*
      projects/
      project.$id/
        intake.tsx
        deliverables.tsx
        schedule.tsx          # Gantt
        critical-path.tsx
        contacts.tsx
        summary.tsx
    share.$token.tsx          # public read-only summary
    billing/
  components/
    ui/                       # existing shadcn
    planner/
      intake/  deliverables/  gantt/  budget/  contacts/  cpm/  media-calc/  summary/
  lib/
    planner/                  # pure core: grv.ts, budget.ts, cpm.ts, recurrence.ts, media-calc.ts, recommend.ts
    supabase/                 # client + server + generated types
    stripe/
    money.ts  dates.ts        # AUD + AU-date helpers
  server/                     # server fns / nitro routes
db/
  migrations/                 # SQL migrations
  seed/                       # categories, templates, rules, rate cards, checklist templates
```

## 11. Testing

- **Unit:** the `lib/planner/` core (GRV, budget rollups, CPM, recurrence,
  media calc, recommendation rules) — deterministic, high coverage.
- **Integration:** server functions + RLS (an account cannot read another's data).
- **E2E (smoke):** create project → recommend → edit deliverables → schedule →
  summary → share link/PDF. Add a SessionStart hook so web sessions can run
  `bun run lint` + tests.
