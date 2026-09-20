# Project Planner — Product Requirements (PRD)

Status: **Draft for build** · Owner: Mark (ProjectProfile) · Date: 2026-06-20

## 1. Problem & goal

Property developers launching a project (a house, a house-and-land package, or a
multi-residential building) must plan a marketing campaign to sell it out. Today
this lives in scattered spreadsheets, agency quotes, and email threads. There is
no single tool that turns project inputs into a costed, scheduled, owned launch
plan.

**Goal:** Let a developer go from project inputs → a complete, costed, scheduled,
and assignable launch plan in one sitting, then track and share it.

**Success metrics (v1):**

- A developer can create a project and produce a complete plan (deliverables +
  budget + schedule + summary) in **under 20 minutes**.
- Budget totals always reconcile (sum of deliverables = category totals = grand total).
- Gantt schedule and critical path are derived automatically and stay in sync
  with deliverable edits.
- Subscription paywall converts: only paying accounts can create/keep projects
  beyond the free trial.

## 2. Personas

| Persona                                    | Description                                                         | Primary needs                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Developer / project marketer** (primary) | Owns the project P&L and the launch budget.                         | Fast intake, accurate budget, clear schedule, ability to delegate. |
| **Agency / department head** (assignee)    | Runs delivery of assigned items.                                    | Clear list of what they own, costs, dates. (Contact-only in v1.)   |
| **Supplier** (assignee)                    | Produces a specific deliverable (printer, signwriter, media buyer). | Allocated to roles/deliverables. (Contact-only in v1.)             |
| **Stakeholder / investor** (viewer)        | Reviews the plan.                                                    | Read-only summary via shared link / PDF.                           |

## 3. Scope

### In scope (v1)

Auth + accounts, Stripe subscription/paywall, project intake & financial model,
rules+templates recommendation engine, deliverables & budget, contacts &
suppliers, marketing schedule + Gantt, CPM + critical-issue checklist, native
media calculator, summary with in-app spreadsheet + PDF export + shareable link.

### Out of scope (v1, noted for roadmap)

Invited team collaborators with logins; CSV/Excel export; multi-currency;
LLM-generated recommendations; real-time co-editing; mobile native apps;
integrations with ad platforms for live spend; CRM/lead capture.

## 4. Feature requirements

### 4.1 Accounts, billing & paywall

- Email/password + (optional) OAuth sign-up via Supabase Auth.
- Each user belongs to an **Account** (org). Projects belong to an Account.
- **Stripe** subscription with at least: Free trial → Paid plan(s). Plan gates
  project creation / number of active projects / PDF export & sharing (final
  gating matrix TBD — see open questions).
- Billing portal (Stripe customer portal) for managing payment & cancellation.
- Hard paywall: trial expiry or failed payment → projects become read-only.

### 4.2 Project intake (the wizard)

Collected on project creation, all editable later:

- **Project type:** `house` | `house_and_land` | `multi_residential`.
- **Number of units/apartments** (label adapts to type; for a single house = 1).
- **Sell price** (per unit; AUD).
- **GRV** — auto-calculated `units × sell price`, read-only, prominently shown.
- **Media budget** — entered in AUD; tool shows it as **% of GRV** benchmark.
  (Optionally seedable from the **media calculator** — see 4.8.)
- **Launch date** (target on-market/launch date).
- **Location** — suburb/region + state (drives recommendations).
- **Buyer type(s)** — multi-select from a curated list; can also be recommended.
- **Channels** — multi-select; or **"Recommend for me"** runs the rules engine.

### 4.3 Recommendation engine (rules + templates)

Given `{project type, location, buyer type(s)}`, deterministically produce:

- **Recommended channels** (ranked, with rationale text).
- **Buyer personas** — "who the buyers will be": each persona has a name,
  description, motivations, and suggested channels.
- **Suggested deliverables** — a starter list pre-populated into the project,
  drawn from the deliverable catalog and filtered by project type/channels.
- All recommendations are **suggestions**: fully editable, removable, and the
  user can add their own.
- Rules + templates + benchmark costs are **data** (seeded tables), not
  hard-coded, so the business can tune them. Initial content TBD (open questions).

### 4.4 Deliverables & budget

- A **catalog** of deliverable templates grouped into **categories** (e.g.
  Digital/Performance, Outdoor, Print/Press, Brand & Collateral, Physical/Display,
  Website/Digital Build, PR/Events). Final taxonomy TBD.
