# Project Planner — Sprint Plan & Backlog

Status: **Draft for build** · Date: 2026-06-20

## Planning assumptions

- **Team:** 1–2 full-stack engineers + part-time design/PM (the product owner).
- **Cadence:** 2-week sprints. **Velocity assumed:** ~20 story points / sprint
  (tune after Sprint 1).
- **Estimation:** Fibonacci story points (1, 2, 3, 5, 8, 13). 1 pt ≈ ½ day; 8 pt
  ≈ most of a sprint for one dev. Estimates are for planning, not commitments.
- **Definition of Done:** code + unit tests (for `lib/planner` logic) + lint
  passing + RLS verified for account-scoped data + buildable branch (Lovable
  stays green) + brief doc/changelog note.

## Release plan

| Release                     | Sprints | Theme                                                                                                       |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| **R0 — Walking skeleton**   | S1      | Auth, account, billing scaffold, app shell, planner core lib. A logged-in user can create an empty project. |
| **R1 — MVP plan**           | S2–S4   | Intake + financials, deliverables + budget, contacts, recommendations. A developer can build a costed plan. |
| **R2 — Schedule & insight** | S5–S6   | Marketing schedule + Gantt, recurrence, CPM + critical-issue checklist, media calculator.                   |
| **R3 — Output & launch**    | S7      | Summary, in-app spreadsheet, PDF export, shareable link, billing hard-gate, polish/QA. **Paid v1 launch.**  |

> ~7 sprints (~14 weeks) to paid v1 with one dev; faster with two. Sequence is
> driven by the build critical path in §"Build dependencies".

---

## Epics overview

| Epic    | Title                                          | Est (pts) | Release |
| ------- | ----------------------------------------------- | --------- | ------- |
| **E1**  | Foundation, infra & app shell                  | 18        | R0      |
| **E2**  | Project intake & financial model               | 16        | R1      |
| **E3**  | Recommendation engine (rules + templates)      | 18        | R1      |
| **E4**  | Deliverables & budget                          | 21        | R1      |
| **E5**  | Contacts & suppliers                           | 13        | R1      |
| **E6**  | Marketing schedule & Gantt                     | 24        | R2      |
| **E7**  | Critical path (CPM) & critical-issue checklist | 18        | R2      |
| **E8**  | Native media calculator                        | 11        | R2      |
| **E9**  | Summary, spreadsheet, PDF & sharing            | 18        | R3      |
| **E10** | Billing, paywall & launch hardening            | 16        | R0/R3   |
|         | **Total**                                      | **~173**  |         |

---

## E1 — Foundation, infra & app shell (R0)

**Goal:** secure, multi-tenant skeleton on Supabase + Stripe with the planner core lib in place.

- **E1-S1 (3)** Add & configure Supabase (`@supabase/supabase-js`, env, client/server helpers, generated types).
  _AC:_ server fns can read/write Postgres; envs documented in README; no secrets committed.
- **E1-S2 (5)** Auth: sign up / sign in / sign out (Supabase Auth); session middleware; `_authed` route guard.
  _AC:_ unauthenticated users are redirected; authed users land on dashboard.
- **E1-S3 (3)** Account + membership model + RLS baseline; on first login create an account + owner membership.
  _AC:_ every account-scoped query is RLS-protected; an account cannot read another's rows (test).
- **E1-S4 (3)** App shell: nav/sidebar, dashboard (project list, "New project"), AU/AUD locale helpers (`money.ts`, `dates.ts`).
  _AC:_ dashboard lists the account's projects; currency/date format = AUD/DD-MM-YYYY.
- **E1-S5 (2)** Planner core lib scaffolding (`src/lib/planner/`) + test harness; `computeGrv`.
  _AC:_ `grv = units × sell price` unit-tested.
- **E1-S6 (2)** SessionStart hook + CI: `bun run lint` and unit tests run in web sessions / CI.
  _AC:_ lint + tests runnable via one command; documented.

## E2 — Project intake & financial model (R1)

**Goal:** create/edit a project and see GRV + media-budget-as-%-of-GRV.

- **E2-S1 (5)** Project CRUD (create/read/update/archive) server fns + zod schemas + RLS.
- **E2-S2 (5)** Intake wizard UI (type, units, sell price, media budget, launch date, location, buyer types, channels) with react-hook-form + zod.
  _AC:_ all fields persisted; validation on each step; label adapts by project type.
- **E2-S3 (3)** Financial panel: live GRV, media budget % of GRV, AUD formatting.
  _AC:_ GRV and % recompute live as inputs change.
