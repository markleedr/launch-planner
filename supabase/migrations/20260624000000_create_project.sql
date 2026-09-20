-- Project Planner persistence: one row per saved project.
-- The full planner state is stored as JSONB in `data` (document-style; v1).

create table if not exists public.project (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled project',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_user_id_idx on public.project (user_id);

-- Row Level Security: a user can only see and change their own projects.
alter table public.project enable row level security;

drop policy if exists "project_select_own" on public.project;
create policy "project_select_own" on public.project
  for select using (auth.uid() = user_id);

drop policy if exists "project_insert_own" on public.project;
create policy "project_insert_own" on public.project
  for insert with check (auth.uid() = user_id);

drop policy if exists "project_update_own" on public.project;
create policy "project_update_own" on public.project
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "project_delete_own" on public.project;
create policy "project_delete_own" on public.project
  for delete using (auth.uid() = user_id);

-- Keep updated_at current on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_set_updated_at on public.project;
create trigger project_set_updated_at
  before update on public.project
  for each row execute function public.set_updated_at();
