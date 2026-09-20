# Project Planner — Complete Release Specification

Status: **Approved for build** · Interview completed: 2026-07-24

This document is the implementation source of truth for the complete release.
Where it conflicts with the earlier planning package, this document wins.

## 1. Product and delivery principles

- Deliver the scope as one complete release, not phased handoffs.
- Each Project Planner account belongs to one person.
- A contractor represents their entire organisation through one contact and one
  persistent login.
- Prefer the option that gives the best user experience and is simplest to
  implement without compromising a sound long-term design.
- Supabase is managed and accessed through Lovable. Schema changes are committed
  as migrations and applied through the Lovable project.
- All money is stored as integer AUD cents. Dates are stored as ISO values and
  displayed using Australian conventions.
- Empty optional information is omitted gracefully. No project-detail field is
  required before a summary or share link can be generated.

## 2. Roles and privacy boundaries

### Project owner

- Owns projects and a private party/contractor directory.
- Creates projects, deliverables, briefs, proposal invitations and deadlines.
- Compares private proposals, awards work, approves variations and collateral,
  creates share links, and exports the final summary.
- Other Project Planner customers can never discover the owner's contacts.

### Portal contractor

- One representative login per contractor organisation.
- Portal-enabled roles are creative agency, digital agency, content agency and
  media agency.
- Supports password login and email magic-link login.
- Sees only invitations, proposals, awarded deliverables, messages and files
  belonging to their organisation.
- Never sees competing contractors, competing prices or competitor status.
- Remains in the owner's private directory after an unsuccessful proposal and
  may be invited to later projects.

### Reference party

- Developer, architect, sales team and builder are informational project
  parties. They are reusable private-directory contacts but do not receive
  portal access or proposal invitations.

### Shared-summary viewer

- Uses a unique, unguessable URL without signing in.
- Each provider gets a distinct link so expiry/revocation/view history is
  independent.
- Links show the same approved project summary, subject to per-link contact
  privacy controls.

## 3. New-project wizard

The owner creates a project through a save-as-you-go wizard. Every step may be
skipped and revisited:

1. Project details
2. Deliverables
3. Media plan
4. Parties and contractors
5. Review and continue to the planner

### Project details

- Name, project type, units, sell price, media budget and launch date.
- Street address, suburb, state and postcode.
- Generated project blurb used as editable placeholder copy.
- A curated placeholder hero-image library; the owner may replace the selected
  image with an upload.
- An automatically generated static location map linked to the corresponding
  Google Maps location.

### Deliverables

- Add from the curated deliverable catalog.
- Add a custom deliverable from scratch.
- Each template has a name, description, category, owner-editable requirements,
  required file formats, setup lead time, costs, quantity, duration and
  dependency.
- Requirements and required formats are locked for contractors once an
  invitation is sent; changes create a new brief revision.

### Media calculation

- The existing media calculator is part of the wizard.
- Accepting its result automatically creates the corresponding media
  deliverables, channel costs and campaign duration.

### Parties and contractors

- Select or create reusable reference parties and portal contractors.
- Assign one contractor to one or many deliverables in one action.
- Multiple contractors may be invited to submit independent proposals for the
  same deliverable.

## 4. Proposal and award workflow

Every contractor/deliverable pairing has a separate, private proposal.
Multiple proposals may be presented together in the contractor portal, but they
are independently versioned, submitted and awarded.

### Invitation

- The owner sets a proposal submission deadline per deliverable.
- The deadline closes submissions automatically unless the owner extends or
  reopens it.
- The initial invitation establishes the contractor's persistent account.
- Invitations and deadline changes generate in-app and email notifications.

### Contractor-editable proposal fields

The brief scope remains owner-controlled. Contractors may edit only:

- optional notes;
- setup time in business days;
- one-off agency cost;
- ongoing monthly agency-management cost;
- third-party production cost;
- third-party-production "to be confirmed" flag;
- one-off media cost;
- ongoing monthly media cost;
- quantity; and
- number of months.

Calculated total:

