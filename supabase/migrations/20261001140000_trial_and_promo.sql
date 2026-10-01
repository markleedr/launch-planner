-- Trial end and October promotion redemptions.
-- Trial expiry never deletes users or projects. These columns only record
-- billing state. Existing subscription rows are left in place.

alter table public.subscription
  add column if not exists trial_end timestamptz;

alter table public.subscription
  add column if not exists promo_code text;

-- One redemption per email, Stripe customer, and user. Service role writes.
-- There is no client policy, so browsers cannot read or insert codes.
create table if not exists public.promo_redemption (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer_id text,
  redeemed_at timestamptz not null default now()
);

create unique index if not exists promo_redemption_code_email_idx
  on public.promo_redemption (code, email)
  where email is not null;

create unique index if not exists promo_redemption_code_customer_idx
  on public.promo_redemption (code, stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists promo_redemption_code_user_idx
  on public.promo_redemption (code, user_id)
  where user_id is not null;

alter table public.promo_redemption enable row level security;
