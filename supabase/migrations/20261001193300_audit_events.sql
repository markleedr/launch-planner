-- Who changed a project, share link, supplier, subscription or promo redemption.
-- user_id is the account that owns the row, so that account can read it.
-- actor_user_id is the signed-in user when the change came from a browser
-- session. Service-role writes (billing, share links) leave the actor empty.
-- The service role bypasses row level security and can read every row.

create table if not exists public.audit_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  actor_user_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  row_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_event_owner_idx
  on public.audit_event (user_id, created_at desc);

alter table public.audit_event enable row level security;

revoke all on table public.audit_event from anon, authenticated, public;
grant select on table public.audit_event to authenticated;
grant all on table public.audit_event to service_role;

drop policy if exists audit_event_select_own on public.audit_event;
create policy audit_event_select_own
  on public.audit_event
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or actor_user_id = (select auth.uid())
  );

create or replace function public.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target jsonb;
  row_pk text;
  owner uuid;
begin
  target := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'subscription' then
    row_pk := target->>'user_id';
    owner := nullif(target->>'user_id', '')::uuid;
  elsif tg_table_name = 'project' then
    row_pk := target->>'id';
    owner := nullif(target->>'user_id', '')::uuid;
  elsif tg_table_name = 'party_directory' then
    row_pk := target->>'id';
    owner := nullif(target->>'owner_user_id', '')::uuid;
  elsif tg_table_name = 'promo_redemption' then
    row_pk := target->>'id';
    owner := nullif(target->>'user_id', '')::uuid;
  elsif tg_table_name = 'project_share_link' then
    row_pk := target->>'id';
    select p.user_id into owner
    from public.project p
    where p.id = nullif(target->>'project_id', '')::uuid;
    if owner is null then
      owner := nullif(target->>'created_by', '')::uuid;
    end if;
  else
    row_pk := coalesce(target->>'id', target->>'user_id', '');
    owner := nullif(target->>'user_id', '')::uuid;
  end if;

  insert into public.audit_event (user_id, actor_user_id, action, table_name, row_id)
  values (owner, auth.uid(), tg_op, tg_table_name, row_pk);

  return coalesce(new, old);
end;
$$;

revoke all on function public.record_audit_event() from public;
grant execute on function public.record_audit_event() to authenticated, service_role;

drop trigger if exists project_audit on public.project;
create trigger project_audit
  after insert or update or delete on public.project
  for each row execute function public.record_audit_event();

drop trigger if exists project_share_link_audit on public.project_share_link;
create trigger project_share_link_audit
  after insert or update or delete on public.project_share_link
  for each row execute function public.record_audit_event();

drop trigger if exists party_directory_audit on public.party_directory;
create trigger party_directory_audit
  after insert or update or delete on public.party_directory
  for each row execute function public.record_audit_event();

drop trigger if exists subscription_audit on public.subscription;
create trigger subscription_audit
  after insert or update or delete on public.subscription
  for each row execute function public.record_audit_event();

drop trigger if exists promo_redemption_audit on public.promo_redemption;
create trigger promo_redemption_audit
  after insert or update or delete on public.promo_redemption
  for each row execute function public.record_audit_event();