```text
agency one-off
+ (production cost × quantity)
+ media one-off
+ ((agency monthly + media monthly) × months)
```

"To be confirmed" is available only for third-party production cost and counts
as zero until replaced.

### Submission and award

- Contractors may revise a submission until its deadline.
- Every revision is immutable and retained for audit/comparison.
- The owner compares proposals privately and awards one winning contractor per
  deliverable.
- A submitted proposal never changes the plan automatically.
- Awarding and approving the proposal creates a new deliverable revision,
  preserving the original template values and all earlier revisions.
- Unsuccessful contractors are notified and lose access to that deliverable.
- Unsuccessful contacts remain reusable in the owner's private directory.
- Open and unsuccessful proposals never appear in client-facing output.

### Variations

- Changes to cost or timing after award are formal variations.
- A variation requires owner approval before it updates the active plan.
- Original values and every variation remain in the audit history.

## 5. Delivery, communications and collateral

Each awarded contractor deliverable follows:

```text
invitation sent
→ proposal submitted
→ awarded
→ in progress
→ collateral requested
→ collateral submitted
→ changes requested or approved
→ completed
```

- Each deliverable has its own contractor/owner message thread.
- Messages may include attachments and generate email plus in-app
  notifications.
- The owner sets a collateral cut-off date per deliverable, either manually or
  by applying a standard collection timeframe across the project.
- The system automatically issues the collateral request according to that
  delivery schedule.
- Collateral uploads are versioned.
- Each version has submitted, changes-requested or approved review state.
- Review feedback and replacement uploads remain in the audit trail.

## 6. Contractor portal

The contractor portal provides:

- invitations and deadlines;
- proposal forms and revision history;
- award/loss outcomes;
- awarded deliverable scope, requirements and required formats;
- project and delivery timing;
- approved costing and variations;
- separate message threads per deliverable;
- scheduled collateral requests;
- versioned uploads and review feedback; and
- in-app notifications with read/unread state.

## 7. Client-facing summary

The summary is a presentation surface, not an editing screen. It includes:

- project name, generated/editable blurb and hero image;
- key project facts and financial summary;
- linked map illustration;
- selected channels and buyer personas;
- awarded deliverables and approved budget only;
- schedule and critical path;
- checklist status;
- supplier/party list; and
- developer, architect, creative agency, digital agency, content agency, media
  agency, sales team and builder where supplied.

Party entries support role, company, representative, email, phone and website.

### Sharing

- "Share" creates a unique provider-specific token.
- No navigation or owner controls appear on the shared view.
- Links are individually named, expirable and revocable.
- The owner can hide selected party contact fields per link.
- First-viewed, last-viewed and view-count data are recorded.

## 8. PDF export

- Complete approved summary; sections are not selectively omitted.
- A4 portrait.
- Black and white.
- Minimal professional plain-text styling.
- Footer on every page:
  - `powered by project profile`;
  - developer;
  - project name;
  - export month and year (for example `July 2026`); and
  - current page number and total pages.

## 9. Notifications and email

In-app and email notifications cover:

- account invitation;
- proposal invitation;
- deadline change and approaching deadline;
- proposal submission/revision;
- award/loss decision;
- new message;
- approved/rejected variation;
- scheduled collateral request;
- collateral submission;
- changes requested; and
- collateral approval/completion.

Email delivery is implemented through a provider adapter. Missing production
credentials must not block in-app notifications and are reported as a
configuration action.

## 10. Acceptance criteria

- RLS and server validation prevent owners, contractors and public viewers from
  crossing their privacy boundaries.
- A contractor cannot infer competitor participation or proposal data.
- Every accepted price/timing change is auditable and reversible.
- Proposal totals use the approved formula and integer cents.
- Skipped wizard steps do not block project creation or sharing.
- The contractor portal supports the full invite-to-completion lifecycle.
- Provider-specific share links can be revoked independently.
- PDF output matches the required A4/monochrome/footer specification.
- Typecheck, lint, unit tests and production build pass.
- Browser verification covers owner creation, proposal comparison/award,
  contractor delivery, shared summary and PDF generation.
