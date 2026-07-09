-- Prepare target schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;

-- Unschedule existing cron jobs that reference net.*
SELECT cron.unschedule('daily-metal-prices-snapshot');
SELECT cron.unschedule('snapshot-daily-prices');
SELECT cron.unschedule('snapshot-daily-nisab');

-- Recreate pg_net in extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- Reschedule jobs using the new qualified function
SELECT cron.schedule(
  'daily-metal-prices-snapshot',
  '0 3 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-prices',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'snapshot-daily-prices',
  '0 1 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-daily-prices',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'snapshot-daily-nisab',
  '15 1 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-daily-nisab',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);