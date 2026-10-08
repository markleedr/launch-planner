-- Email admin@launchplanner.com.au every time a new account is created.
-- The trigger only queues a row in email_outbox. The process-project-workflows
-- cron job (every minute) sends it through Resend, with retries. A failure
-- here must never block a sign-up, so errors are logged and swallowed.

create or replace function public.queue_admin_signup_email(
  p_user_id uuid,
  p_email text,
  p_provider text,
  p_created_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.email_outbox (
    user_id, recipient, template, idempotency_key, payload, status
  ) values (
    p_user_id,
    'admin@launchplanner.com.au',
    'admin_signup',
    'admin-signup:' || p_user_id::text,
    jsonb_build_object(
      'title', 'New Launch Planner sign-up',
      'body', 'Email: ' || coalesce(p_email, 'unknown')
        || E'\nSign-up method: ' || coalesce(p_provider, 'email')
        || E'\nTime (UTC): ' || to_char(p_created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
      'href', null
    ),
    'pending'
  )
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_user_admin_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.queue_admin_signup_email(
      new.id,
      new.email,
      new.raw_app_meta_data ->> 'provider',
      new.created_at
    );
  exception when others then
    raise warning 'admin sign-up notification failed: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.queue_admin_signup_email(uuid, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.handle_new_user_admin_notification()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created_notify_admin on auth.users;
create trigger on_auth_user_created_notify_admin
  after insert on auth.users
  for each row execute function public.handle_new_user_admin_notification();
