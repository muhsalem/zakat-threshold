
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إلغاء الجدولة السابقة إن وُجدت لتجنب التكرار
DO $$ BEGIN
  PERFORM cron.unschedule('daily-metal-prices-snapshot');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'daily-metal-prices-snapshot',
  '0 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-prices',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $cron$
);
