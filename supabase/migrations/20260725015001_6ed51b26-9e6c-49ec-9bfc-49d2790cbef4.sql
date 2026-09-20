
-- Storage RLS policies. Writes for both buckets are performed exclusively via
-- server-side service_role code and signed upload URLs, so no INSERT/UPDATE/
-- DELETE policies are added for authenticated/anon (they cannot bypass RLS).

drop policy if exists "collateral_owner_or_contractor_read" on storage.objects;
create policy "collateral_owner_or_contractor_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-collateral'
    and exists (
      select 1
      from public.collateral_file cf
      join public.collateral_version cv on cv.id = cf.collateral_version_id
      join public.deliverable_thread dt on dt.id = cv.thread_id
      join public.contractor_proposal cp on cp.id = dt.proposal_id
      join public.party_directory pd on pd.id = cp.contractor_party_id
      where cf.storage_path = storage.objects.name
        and (
          dt.owner_user_id = auth.uid()
          or pd.auth_user_id = auth.uid()
        )
    )
  );

drop policy if exists "project_heroes_public_read" on storage.objects;
create policy "project_heroes_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'project-heroes');