- User can **add from catalog** or **create a custom** deliverable.
- Each deliverable has editable: name, category, **production cost**, **media
  cost**, setup/lead time, recurrence, start/end dates, assigned **agency/dept
  head** (contact), assigned **supplier(s)** (contacts), dependencies, notes.
- **Grouping & running totals:** deliverables roll up by category with subtotals
  (production, media, total) and a **grand total**. Compare grand total vs media
  budget and vs GRV (% of GRV). Surface over/under budget.
- Inline editing of any cost; totals recompute live.

### 4.5 Contacts & suppliers

- Account-scoped **contacts directory**: name, organisation/agency, role/role-
  category, email, phone, type (`agency_head` | `department_head` | `supplier`).
- **Supplier checklist:** assign suppliers to **roles**, then allocate roles/
  suppliers to deliverables; tick off "who can do what" to plan delegation.
- A deliverable shows its owner (agency/dept head) and supplier(s).
- Data model designed so a contact can later be linked to an invited user.

### 4.6 Marketing schedule & Gantt

- Each deliverable carries: **production cost**, **media cost**, **timings**
  (lead time to set up/produce), **recurrence** (e.g. radio every Monday 8am for
  6 weeks), **start date**, **end date**.
- **Recurrence model** supports frequency (daily/weekly/monthly), interval, days
  of week, time-of-day, and an end condition (count or until date).
- **Gantt chart** shows, per deliverable/category: setup/lead-in period, active
  run, **recurrence occurrences** (markers), end, and **cost overlay** (cost per
  bar / cost over time). Zoom by week/month/quarter. Items align to the launch
  date and project timeline.

### 4.7 Critical path & critical-issue checklist

- **CPM engine:** deliverables can declare **dependencies** on other
  deliverables. The system computes earliest/latest start/finish, **slack**, the
  **critical path**, and the **earliest feasible launch date**; warns if the
  schedule misses the target launch date.
- Critical-path items are highlighted on the Gantt.
- **Critical-issue checklist:** a curated, editable list of risks/considerations
  (seeded by project type) with status (open/reviewed/done), severity, owner, and
  notes — e.g. "planning approval secured?", "display suite ready before launch?".

### 4.8 Native media calculator

- A built-in calculator that estimates **media cost** per channel from inputs
  (reach/impressions or audience, frequency, flight duration, rate card). Output
  can populate a deliverable's media cost and/or the project media budget.
- Rate cards are **data** (seeded, editable). **Exact formulas/rates must come
  from the ProjectProfile media calculator** (open question / dependency).

### 4.9 Summary, spreadsheet, export & sharing

- **Summary overview:** project facts, GRV, media budget vs GRV, channel mix,
  buyer personas, schedule highlights, critical path & top risks.
- **Budget spreadsheet:** interactive in-app grouped table (category → deliverable
  → production/media/total) with subtotals and grand total.
- **PDF export:** branded summary (overview + budget + Gantt snapshot + checklist).
- **Shareable link:** tokenised read-only web view of the summary (no login).

## 5. Primary user flow (happy path)

1. Sign up / sign in → start free trial (Stripe).
2. **Create project** → intake wizard (type, units, price → GRV, media budget,
   launch date, location, buyer type, channels or "recommend").
3. Review **recommendations** (channels, personas, suggested deliverables) →
   accept/edit.
4. Refine **deliverables**: adjust costs, set timings/recurrence/dates, assign
   agency/dept head + suppliers, group & watch running totals.
5. Open **schedule/Gantt**: tune dates & dependencies; review **critical path**;
   work the **critical-issue checklist**.
6. Open **summary**: review budget spreadsheet; **export PDF** or **share link**.

## 6. Non-functional requirements

- **Auth/security:** Supabase RLS so an account only sees its own data; tokenised
  share links are read-only and revocable.
- **Performance:** budget/CPM/Gantt recompute < 200ms for a typical project
  (≤ ~60 deliverables); recompute is client-side where possible.
- **Reliability:** autosave; no data loss on edits; optimistic UI with rollback.
- **Accessibility:** keyboard-navigable forms, tables, and Gantt; WCAG AA colour.
- **Locale:** AUD currency formatting, AU date format (DD/MM/YYYY).
- **Responsive:** desktop-first (planning is desktop work); usable on tablet.
