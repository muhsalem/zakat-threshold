-- nisab_records: ملكية الصف، وإغلاق قراءة عامة لبيانات شخصية.
--
-- الحالة قبل هذه الهجرة:
--   • القراءة: "Public read nisab_records" ... FOR SELECT USING (true)
--     بلا TO، أي مفتوحة لـanon. والجدول يستقبل من المتصفح
--     owner_label (اسم المستخدم) وnotes (ملاحظات حرّة) —
--     فكل اسم وملاحظة مقروءان لأي حامل للمفتاح العام.
--   • الكتابة: مقصورة على has_role(admin) بعد سلسلة تضييقات سابقة.
--     لكن IndividualTab.tsx يحفظ من حساب المستخدم العادي، فالزر يفشل
--     لكل غير مشرف ويعرض "تعذّر الحفظ" بلا تفسير — ميزة معطّلة صامتة.
--   • لا عمود user_id إطلاقاً، فلا سبيل لقصر الصف على صاحبه. هذا أصل العطب:
--     التضييق السابق عالج العَرَض (منع الجميع) لا السبب (غياب الملكية).

ALTER TABLE public.nisab_records
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- الصفوف القائمة بلا مالك معروف. لا نستطيع نسبتها لأحد، ولا يصح تخمين
-- مالك لبيانات شخصية. تبقى user_id = NULL فتصير غير مرئية للمستخدمين
-- بموجب السياسات أدناه، ويبقى للمشرف وحده الوصول إليها لفرزها أو حذفها.
CREATE INDEX IF NOT EXISTS idx_nisab_records_user ON public.nisab_records(user_id);

-- الافتراضي يملأ المالك تلقائياً فلا يعتمد الأمان على إرسال العميل له
ALTER TABLE public.nisab_records
  ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Public read nisab_records"        ON public.nisab_records;
DROP POLICY IF EXISTS "Admins can insert nisab_records"  ON public.nisab_records;
DROP POLICY IF EXISTS "Admins can update nisab_records"  ON public.nisab_records;
DROP POLICY IF EXISTS "Admins can delete nisab_records"  ON public.nisab_records;

CREATE POLICY "users read own nisab records"
  ON public.nisab_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- WITH CHECK يمنع انتحال مالك آخر حتى لو أرسل العميل user_id صراحةً
CREATE POLICY "users create own nisab records"
  ON public.nisab_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own nisab records"
  ON public.nisab_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own nisab records"
  ON public.nisab_records FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admins manage nisab records"
  ON public.nisab_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- دفاع بطبقتين: لا سياسة لـanon، ولا منح على مستوى الجدول أيضاً.
-- كانت GRANT SELECT, INSERT, UPDATE, DELETE ... TO anon قائمة منذ الإنشاء.
REVOKE ALL ON public.nisab_records FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nisab_records TO authenticated;

COMMENT ON COLUMN public.nisab_records.user_id IS
  'مالك السجل. NULL = صف قديم سابق لإضافة الملكية، مرئي للمشرفين فقط.';
