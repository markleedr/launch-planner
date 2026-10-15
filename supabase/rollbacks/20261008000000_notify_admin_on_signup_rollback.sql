-- Undo 20261008000000_notify_admin_on_signup.sql. Run this whole script in the
-- SQL editor. It stops the admin sign-up emails and does not delete any data.

drop trigger if exists on_auth_user_created_notify_admin on auth.users;
drop function if exists public.handle_new_user_admin_notification();
drop function if exists public.queue_admin_signup_email(uuid, text, text, timestamptz);
