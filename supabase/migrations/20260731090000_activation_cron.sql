select cron.schedule(
  'process-dossier-activations',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'http://kong:8000/functions/v1/process-dossier-activations',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "local-dev-cron-secret"}'::jsonb
  );
  $$
);
