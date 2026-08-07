-- الكرون-هوكس الثلاثة أدناه (snapshot-prices, snapshot-daily-prices,
-- snapshot-daily-nisab) كانت مجدولة عبر pg_cron بترويسة `apikey` فقط (مفتاح
-- Supabase العام) — أي أن أي مجهول يعرف الرابط يقدر يستدعيها بصلاحية
-- service-role. الكود (src/routes/api/public/hooks/*) أصبح الآن يتطلب
-- ترويسة X-Cron-Secret؛ هذه المigration تُعيد جدولة الكرون ليرسلها.
--
-- ⚠️ خطوة يدوية مطلوبة قبل أن تعمل هذه الوظائف مجدداً: أضف نفس قيمة
-- CRON_SECRET (المستخدَمة في أسرار Cloudflare Workers) كسر Vault بنفس الاسم
-- عبر SQL Editor بلوحة Supabase:
--   select vault.create_secret('<نفس-قيمة-CRON_SECRET>', 'CRON_SECRET');
-- بدون هذه الخطوة ستفشل الكرون-هوكس الثلاثة بـ401 حتى تُضاف القيمة.

DO $$
DECLARE
  cron_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1);
BEGIN
  BEGIN PERFORM cron.unschedule('daily-metal-prices-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('snapshot-daily-prices'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('snapshot-daily-nisab'); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule(
    'daily-metal-prices-snapshot',
    '0 3 * * *',
    format(
      $$
      SELECT net.http_post(
        url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-prices',
        headers := '{"Content-Type":"application/json","apikey":"sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L","X-Cron-Secret":%L}'::jsonb,
        body := '{"source":"cron"}'::jsonb
      );
      $$,
      coalesce(cron_secret, '')
    )
  );

  PERFORM cron.schedule(
    'snapshot-daily-prices',
    '0 1 * * *',
    format(
      $$
      SELECT net.http_post(
        url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-daily-prices',
        headers := '{"Content-Type":"application/json","apikey":"sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L","X-Cron-Secret":%L}'::jsonb,
        body := '{"trigger":"cron"}'::jsonb
      );
      $$,
      coalesce(cron_secret, '')
    )
  );

  PERFORM cron.schedule(
    'snapshot-daily-nisab',
    '15 1 * * *',
    format(
      $$
      SELECT net.http_post(
        url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/snapshot-daily-nisab',
        headers := '{"Content-Type":"application/json","apikey":"sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L","X-Cron-Secret":%L}'::jsonb,
        body := '{"trigger":"cron"}'::jsonb
      );
      $$,
      coalesce(cron_secret, '')
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_cron/الامتداد pg_net قد لا يكونان مفعّلين ببيئة معينة — تجاهل بأمان
  NULL;
END;
$$;
