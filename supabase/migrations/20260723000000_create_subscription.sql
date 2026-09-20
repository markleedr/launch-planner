-- Per-user subscription state, kept in sync from Stripe by trusted server code.
-- One row per user. Reads are RLS-scoped to the owner; there are deliberately NO
-- insert/update/delete policies, so only server-side code using the service-role
-- key (Stripe checkout return + webhook) can write. That prevents a user from
-- granting themselves a subscription from the browser.
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

-- Owner may read their own subscription only.
drop policy if exists subscription_select_own on public.subscription;
create policy subscription_select_own on public.subscription
  for select using (auth.uid() = user_id);

-- Reuse the hardened updated_at trigger function (search_path pinned).
drop trigger if exists set_subscription_updated_at on public.subscription;
create trigger set_subscription_updated_at
  before update on public.subscription
  for each row execute function public.set_updated_at();
