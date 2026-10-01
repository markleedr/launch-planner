-- Drop write access the browser does not use. Reads that the signed-in app
-- actually issues are kept.
--
-- subscription: src/hooks/use-subscription.ts selects status,
--   current_period_end and trial_end for the signed-in user.
-- party_directory: src/lib/procurement/procurement-store.ts selects the
--   owner's rows. Writes go through server functions on the service role.
-- project_share_link, promo_redemption and the email tables are only touched
--   by server code using the service role.
--
-- project_party and app_notification are unchanged: the browser selects both,
-- and it updates app_notification.read_at.

revoke all on table public.subscription from anon, authenticated;
grant select (user_id, status, current_period_end, trial_end)
  on table public.subscription to authenticated;

revoke all on table public.promo_redemption from anon, authenticated;

revoke all on table public.party_directory from anon, authenticated;
grant select on table public.party_directory to authenticated;

revoke all on table public.project_share_link from anon, authenticated;

revoke all on table public.email_outbox from anon, authenticated;
revoke all on table public.email_send_log from anon, authenticated;
revoke all on table public.email_send_state from anon, authenticated;
revoke all on table public.email_unsubscribe_tokens from anon, authenticated;
revoke all on table public.suppressed_emails from anon, authenticated;
