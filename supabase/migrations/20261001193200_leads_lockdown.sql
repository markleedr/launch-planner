-- The public lead form writes through the service role in captureLead.
-- Browsers no longer insert directly. plan_snapshot is capped at 128 KiB,
-- which is several times a full Urban Developer demo plan.

revoke insert on table public.leads from anon, authenticated;

alter table public.leads
  drop constraint if exists leads_plan_snapshot_size;

alter table public.leads
  add constraint leads_plan_snapshot_size
  check (
    plan_snapshot is null
    or octet_length(plan_snapshot::text) <= 131072
  );

create index if not exists leads_email_created_at_idx
  on public.leads (email, created_at desc);