- **E2-S4 (3)** Channels & buyer-types reference data + multi-select; "Recommend for me" entry point (wires to E3).

## E3 — Recommendation engine (rules + templates) (R1)

**Goal:** deterministic channel/persona/deliverable recommendations.

- **E3-S1 (3)** Seed schema + loader for `recommendation_rule`, `buyer_persona_template`, `deliverable_template`, `category`.
- **E3-S2 (5)** `recommend()` core (pure): inputs → ranked channels + personas + suggested deliverables, with rationale. Unit-tested.
- **E3-S3 (3)** `recommend(projectId)` server fn returning suggestions (no auto-mutation).
- **E3-S4 (5)** Recommendation review UI: accept/edit/remove suggestions; "add your own"; on accept, materialise into project (channels, personas, deliverables).
- **E3-S5 (2)** Seed initial rules/personas/templates with **placeholder** business content (flagged for real data — see open questions).

## E4 — Deliverables & budget (R1)

**Goal:** manage deliverables grouped by category with live running totals.

- **E4-S1 (5)** Deliverable CRUD server fns + zod + RLS; category model (global seed + account custom).
- **E4-S2 (5)** Deliverables list UI grouped by category; add-from-catalog and add-custom; inline editing of name/costs.
- **E4-S3 (3)** Budget rollups (`budget.ts`, pure): per-category production/media/total + grand total. Unit-tested.
- **E4-S4 (3)** Budget panel: subtotals, grand total, variance vs media budget and vs GRV (over/under flags).
- **E4-S5 (3)** Cost override UX: adjust production/media per deliverable; totals recompute live; autosave.
- **E4-S6 (2)** Assign **owner** (agency/dept head contact) to a deliverable (depends on E5 contact model).

## E5 — Contacts & suppliers (R1)

**Goal:** a contacts directory and supplier-to-deliverable allocation.

- **E5-S1 (3)** Contact CRUD (name, org, type, role category, email, phone) + RLS; `linked_user_id` nullable for future collaborators.
- **E5-S2 (3)** Contacts directory UI (list/add/edit/filter by type).
- **E5-S3 (3)** Assign supplier(s) to deliverables (M:N) + show owner/suppliers on each deliverable.
- **E5-S4 (4)** Supplier checklist view: roles → suppliers → deliverables, with tick-off ("who can do what") for delegation planning.

## E6 — Marketing schedule & Gantt (R2)

**Goal:** schedule deliverables with timings + recurrence on a Gantt with cost overlays.

- **E6-S1 (3)** Add `setup_lead_days`, start/end dates, recurrence rule to deliverables (schema + forms).
- **E6-S2 (5)** Recurrence core (`recurrence.ts`, pure): expand rule → occurrences over a range (use `rrule`). Unit-tested incl. "every Monday 8am for 6 weeks".
- **E6-S3 (8)** Custom **Gantt** component: time axis + zoom, rows by category→deliverable, lead-in/active bars, recurrence markers, critical-path emphasis.
- **E6-S4 (3)** Cost overlay: per-bar cost labels + cost-over-time chart (recharts).
- **E6-S5 (3)** Drag/edit dates from Gantt (or inline date edit) → schedule + totals stay in sync.
- **E6-S6 (2)** Timeline anchoring to launch date; warn on items scheduled after launch.

## E7 — Critical path (CPM) & critical-issue checklist (R2)

**Goal:** computed critical path plus a curated risk checklist.

- **E7-S1 (3)** Dependency model (`deliverable_dependency`, DAG) + cycle rejection on save; dependency-edit UI.
- **E7-S2 (5)** `computeCpm()` core (pure): ES/EF/LS/LF, slack, critical path, earliest feasible launch. Unit-tested.
- **E7-S3 (3)** Critical-path view: highlight critical chain on Gantt; show slack; flag late vs launch date.
- **E7-S4 (3)** Critical-issue checklist: seed `checklist_template` by project type; CRUD items (status/severity/owner/notes).
- **E7-S5 (2)** Checklist UI with tick-off, filtering, and progress indicator.
- **E7-S6 (2)** Seed initial checklist templates with **placeholder** content (flagged for real data).

## E8 — Native media calculator (R2)

**Goal:** estimate media cost per channel from inputs + rate cards.

- **E8-S1 (2)** `channel_rate_card` schema + seed loader (placeholder rates, flagged for real data).
- **E8-S2 (4)** `media-calc.ts` core (pure): inputs (audience/impressions, frequency, flight) × rate card → estimated media cost. Unit-tested.
- **E8-S3 (3)** Media calculator UI; output can populate a deliverable's media cost and/or project media budget.
- **E8-S4 (2)** Integrate calculator into intake (seed media budget) and deliverable edit.

