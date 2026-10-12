-- Optional qualification answers from the Urban Developer capture forms.
alter table public.leads
  add column if not exists role text,
  add column if not exists next_launch text;
