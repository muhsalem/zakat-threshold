-- report_uid (RPT-YYYY-NNNNNN) تسلسلي وقابل للتخمين — استخدامه كمفتاح
-- بحث في نقطة تحقق عامة غير مصادَقة (verify.$reportUid) يتيح تعداد كل
-- التقارير الصادرة (عناوين/أنواع/تواريخ) بمجرد تجربة أرقام متتالية.
-- verify_token عشوائي (UUID، ~122 بت عشوائية) يبقى المفتاح الوحيد
-- المقبول للتحقق العام، بينما report_uid يبقى رقماً مرجعياً بشرياً معروضاً
-- فقط بعد نجاح التحقق بالرمز السري.

ALTER TABLE public.pdf_reports
  ADD COLUMN IF NOT EXISTS verify_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS pdf_reports_verify_token_idx
  ON public.pdf_reports (verify_token);
