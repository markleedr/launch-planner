-- Provider share links must expire. Existing links keep the expiry they
-- already have. Only a missing expiry is filled in, and only after that is
-- the column made required. The app allows at most 90 days; the check allows
-- 91 so a clock difference cannot reject a legitimate 90-day link.

update public.project_share_link
set expires_at = least(now() + interval '30 days', created_at + interval '90 days')
where expires_at is null
  and created_at + interval '90 days' > now();

update public.project_share_link
set expires_at = created_at + interval '90 days'
where expires_at is null;

do $$
begin
  if exists (
    select 1
    from public.project_share_link
    where expires_at > created_at + interval '91 days'
  ) then
    raise exception
      'A share link expires more than 91 days after it was created. Shorten expires_at before applying this migration so the existing link keeps working.';
  end if;
end $$;

alter table public.project_share_link
  alter column expires_at set default (now() + interval '30 days');

alter table public.project_share_link
  alter column expires_at set not null;

alter table public.project_share_link
  drop constraint if exists project_share_link_expires_within_max;

alter table public.project_share_link
  add constraint project_share_link_expires_within_max
  check (expires_at <= created_at + interval '91 days');
