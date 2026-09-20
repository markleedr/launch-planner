-- Re-assert the billing table for environments that were connected after the
-- original subscription migration was created. Every statement is idempotent,
-- so existing production data is preserved.
create table if not exists public.subscription (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive',
  plan text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_customer_idx
  on public.subscription (stripe_customer_id);

alter table public.subscription enable row level security;

drop policy if exists subscription_select_own on public.subscription;
create policy subscription_select_own on public.subscription
  for select using (auth.uid() = user_id);

drop trigger if exists set_subscription_updated_at on public.subscription;
create trigger set_subscription_updated_at
  before update on public.subscription
  for each row execute function public.set_updated_at();
