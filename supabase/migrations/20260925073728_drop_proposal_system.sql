-- Drops the contractor-proposal/quote-comparison/delivery-tracking system
-- (the "Quotes" page and everything behind it). Nothing in the app could
-- reach this anymore after the auto-send price-request button was removed,
-- and it had zero real customer usage - only one test row on the owner's
-- own example project, created seconds before this migration.
--
-- Kept untouched: party_directory, project_party (the contractor directory),
-- app_notification, email_outbox, project_share_link, and their RLS
-- policies/helper functions (owns_project, is_party_user).

-- Tables (CASCADE drops their own RLS policies, triggers and foreign keys).
-- Children before parents, though CASCADE makes the order defensive rather
-- than strictly required.
drop table if exists public.collateral_file cascade;
drop table if exists public.collateral_version cascade;
drop table if exists public.collateral_request cascade;
drop table if exists public.deliverable_message cascade;
drop table if exists public.deliverable_thread cascade;
drop table if exists public.proposal_variation cascade;
drop table if exists public.proposal_revision cascade;
drop table if exists public.deliverable_revision cascade;
drop table if exists public.contractor_proposal cascade;
drop table if exists public.deliverable_brief cascade;

-- RLS helper functions that only existed for the tables above.
drop function if exists public.can_access_proposal(uuid);
drop function if exists public.can_access_thread(uuid);

-- Storage: drop the access policy for the collateral-upload bucket. The
-- bucket itself (confirmed empty, 0 objects) can't be dropped via SQL -
-- Supabase blocks direct deletes on storage.buckets and requires the
-- Storage API/dashboard instead. It's left behind, inert (no policies, no
-- objects); remove it from Storage in the dashboard if you want it gone.
drop policy if exists "collateral_owner_or_contractor_read" on storage.objects;