## E9 — Summary, spreadsheet, PDF & sharing (R3)

**Goal:** shareable, exportable project summary.

- **E9-S1 (5)** Summary overview page: facts, GRV, budget vs GRV, channel mix, personas, schedule highlights, critical path + top risks.
- **E9-S2 (3)** In-app **budget spreadsheet**: grouped table (category→deliverable→prod/media/total) with subtotals + grand total.
- **E9-S3 (5)** **PDF export** (`@react-pdf/renderer` or print route): branded overview + budget + Gantt snapshot + checklist.
- **E9-S4 (3)** **Shareable link**: tokenised public read-only summary route; create/revoke/expire.
- **E9-S5 (2)** Branding/theme pass for summary + PDF (ProjectProfile look — assets TBD).

## E10 — Billing, paywall & launch hardening (R0 scaffold → R3 enforce)

**Goal:** Stripe subscriptions and the paid gate.

- **E10-S1 (3)** Stripe setup: products/prices, `stripe` SDK, checkout session server fn. _(R0)_
- **E10-S2 (3)** Stripe webhook route → `subscription` table lifecycle (trialing/active/past_due/canceled). _(R0)_
- **E10-S3 (2)** Customer Portal link (manage/cancel).
- **E10-S4 (3)** Paywall gating: trial → paid; enforce plan limits; read-only mode on expiry/failure. _(final gating matrix — see open questions)_
- **E10-S5 (3)** Billing UI: plan selection, current status, trial countdown.
- **E10-S6 (2)** Launch hardening: empty/error/loading states, audit pass, RLS review, smoke E2E.

---

## Sprint-by-sprint

| Sprint | Focus                               | Stories                  | ~Pts |
| ------ | ------------------------------------ | ------------------------- | ---- |
| **S1** | Skeleton + billing scaffold         | E1 (all), E10-S1, E10-S2 | 24   |
| **S2** | Intake + financials                 | E2 (all), E5-S1          | 19   |
| **S3** | Deliverables + budget               | E4 (all)                 | 21   |
| **S4** | Recommendations + contacts          | E3 (all), E5-S2..S4      | 28   |
| **S5** | Schedule + Gantt                    | E6 (all)                 | 24   |
| **S6** | CPM + checklist + media calc        | E7 (all), E8 (all)       | 29   |
| **S7** | Summary/export/share + paywall + QA | E9 (all), E10-S3..S6     | 28   |

> S4 and S6 are heavy — split across two devs or pull the lower-priority story
> (e.g. E5-S4 supplier checklist, E8 polish) into the next sprint if velocity
> proves lower than assumed.

## Build dependencies (critical chain)

```
E1 (foundation) ─┬─> E2 (intake/financials) ─> E3 (recommendations) ─┐
                 ├─> E4 (deliverables/budget) ───────────────────────┼─> E6 (schedule/Gantt) ─> E7 (CPM) ─> E9 (summary/export)
                 └─> E5 (contacts) ─────────────> E4-S6/E5-S3 ────────┘
E10 billing scaffold runs alongside E1; paywall enforced in R3 (with E9).
E8 media calc depends only on E1+E2; can slot any time in R2.
```

- **Longest path (drives the date):** E1 → E4 → E6 → E7 → E9. Protect these.
- E3 (recommendations) and E5 (contacts) are parallelisable with E4.
- E8 (media calc) and E10 (billing) are loosely coupled and can fill gaps.

## Milestones / demos

- **M1 (end S1):** Log in, create an empty project, Stripe test checkout works.
- **M2 (end S4):** Build a fully costed plan (intake → recommendations → deliverables → budget → contacts). **MVP demo.**
- **M3 (end S6):** Scheduled Gantt + critical path + checklist + media calculator.
- **M4 (end S7):** Summary + PDF + share link + live paywall. **Paid v1 launch.**

## Risks

- **Media calculator data** (rates/formulas) is an external dependency — blocks
  E8 from being "real". Mitigate: ship with editable placeholder rate cards.
- **Recommendation/checklist content** quality depends on business input — ship
  with placeholders, refine post-MVP.
- **Gantt + CPM** are the most complex build (E6/E7) — de-risk early with the
  pure `lib/planner` core and tests before UI.
- **Stripe webhooks** in a serverless/Nitro context — verify signature handling
  and idempotency early (E10-S2).
