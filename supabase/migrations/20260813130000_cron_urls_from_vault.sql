-- إخراج عنوان الموقع ومفتاح النشر من نصّ الجدولة إلى Vault.
--
-- المشكلة: الوظائف الأربع المجدولة (snapshot-prices, snapshot-daily-prices,
-- snapshot-daily-nisab, metal-price-tick) كانت تحمل داخل نصّها:
--   url    := 'https://project--c0035707-….lovable.app/...'   ← نطاق معاينة
--   apikey := 'sb_publishable_…'                              ← مفتاح مثبَّت
-- الأثر: متى زال نطاق المعاينة أو نُشر المشروع على نطاقه الفعلي، تتوقف
-- الوظائف الأربع **بصمت** — لا خطأ ظاهر للمستخدم، فقط أسعار تتجمّد. وأي
-- تغيير للنطاق كان يتطلب تحرير أربعة مواضع في هجرات مختلفة.
--
-- الحل: يُقرأ الاثنان من Vault وقت الجدولة. لتغيير النطاق لاحقاً يكفي
-- تحديث السرّ وإعادة تشغيل هذه الهجرة.
--
-- ⚠️ مطلوب قبل التشغيل — أضف الأسرار الثلاثة في SQL Editor:
--   select vault.create_secret('https://your-domain.com', 'SITE_URL');
--   select vault.create_secret('sb_publishable_…',        'SUPABASE_ANON_KEY');
--   select vault.create_secret('<نفس CRON_SECRET>',       'CRON_SECRET');
-- إن غاب SITE_URL تتراجع الهجرة لنطاق المعاينة الحالي كي لا تنكسر
-- الوظائف القائمة، وتُسجّل تحذيراً.

DO $$
DECLARE
  site_url     text := (select decrypted_secret from vault.decrypted_secrets where name = 'SITE_URL' limit 1);
  anon_key     text := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_ANON_KEY' limit 1);
  cron_secret  text := (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1);
  hdrs         text;
BEGIN
  IF site_url IS NULL OR site_url = '' THEN
    RAISE WARNING 'SITE_URL غير موجود في Vault — الجدولة تبقى على نطاق المعاينة';
    site_url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app';
  END IF;
  -- انزع أي شرطة ختامية لئلا تنتج روابط بشرطتين
  site_url := rtrim(site_url, '/');

  IF anon_key IS NULL OR anon_key = '' THEN
    RAISE WARNING 'SUPABASE_ANON_KEY غير موجود في Vault — يُستخدم المفتاح السابق';
    anon_key := 'sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L';
  END IF;

  IF cron_secret IS NULL OR cron_secret = '' THEN
    RAISE WARNING 'CRON_SECRET غير موجود في Vault — ستفشل الخطّافات بـ401';
    cron_secret := '';
  END IF;

  hdrs := format(
    '{"Content-Type":"application/json","apikey":%s,"X-Cron-Secret":%s}',
    to_json(anon_key)::text, to_json(cron_secret)::text
  );

  BEGIN PERFORM cron.unschedule('daily-metal-prices-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('snapshot-daily-prices');       EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('snapshot-daily-nisab');        EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('metal-price-tick');            EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule('metal-price-tick', '*/5 * * * *', format(
    $q$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"trigger":"cron"}'::jsonb); $q$,
    site_url || '/api/public/hooks/tick-prices', hdrs));

  PERFORM cron.schedule('daily-metal-prices-snapshot', '0 3 * * *', format(
    $q$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"source":"cron"}'::jsonb); $q$,
    site_url || '/api/public/hooks/snapshot-prices', hdrs));

  PERFORM cron.schedule('snapshot-daily-prices', '0 1 * * *', format(
    $q$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"trigger":"cron"}'::jsonb); $q$,
    site_url || '/api/public/hooks/snapshot-daily-prices', hdrs));

  PERFORM cron.schedule('snapshot-daily-nisab', '15 1 * * *', format(
    $q$ SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"trigger":"cron"}'::jsonb); $q$,
    site_url || '/api/public/hooks/snapshot-daily-nisab', hdrs));

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'تعذّرت إعادة الجدولة (pg_cron/pg_net غير مفعّلين؟): %', SQLERRM;
END;
$$;
