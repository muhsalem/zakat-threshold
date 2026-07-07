-- إصلاح URL الـ cron jobs — استبدال رابط Lovable بالرابط الفعلي للموقع
-- يجب تشغيل هذا بعد نشر الموقع على النطاق الفعلي

DO $$
DECLARE
  site_url text := coalesce(current_setting('app.site_url', true), 'https://nisab.app');
BEGIN
  -- إلغاء جدولة cron jobs القديمة التي تستخدم رابط Lovable
  BEGIN
    PERFORM cron.unschedule('daily-metal-prices-snapshot');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.unschedule('snapshot-daily-prices');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- إعادة جدولة بالرابط الصحيح (Edge Function مباشرةً، أكثر موثوقية)
  -- استيراد أسعار المعادن اليومياً في 06:00 UTC (= 09:00 KSA)
  PERFORM cron.schedule(
    'nisab-daily-price-snapshot',
    '0 6 * * *',
    format(
      $$
      SELECT net.http_post(
        url := %L,
        headers := '{"Content-Type":"application/json","Authorization":"Bearer " || current_setting(''app.service_role_key'', true)}'::jsonb,
        body := '{}'::jsonb
      );
      $$,
      (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL' limit 1) || '/functions/v1/snapshot-prices'
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_cron قد لا يكون مفعّلاً — تجاهل بأمان
  NULL;
END;
$$;
