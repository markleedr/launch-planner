# Project Planner — Open Questions & Dependencies

These don't block starting the build (the architecture/seed tables are designed
so this content is **data**, not code), but they must be resolved before the
relevant feature is "production-real". Listed by priority.

## Blocking a feature being "real"

1. **Media calculator formulas & rate cards** _(blocks E8 being real)_
   We're rebuilding it natively. Need from ProjectProfile:
   - The exact inputs it takes (audience/impressions? reach & frequency? flight length?).
   - The rate card per channel (TV, radio, OOH/billboard, press, PPC, paid social, …) and units (CPM, CPC, per spot, per week, flat).
   - The output formula(s) and any assumptions/loadings (production vs media split, GST?).
   - A few worked examples to validate against.

2. **Recommendation rules content** _(blocks E3 quality)_
   The mapping from `{project type, location/state, buyer type}` → recommended
   channels + buyer personas + suggested deliverables. We'll seed placeholders;
   need the real domain logic (even a spreadsheet of rules works).

3. **Deliverable catalog & benchmark costs** _(blocks E4 defaults)_
   The canonical list of deliverables (PPC ads, billboards, press ads, landing
   page, website, finishes board, …), their **categories**, and benchmark
   default production/media costs and lead times.

4. **Critical-issue checklist content** _(blocks E7 checklist value)_
   The curated list of critical issues/risks per project type to seed.

## Product decisions to confirm

5. **Billing/plan matrix** — number of plans, prices, trial length, and exactly
   what the paywall gates (project count? PDF export? sharing? team size?).

6. **Buyer-type taxonomy** — the canonical list (owner-occupier, investor,
   downsizer, first-home buyer, etc.) and whether it varies by project type.

7. **Channel taxonomy** — the canonical channel list and display names.

8. **Category taxonomy** — confirm the deliverable category grouping
   (proposed: Digital/Performance, Outdoor, Print/Press, Brand & Collateral,
   Physical/Display, Website/Digital Build, PR/Events).

9. **CPM duration source** — derive task duration from `setup_lead_days + (end −
start)`, or add an explicit duration field? (Default: derive.)

10. **GRV nuance** — confirm single sell price per project is enough for v1, or
    whether staged releases / unit-type mix / per-m² pricing are needed soon
    (currently roadmapped, not in v1).

## Branding / assets

11. **ProjectProfile brand kit** — logo, colours, fonts, PDF letterhead for the
    summary export and shareable link.

## Reference repo

12. **`markleedr/project-planner`** — outside this session's GitHub scope (access
    denied) and the `list_repos`/`add_repo` tools weren't available here. To mine
    it for ideas, either (a) add it to a future session's repo scope, or (b) share
    the relevant code/screens. Not a blocker for planning.
