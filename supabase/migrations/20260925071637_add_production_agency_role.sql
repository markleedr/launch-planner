-- Production/printing suppliers (signage, print collateral) didn't have a
-- role of their own and got lumped under other categories. Recreate the
-- existing role constraint so current projects can add them without
-- weakening the allowed-role boundary.
alter table public.party_directory
  drop constraint if exists party_directory_role_check;

alter table public.party_directory
  add constraint party_directory_role_check check (
    role in (
      'developer',
      'architect',
      'creative_agency',
      'digital_agency',
      'content_agency',
      'media_agency',
      'production_agency',
      'sales_team',
      'builder'
    )
  );
