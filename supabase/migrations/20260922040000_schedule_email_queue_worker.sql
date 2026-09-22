-- The email_infra migration built a pgmq-based auth_emails/transactional_emails
-- queue and documented a "process-email-queue" cron job to drain it every 5
-- seconds, but that job (and its vault secret) were never actually created on
-- this project. Nothing pulls messages out of the queue, so signup
-- confirmation, password reset, magic-link and invite emails render and
-- enqueue successfully but are never sent. This schedules the missing worker,
-- reusing the same vault secret and Bearer-auth pattern as
-- process-project-workflows.
--
-- Update this URL alongside process-project-workflows's when the
-- launchplanner.com.au custom domain is connected.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'process-email-queue' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end
$$;

select cron.schedule(
  'process-email-queue',
  '5 seconds',
  $job$
    select net.http_post(
      url := 'https://base-layer-start.lovable.app/lovable/email/queue/process',
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
