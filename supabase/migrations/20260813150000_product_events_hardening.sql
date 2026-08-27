-- product_events: منع انتحال النسبة، وحدّ حجم الحمولة.
--
-- السياسة كانت: FOR INSERT TO authenticated, anon WITH CHECK (true)
-- بلا أي قيد على user_id. الأثر:
--   1) انتحال النسبة — أي مجهول يُدرج أحداثاً منسوبة لأي user_id يختاره.
--      والجدول يُقرأ في analyticsQueries.functions.ts لحساب قمع التحويل،
--      فتلوّث الإسناد يُفسد قرارات تُبنى على الأرقام، ويصنع نشاطاً كاذباً
--      على حساب مستخدم بعينه.
--   2) لا حدّ لحجم properties (jsonb) ولا لطول session_id — كتابة مجهولة
--      غير محدودة الحجم، أي مسار إغراق تخزيني رخيص.
--
-- التطبيق (analytics.ts) يرسل user_id = معرّف الجلسة أو null، وsession_id
-- من crypto.randomUUID أو النص الثابت "no-session-storage" — فالقيود أدناه
-- لا تكسر أي استخدام مشروع.

DROP POLICY IF EXISTS "Anyone can log a product event" ON public.product_events;

CREATE POLICY "log own product event"
  ON public.product_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- زائر مجهول: بلا نسبة. مسجَّل: نسبته هو فقط.
    user_id IS NULL OR user_id = auth.uid()
  );

-- حدّ الحمولة: 4 كيلوبايت تكفي لسياق غير حسّاس (مسار، نوع حاسبة، صيغة تصدير)
ALTER TABLE public.product_events
  DROP CONSTRAINT IF EXISTS product_events_properties_size_check;
ALTER TABLE public.product_events
  ADD CONSTRAINT product_events_properties_size_check
  CHECK (pg_column_size(properties) <= 4096);

ALTER TABLE public.product_events
  DROP CONSTRAINT IF EXISTS product_events_session_len_check;
ALTER TABLE public.product_events
  ADD CONSTRAINT product_events_session_len_check
  CHECK (session_id IS NULL OR char_length(session_id) <= 100);

-- الاستعلام السائد: أحداث نافذة زمنية مصنَّفة بالاسم (حساب القمع)
CREATE INDEX IF NOT EXISTS idx_product_events_name_time
  ON public.product_events (event_name, created_at DESC);

COMMENT ON POLICY "log own product event" ON public.product_events IS
  'الزائر المجهول يسجّل بلا نسبة؛ المسجَّل ينسب لنفسه فقط. يمنع تلويث إسناد القمع.';
