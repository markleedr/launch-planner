-- Reassert strict per-user isolation for saved projects.
--
-- This migration deliberately removes every existing project policy before
-- recreating the four owner-only policies. PostgreSQL combines permissive
-- policies with OR, so leaving an unexpected broad policy in place could
-- otherwise defeat an otherwise-correct owner policy.

alter table public.project enable row level security;
alter table public.project force row level security;

-- Anonymous callers must never have table privileges. Authenticated callers
-- receive only the operations and writable columns required by the app.
revoke all on table public.project from public, anon, authenticated;
grant select, delete on table public.project to authenticated;
grant insert (user_id, name, data) on table public.project to authenticated;
grant update (name, data) on table public.project to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project'
  loop
    execute format(
      'drop policy if exists %I on public.project',
      existing_policy.policyname
    );
  end loop;
end;
$$;

create policy project_select_own
on public.project
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy project_insert_own
on public.project
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy project_update_own
on public.project
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy project_delete_own
on public.project
for delete
to authenticated
using ((select auth.uid()) = user_id);
