-- Undo the security-hardening migrations from 20261001193000 through
-- 20261001193400. Run this whole script in the SQL editor. It does not
-- restore a share link's previous empty expiry: backfilled dates stay, and
-- the column becomes optional again. It does not delete project data.
-- Apply this only if the matching app release is rolled back too.

-- 20261001193400_tighten_table_grants.sql
grant all on table public.subscription to anon, authenticated;
grant all on table public.promo_redemption to anon, authenticated;
grant all on table public.party_directory to anon, authenticated;
grant all on table public.project_share_link to anon, authenticated;
grant all on table public.email_outbox to anon, authenticated;
grant all on table public.email_send_log to anon, authenticated;
grant all on table public.email_send_state to anon, authenticated;
grant all on table public.email_unsubscribe_tokens to anon, authenticated;
grant all on table public.suppressed_emails to anon, authenticated;

-- 20261001193300_audit_events.sql
drop trigger if exists promo_redemption_audit on public.promo_redemption;
drop trigger if exists subscription_audit on public.subscription;
drop trigger if exists party_directory_audit on public.party_directory;
drop trigger if exists project_share_link_audit on public.project_share_link;
drop trigger if exists project_audit on public.project;
drop function if exists public.record_audit_event();
drop table if exists public.audit_event;

-- 20261001193200_leads_lockdown.sql
drop index if exists public.leads_email_created_at_idx;
alter table public.leads drop constraint if exists leads_plan_snapshot_size;
grant insert on table public.leads to anon, authenticated;

-- 20261001193100_private_project_heroes.sql
update storage.buckets
set public = true
where id = 'project-heroes';

drop policy if exists "project_heroes_public_read" on storage.objects;
create policy "project_heroes_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'project-heroes');

-- 20261001193000_share_link_expiry.sql
alter table public.project_share_link
  drop constraint if exists project_share_link_expires_within_max;
alter table public.project_share_link
  alter column expires_at drop default;
alter table public.project_share_link
  alter column expires_at drop not null;
