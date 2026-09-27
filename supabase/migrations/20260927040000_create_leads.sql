-- Marketing leads captured from public campaign landing pages
-- (e.g. The Urban Developer banner demo). Anon may insert only;
-- no public read. Service role / authenticated admins manage leads.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  plan_snapshot jsonb,
  created_at timestamptz not null default now(),
  constraint leads_email_format check (
    email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  ),
  constraint leads_email_length check (char_length(email) <= 320),
  constraint leads_source_length check (char_length(source) between 1 and 100)
);

create index if not exists leads_source_created_at_idx
  on public.leads (source, created_at desc);

create index if not exists leads_email_idx
  on public.leads (lower(email));

alter table public.leads enable row level security;

revoke all on table public.leads from public, anon, authenticated;

grant insert on table public.leads to anon, authenticated;

create policy leads_public_insert
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- No select / update / delete policies for anon or authenticated:
-- only the service role (bypassing RLS) can read or manage leads.
