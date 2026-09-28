-- Both scheduled jobs still pointed at the Lovable preview origin
-- (base-layer-start.lovable.app) in the migration files, even though the
-- launchplanner.com.au custom domain has been connected and Lovable Cloud is
-- being decommissioned. Someone repointed both jobs live via the SQL editor
-- (they're already calling launchplanner.com.au in production), but that
-- change was never captured in a migration, so a fresh rebuild from this
-- folder would still point them at the old Lovable URL. Recreating both jobs
-- here with the URL they already use live so the repo matches reality.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'process-project-workflows' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  select jobid into existing_job from cron.job
  where jobname = 'process-email-queue' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end
$$;

select cron.schedule(
  'process-project-workflows',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://launchplanner.com.au/api/workflows/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'email_queue_service_role_key'
            limit 1
          ),
          'missing'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'process-email-queue',
  '5 seconds',
  $job$
    select net.http_post(
      url := 'https://launchplanner.com.au/lovable/email/queue/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'email_queue_service_role_key'
            limit 1
          ),
          'missing'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
