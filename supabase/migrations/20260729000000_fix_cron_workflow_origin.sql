-- The scheduled workflow drainer was POSTing to https://launchplanner.com.au
-- (a domain not yet deployed), so scheduled contractor/collateral reminder
-- emails never fired. Repoint it at the current live origin. Update this URL
-- again when the launchplanner.com.au custom domain is connected.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'process-project-workflows' limit 1;
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
      url := 'https://base-layer-start.lovable.app/api/workflows/process',
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
