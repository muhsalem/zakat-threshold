CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('snapshot-daily-prices') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='snapshot-daily-prices');

SELECT cron.schedule(
  'snapshot-daily-prices',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-daily-prices',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);