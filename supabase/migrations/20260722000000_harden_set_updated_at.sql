-- Security hardening: pin the trigger function's search_path.
-- A mutable search_path is flagged by Supabase's security advisor; pinning it to
-- an empty schema list means the function resolves nothing implicitly, closing a
-- (low-severity, since this is SECURITY INVOKER) search_path-hijack vector.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
