-- Send the new sign-up alert to admin@projectprofile.agency instead of
-- admin@launchplanner.com.au, which nobody monitors.

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
    'admin@projectprofile.agency',
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

revoke all on function public.queue_admin_signup_email(uuid, text, text, timestamptz)
  from public, anon, authenticated;
