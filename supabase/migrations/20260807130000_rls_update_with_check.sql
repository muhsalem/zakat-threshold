-- إصلاح ثغرة أمان حقيقية: سياسات UPDATE على profiles/zakat_records/notifications
-- ومساحة تخزين pdf-reports كانت تفتقد WITH CHECK — أي أن USING تُقيّد أي الصفوف
-- يمكن للمستخدم *رؤيتها* للتحديث، لكن لا تُقيّد قيمة user_id/المسار *الناتجة* بعد
-- التحديث. عملياً كان بإمكان مستخدم منفِّذ لـ
--   UPDATE public.zakat_records SET user_id = '<ضحية>' WHERE id = '<سجلي>'
-- نقل سجله لحساب آخر (أو العكس)، وبالمثل لـ profiles/notifications، ونقل ملفات
-- pdf-reports خارج مجلده عبر تعديل storage.objects.name.
--
-- ALTER POLICY يضيف WITH CHECK دون حذف/إعادة إنشاء السياسة (لا تغيير بصلاحيات
-- SELECT الأصلية عبر USING، فقط تقييد إضافي على القيمة الناتجة بعد UPDATE).

ALTER POLICY "update own profile" ON public.profiles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "update own records" ON public.zakat_records
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "update own notifications" ON public.notifications
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY "pdf_reports_update_own" ON storage.objects
  USING (bucket_id = 'pdf-reports' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'pdf-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- تقييد إضافي: attachment_audit_log INSERT كان مفتوحاً لأي authenticated رغم أن
-- الغرض تسجيل عبر trigger فقط — منح كتابة مباشرة يسمح بتزوير سجل تدقيق. نمنع
-- الكتابة المباشرة ونُبقيها فقط عبر service_role (المُستخدَم من الدوال SECURITY DEFINER).
DROP POLICY IF EXISTS "attachment_audit_insert" ON public.attachment_audit_log;
