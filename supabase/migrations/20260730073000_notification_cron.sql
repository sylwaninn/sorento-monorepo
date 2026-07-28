-- ============================================================================
-- Schedules the two notification jobs. URL/secret below target the local dev
-- stack (kong gateway's in-network hostname); a hosted environment must update
-- both via a follow-up migration or `cron.alter_job` — they differ per project.
-- ============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'send-pending-emails',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'http://kong:8000/functions/v1/send-pending-emails',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "local-dev-cron-secret"}'::jsonb
  );
  $$
);

select cron.schedule(
  'daily-reminders',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'http://kong:8000/functions/v1/daily-reminders',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "local-dev-cron-secret"}'::jsonb
  );
  $$
);
