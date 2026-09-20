# Project Planner — Planning Package

> A project planning platform for property developers. A developer describes a
> project (type, size, price, budget, launch date, location, buyers, channels)
> and the tool generates a complete go-to-market launch plan: **what** is
> required to sell it out, **how much** it will cost, **when** it happens, and
> **who** the buyers are.

This folder is the **plan-now / build-later** package produced during sprint
planning. It is written so any engineer (or a future Claude Code session) can
pick it up and start building without re-discovering scope.

## Documents

| File                                             | What it covers                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [`00-overview.md`](./00-overview.md)             | This file — vision, decisions, glossary, how to read the package                          |
| [`01-prd.md`](./01-prd.md)                       | Product requirements: personas, features, user flows, acceptance-level detail             |
| [`02-architecture.md`](./02-architecture.md)     | Tech stack, system design, data model (ERD), key algorithms (CPM, recurrence, media calc) |
| [`03-sprint-plan.md`](./03-sprint-plan.md)       | Epics → user stories → tasks, estimates, sprint-by-sprint roadmap, milestones             |
| [`04-open-questions.md`](./04-open-questions.md) | Outstanding inputs/decisions needed from the business before/while building               |

## Vision (one paragraph)

A property developer signs in, creates a project, and answers a short intake
(project type, number of units, sell price, media budget, launch date, location,
buyer type, channels). Project Planner calculates the project's **GRV**,
recommends a **channel mix**, **buyer personas**, and a starter list of
**deliverables** (PPC ads, billboards, press ads, landing page, website,
finishes board, etc.). The developer refines the deliverables — adjusting
production cost, media cost, timing, recurrence, and assigning an agency or
department head and suppliers to each. Everything rolls up into a **budget
breakdown**, a **Gantt-charted marketing schedule**, a **critical path** (with a
risk checklist), and a shareable **summary** with PDF export.

## Decisions locked during intake (2026-06-20)

These were confirmed with the product owner before planning:

1. **Deliverable of the planning session** — full sprint plan + spec; implement later.
2. **Media calculator** — rebuilt natively inside Project Planner (not embedded/iframed). Real rate cards/formulas to be supplied by the business.
3. **Product scope** — full SaaS: auth, persisted projects, **and** billing/subscriptions.
4. **Backend stack** — **Supabase** (Postgres + Auth + Storage + RLS) and **Stripe** (subscriptions).
5. **Recommendation engine** — deterministic **rules + curated templates** (predictable, editable, seedable); no LLM dependency in v1.
6. **Critical path** — **both** a computed Critical Path Method engine (from deliverable dependencies) **and** a curated risk/issue checklist.
7. **People model** — agencies / department heads / suppliers are **contact records** in v1, architected so they can be upgraded to invited collaborators later.
8. **Outputs** — interactive in-app budget spreadsheet, **PDF summary export**, and a **shareable read-only web link**. (CSV/Excel deferred.)
9. **Financial model** — `GRV = number of units × sell price`; currency **AUD**; media budget entered as a dollar amount and displayed as a **% of GRV** benchmark.

## Existing foundation (what we build on)

The repo (`project-base-2`) is a Lovable-connected **TanStack Start** project:

- **Framework:** TanStack Start + TanStack Router + TanStack Query, **React 19**, TypeScript, Nitro server.
- **UI:** Tailwind v4 + the full **shadcn/ui** component set already vendored in `src/components/ui`.
- **Charts:** `recharts`. **Forms:** `react-hook-form` + `zod`. **Dates:** `date-fns`. **Toasts:** `sonner`.
- **Runtime/tooling:** Bun, Vite 8, ESLint, Prettier.

> ⚠️ **Lovable note:** this branch syncs back to Lovable. Do **not** force-push,
> rebase, or squash already-pushed commits, and keep the branch in a working
> (buildable) state at all times.

## Glossary

| Term                         | Meaning                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **GRV**                      | Gross Realisation Value — total expected sales revenue of the project (`units × sell price`).              |
| **Deliverable**              | A marketing/production item created to help sell the project (e.g. landing page, billboard, PPC campaign). |
| **Production cost**          | One-off cost to create/produce a deliverable (e.g. printing, design, build).                               |
| **Media cost**               | Cost to run/place a deliverable over time (e.g. 6 months of billboard placement, a TV flight).             |
| **Channel**                  | A medium used to reach buyers (PPC, paid social, OOH/outdoor, radio, TV, press, email, PR, signage).       |
| **Buyer type / persona**     | The intended purchaser segment (e.g. owner-occupier, investor, downsizer, first-home buyer).               |
| **Recurrence**               | A repeating media placement (e.g. "radio, every Monday 8am, for 6 weeks").                                 |
| **Critical path (CPM)**      | The longest dependency chain of scheduled deliverables that determines the earliest possible launch.       |
| **Critical issue checklist** | A curated list of risks/considerations to review and tick off (e.g. "display suite ready before launch?"). |
