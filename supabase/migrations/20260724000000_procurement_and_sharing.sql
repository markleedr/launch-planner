-- Complete-release workflow foundation.
--
-- The existing project row remains the owner-scoped aggregate and stores the
-- editable planner snapshot as JSONB. Cross-user workflow data is normalised so
-- contractor access, proposal privacy, immutable revisions, messages, files and
-- provider-specific share links can be protected independently.

create table if not exists public.party_directory (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organisation_name text not null,
  representative_name text not null default '',
  email text,
  phone text,
  website text,
  role text not null check (
    role in (
      'developer',
      'architect',
      'creative_agency',
      'digital_agency',
      'content_agency',
      'media_agency',
      'sales_team',
      'builder'
    )
  ),
  portal_enabled boolean not null default false,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists party_directory_owner_email_idx
  on public.party_directory (owner_user_id, lower(email))
  where email is not null;

create index if not exists party_directory_auth_user_idx
  on public.party_directory (auth_user_id)
  where auth_user_id is not null;

create table if not exists public.project_party (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  party_id uuid not null references public.party_directory(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (project_id, party_id, role)
);

create table if not exists public.deliverable_brief (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  deliverable_id text not null,
  revision integer not null default 1 check (revision > 0),
  name text not null,
  description text not null default '',
  category text not null,
  requirements text not null default '',
  required_formats text[] not null default '{}',
  proposal_deadline timestamptz,
  collateral_cutoff_at timestamptz,
  collection_lead_business_days integer not null default 10
    check (collection_lead_business_days >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, deliverable_id, revision)
);

create index if not exists deliverable_brief_project_deliverable_idx
  on public.deliverable_brief (project_id, deliverable_id, revision desc);

create table if not exists public.contractor_proposal (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.deliverable_brief(id) on delete cascade,
  contractor_party_id uuid not null references public.party_directory(id) on delete cascade,
  status text not null default 'draft' check (
    status in ('draft', 'invited', 'submitted', 'awarded', 'unsuccessful', 'withdrawn', 'expired')
  ),
  current_revision integer not null default 0 check (current_revision >= 0),
  invitation_sent_at timestamptz,
  deadline_warning_sent_at timestamptz,
  submitted_at timestamptz,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, contractor_party_id)
);

create index if not exists contractor_proposal_party_idx
  on public.contractor_proposal (contractor_party_id, status);

create table if not exists public.proposal_revision (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.contractor_proposal(id) on delete cascade,
  revision integer not null check (revision > 0),
  notes text not null default '',
  setup_business_days integer not null default 0 check (setup_business_days >= 0),
  agency_one_off_cents bigint not null default 0 check (agency_one_off_cents >= 0),
  agency_monthly_cents bigint not null default 0 check (agency_monthly_cents >= 0),
  production_unit_cents bigint not null default 0 check (production_unit_cents >= 0),
  production_to_be_confirmed boolean not null default false,
  media_one_off_cents bigint not null default 0 check (media_one_off_cents >= 0),
  media_monthly_cents bigint not null default 0 check (media_monthly_cents >= 0),
  quantity integer not null default 1 check (quantity >= 0),
  months integer not null default 0 check (months >= 0),
  total_cents bigint generated always as (
    agency_one_off_cents
    + case
        when production_to_be_confirmed then 0
        else production_unit_cents * quantity
      end
    + media_one_off_cents
    + (agency_monthly_cents + media_monthly_cents) * months
  ) stored,
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  unique (proposal_id, revision)
);

create table if not exists public.deliverable_revision (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  deliverable_id text not null,
  revision integer not null check (revision > 0),
  source text not null check (source in ('template', 'owner_edit', 'award', 'variation')),
  snapshot jsonb not null,
  proposal_revision_id uuid references public.proposal_revision(id) on delete set null,
  approved_by uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  unique (project_id, deliverable_id, revision)
);

create table if not exists public.proposal_variation (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.contractor_proposal(id) on delete cascade,
  revision integer not null check (revision > 0),
  reason text not null,
  values jsonb not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'withdrawn')),
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  unique (proposal_id, revision)
);

