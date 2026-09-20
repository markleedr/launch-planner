-- Individual customer profiles, reliable notification retries and automated
-- proposal/collateral workflow processing.

create table if not exists public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  organisation_name text not null default '',
  job_title text not null default '',
  phone text not null default '',
  avatar_path text,
  onboarding_completed_at timestamptz,
  welcome_email_queued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

drop policy if exists user_profile_select_own on public.user_profile;
create policy user_profile_select_own on public.user_profile
  for select using (auth.uid() = user_id);

drop policy if exists user_profile_insert_own on public.user_profile;
create policy user_profile_insert_own on public.user_profile
  for insert with check (auth.uid() = user_id);

drop policy if exists user_profile_update_own on public.user_profile;
create policy user_profile_update_own on public.user_profile
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_profile_set_updated_at on public.user_profile;
create trigger user_profile_set_updated_at
  before update on public.user_profile
  for each row execute function public.set_updated_at();

-- Profile images are private. The application issues short-lived signed upload
-- and read URLs after checking the authenticated user on the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Make the existing outbox retryable and idempotent.
alter table public.email_outbox
  add column if not exists idempotency_key text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz;

alter table public.email_outbox
  drop constraint if exists email_outbox_status_check;
alter table public.email_outbox
  add constraint email_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

create unique index if not exists email_outbox_idempotency_idx
  on public.email_outbox (idempotency_key)
  where idempotency_key is not null;

drop index if exists email_outbox_pending_idx;
create index email_outbox_pending_idx
  on public.email_outbox (coalesce(next_attempt_at, created_at))
  where status in ('pending', 'failed', 'skipped');

-- Run the server-side project workflow worker every minute. Lovable's email
-- setup stores the server credential in Supabase Vault under this name.
do $$
declare
  existing_job bigint;
begin
  select jobid
  into existing_job
  from cron.job
  where jobname = 'process-project-workflows'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end
$$;

select cron.schedule(
  'process-project-workflows',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://launchplanner.com.au/api/workflows/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'email_queue_service_role_key'
            limit 1
          ),
          'missing'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
