-- PostgREST requires table-level SELECT privilege to accept inserts
-- (even with Prefer: return=minimal). RLS still blocks reads because
-- there is no SELECT policy for anon/authenticated.

grant select, insert on table public.leads to anon, authenticated;