create table if not exists public.deliverable_thread (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique
    references public.contractor_proposal(id) on delete cascade,
  project_id uuid not null references public.project(id) on delete cascade,
  deliverable_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  contractor_party_id uuid not null references public.party_directory(id) on delete cascade,
  delivery_status text not null default 'invitation_sent' check (
    delivery_status in (
      'invitation_sent',
      'proposal_submitted',
      'awarded',
      'in_progress',
      'collateral_requested',
      'collateral_submitted',
      'changes_requested',
      'approved',
      'completed'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliverable_message (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.deliverable_thread(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  body text not null default '',
  attachment_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (length(body) > 0 or cardinality(attachment_names) > 0)
);

create index if not exists deliverable_message_thread_idx
  on public.deliverable_message (thread_id, created_at);

create table if not exists public.collateral_request (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.deliverable_thread(id) on delete cascade,
  cutoff_at timestamptz not null,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sent', 'fulfilled', 'cancelled')),
  sent_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collateral_request_due_idx
  on public.collateral_request (scheduled_for)
  where status = 'scheduled';

create table if not exists public.collateral_version (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.deliverable_thread(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'changes_requested', 'approved')),
  notes text not null default '',
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique (thread_id, version)
);

create table if not exists public.collateral_file (
  id uuid primary key default gen_random_uuid(),
  collateral_version_id uuid not null
    references public.collateral_version(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.app_notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notification_user_idx
  on public.app_notification (user_id, created_at desc);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_outbox_pending_idx
  on public.email_outbox (created_at)
  where status = 'pending';

create table if not exists public.project_share_link (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  provider_name text not null,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  hidden_contact_fields text[] not null default '{}',
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists project_share_link_project_idx
  on public.project_share_link (project_id, created_at desc);

-- Private storage. Authenticated clients receive short-lived signed upload or
-- download URLs only after server-side access checks.
insert into storage.buckets (id, name, public)
values ('project-collateral', 'project-collateral', false)
on conflict (id) do update set public = false;

-- Project hero images are intentionally public because they are embedded in
-- client-facing share pages and exported summaries. Paths are UUID-based and
-- uploads still require a short-lived signed token from an owner-checked server
-- function.
insert into storage.buckets (id, name, public)
values ('project-heroes', 'project-heroes', true)
on conflict (id) do update set public = true;

-- Helper predicates used by read policies. SECURITY DEFINER functions pin their
-- search path and expose booleans only; they do not return protected rows.
create or replace function public.owns_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project p
    where p.id = target_project_id
      and p.user_id = auth.uid()
  );
$$;

create or replace function public.is_party_user(target_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.party_directory party
    where party.id = target_party_id
      and party.auth_user_id = auth.uid()
  );
$$;

create or replace function public.can_access_proposal(target_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contractor_proposal proposal
    join public.deliverable_brief brief on brief.id = proposal.brief_id
    join public.party_directory party on party.id = proposal.contractor_party_id
    join public.project project_row on project_row.id = brief.project_id
    where proposal.id = target_proposal_id
      and (
        project_row.user_id = auth.uid()
        or party.auth_user_id = auth.uid()
      )
  );
$$;

create or replace function public.can_access_thread(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.deliverable_thread thread
    join public.contractor_proposal proposal on proposal.id = thread.proposal_id
    join public.party_directory party on party.id = thread.contractor_party_id
    where thread.id = target_thread_id
      and (
        thread.owner_user_id = auth.uid()
        or (
          party.auth_user_id = auth.uid()
          and proposal.status = 'awarded'
        )
      )
  );
$$;

grant execute on function public.owns_project(uuid) to authenticated;
grant execute on function public.is_party_user(uuid) to authenticated;
grant execute on function public.can_access_proposal(uuid) to authenticated;
grant execute on function public.can_access_thread(uuid) to authenticated;

-- Apply updated_at consistently.
drop trigger if exists party_directory_set_updated_at on public.party_directory;
create trigger party_directory_set_updated_at
  before update on public.party_directory
  for each row execute function public.set_updated_at();

drop trigger if exists contractor_proposal_set_updated_at on public.contractor_proposal;
create trigger contractor_proposal_set_updated_at
  before update on public.contractor_proposal
  for each row execute function public.set_updated_at();

drop trigger if exists deliverable_thread_set_updated_at on public.deliverable_thread;
create trigger deliverable_thread_set_updated_at
  before update on public.deliverable_thread
  for each row execute function public.set_updated_at();

drop trigger if exists collateral_request_set_updated_at on public.collateral_request;
create trigger collateral_request_set_updated_at
  before update on public.collateral_request
  for each row execute function public.set_updated_at();

-- RLS is read-oriented. Privileged, validated mutations run in server
-- functions with the service-role client. Messages and notification read-state
-- are the only safe direct client mutations.
alter table public.party_directory enable row level security;
alter table public.project_party enable row level security;
alter table public.deliverable_brief enable row level security;
alter table public.contractor_proposal enable row level security;
alter table public.proposal_revision enable row level security;
alter table public.deliverable_revision enable row level security;
alter table public.proposal_variation enable row level security;
alter table public.deliverable_thread enable row level security;
alter table public.deliverable_message enable row level security;
alter table public.collateral_request enable row level security;
alter table public.collateral_version enable row level security;
alter table public.collateral_file enable row level security;
alter table public.app_notification enable row level security;
alter table public.email_outbox enable row level security;
alter table public.project_share_link enable row level security;

drop policy if exists party_directory_select on public.party_directory;
create policy party_directory_select on public.party_directory
  for select using (
    owner_user_id = auth.uid()
    or auth_user_id = auth.uid()
  );

drop policy if exists project_party_select on public.project_party;
create policy project_party_select on public.project_party
  for select using (
    public.owns_project(project_id)
    or public.is_party_user(party_id)
  );

drop policy if exists deliverable_brief_select on public.deliverable_brief;
create policy deliverable_brief_select on public.deliverable_brief
  for select using (
    public.owns_project(project_id)
    or exists (
      select 1
      from public.contractor_proposal proposal
      where proposal.brief_id = deliverable_brief.id
        and public.is_party_user(proposal.contractor_party_id)
    )
  );

drop policy if exists contractor_proposal_select on public.contractor_proposal;
create policy contractor_proposal_select on public.contractor_proposal
  for select using (public.can_access_proposal(id));

drop policy if exists proposal_revision_select on public.proposal_revision;
create policy proposal_revision_select on public.proposal_revision
  for select using (public.can_access_proposal(proposal_id));

drop policy if exists deliverable_revision_select on public.deliverable_revision;
create policy deliverable_revision_select on public.deliverable_revision
  for select using (public.owns_project(project_id));

drop policy if exists proposal_variation_select on public.proposal_variation;
create policy proposal_variation_select on public.proposal_variation
  for select using (public.can_access_proposal(proposal_id));

drop policy if exists deliverable_thread_select on public.deliverable_thread;
create policy deliverable_thread_select on public.deliverable_thread
  for select using (public.can_access_thread(id));

drop policy if exists deliverable_message_select on public.deliverable_message;
create policy deliverable_message_select on public.deliverable_message
  for select using (public.can_access_thread(thread_id));

drop policy if exists deliverable_message_insert on public.deliverable_message;
create policy deliverable_message_insert on public.deliverable_message
  for insert with check (
    sender_user_id = auth.uid()
    and public.can_access_thread(thread_id)
  );

drop policy if exists collateral_request_select on public.collateral_request;
create policy collateral_request_select on public.collateral_request
  for select using (public.can_access_thread(thread_id));

drop policy if exists collateral_version_select on public.collateral_version;
create policy collateral_version_select on public.collateral_version
  for select using (public.can_access_thread(thread_id));

drop policy if exists collateral_file_select on public.collateral_file;
create policy collateral_file_select on public.collateral_file
  for select using (
    exists (
      select 1
      from public.collateral_version version
      where version.id = collateral_file.collateral_version_id
        and public.can_access_thread(version.thread_id)
    )
  );

drop policy if exists app_notification_select on public.app_notification;
create policy app_notification_select on public.app_notification
  for select using (user_id = auth.uid());

drop policy if exists app_notification_update on public.app_notification;
create policy app_notification_update on public.app_notification
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists email_outbox_select on public.email_outbox;
create policy email_outbox_select on public.email_outbox
  for select using (user_id = auth.uid());

drop policy if exists project_share_link_select on public.project_share_link;
create policy project_share_link_select on public.project_share_link
  for select using (public.owns_project(project_id));
