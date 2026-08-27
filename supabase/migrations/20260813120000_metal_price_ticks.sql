-- سجل أسعار المعادن بدقّة الوقت (tick) — إلحاقيّ لا يُدهَس.
--
-- لماذا جدول جديد: كل الجداول القائمة تجميعية بمفتاح فريد يمنع التاريخ اللحظي:
--   nisab_prices        UNIQUE (year, month, country_code)  → صف واحد لكل شهر
--   metal_prices_daily  UNIQUE (price_date, metal, currency) → صف واحد لكل يوم
--   nisab_daily_history UNIQUE (price_date, country_code)    → صف واحد لكل يوم
-- تشغيل خطّاف كل 5 دقائق على أيٍّ منها يدهس الصف نفسه ~288 مرة يومياً ولا
-- يُسجَّل شيء. لذا يُفصَل السجل اللحظي عن التجميعات، وتبقى الأخيرة كما هي
-- لأن الميزات الحالية تقرأ منها.
--
-- الاحتفاظ: دائم بلا حذف. الحجم 2 معدن × 288 قراءة = 576 صفاً يومياً
-- ≈ 210 ألف صف سنوياً — لا يُذكر لـPostgres مع الفهارس أدناه.

CREATE TABLE IF NOT EXISTS public.metal_price_ticks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- لحظة الرصد الفعلية كما وردت من المصدر أو وقت الجلب
  observed_at timestamptz NOT NULL DEFAULT now(),

  -- شريحة الخمس دقائق التي ينتمي إليها الرصد. تُحسب في التطبيق وتُخزَّن
  -- صراحةً (لا كعمود مولَّد) لأن date_trunc على timestamptz ليست IMMUTABLE
  -- فلا تصلح في عمود مولَّد. وجودها يجعل إعادة تشغيل الكرون idempotent:
  -- محاولتان في نفس الشريحة تُحدِّثان صفاً واحداً بدل أن تُنشئا تكراراً.
  bucket_5m timestamptz NOT NULL,

  metal text NOT NULL CHECK (metal IN ('gold','silver')),
  currency text NOT NULL DEFAULT 'USD',

  price_per_gram numeric(18,8) NOT NULL CHECK (price_per_gram > 0),
  price_per_ounce numeric(18,6) NOT NULL CHECK (price_per_ounce > 0),

  source text NOT NULL,
  reliability text NOT NULL DEFAULT 'direct'
    CHECK (reliability IN ('direct','derived','estimated')),
  reliability_score smallint NOT NULL DEFAULT 5
    CHECK (reliability_score BETWEEN 1 AND 5),

  -- تشخيص: أي المصادر جُرِّبت وأخفقت قبل نجاح المصدر المعتمد
  fetch_meta jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (bucket_5m, metal, currency)
);

-- أكثر استعلام متوقَّع: آخر سعر لمعدن، ثم سلاسل زمنية بمدى
CREATE INDEX IF NOT EXISTS idx_metal_price_ticks_metal_time
  ON public.metal_price_ticks (metal, currency, observed_at DESC);

-- لمسح المدى الزمني عبر المعدنين معاً (رسوم بيانية مقارِنة)
CREATE INDEX IF NOT EXISTS idx_metal_price_ticks_time
  ON public.metal_price_ticks (observed_at DESC);

ALTER TABLE public.metal_price_ticks ENABLE ROW LEVEL SECURITY;

-- أسعار المعادن بيانات عامة: القراءة مفتوحة، والكتابة لـservice_role وحده
-- (يتجاوز RLS). لا سياسة INSERT/UPDATE/DELETE لأي دور آخر عمداً.
DROP POLICY IF EXISTS "metal price ticks are public read" ON public.metal_price_ticks;
CREATE POLICY "metal price ticks are public read"
  ON public.metal_price_ticks FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.metal_price_ticks FROM anon, authenticated;

COMMENT ON TABLE public.metal_price_ticks IS
  'سجل أسعار الذهب والفضة كل 5 دقائق، إلحاقي ودائم. التجميعات اليومية في metal_prices_daily.';


-- price_fetch_audit يحصر job_name في ثلاث وظائف يومية، فاسم وظيفة الرصد
-- اللحظي كان سيخالف القيد ويُفشل كل كتابة تدقيق من الخطّاف الجديد.
ALTER TABLE public.price_fetch_audit
  DROP CONSTRAINT IF EXISTS price_fetch_audit_job_check;

ALTER TABLE public.price_fetch_audit
  ADD CONSTRAINT price_fetch_audit_job_check CHECK (
    job_name IN (
      'snapshot-daily-prices',
      'snapshot-daily-nisab',
      'daily-metal-prices-snapshot',
      'metal-price-tick'
    )
  );


-- جدولة الرصد كل 5 دقائق. نفس نمط الخطّافات القائمة: سرّ من Vault يُرسَل
-- في X-Cron-Secret. يتطلب أن يكون CRON_SECRET مضافاً في Vault مسبقاً:
--   select vault.create_secret('<القيمة>', 'CRON_SECRET');
DO $$
DECLARE
  cron_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1);
BEGIN
  BEGIN PERFORM cron.unschedule('metal-price-tick'); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule(
    'metal-price-tick',
    '*/5 * * * *',
    format(
      $$
      SELECT net.http_post(
        url := 'https://project--c0035707-4e26-4f8b-ac7b-8485d608f9ce.lovable.app/api/public/hooks/tick-prices',
        headers := '{"Content-Type":"application/json","apikey":"sb_publishable_EhHXgF5epIaoZtmGLcOu2g_8JvUX7-L","X-Cron-Secret":%L}'::jsonb,
        body := '{"trigger":"cron"}'::jsonb
      );
      $$,
      coalesce(cron_secret, '')
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_cron/pg_net قد لا يكونا مفعّلين في بيئة ما — لا تُفشل الهجرة
  NULL;
END;
$$;
