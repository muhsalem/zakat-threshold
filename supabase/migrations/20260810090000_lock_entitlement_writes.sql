-- إغلاق كتابة المستخدم على صف اشتراكه.
--
-- سياسة "users manage own subscription" كانت FOR ALL بشرط ملكية الصف فقط،
-- بلا أي قيد على plan_id أو amount أو status — وsubscription.tsx يكتب فيها من
-- المتصفح مباشرة. أي مستخدم مسجَّل كان يستطيع:
--   update user_subscriptions set plan_id='enterprise', amount=0, status='active'
--
-- نطاق الأثر: بوابة الميزات تقرأ profiles.plan لا هذا الجدول، فلم يكن ذلك
-- تصعيد صلاحيات بل شارة خطة مضلِّلة و amount مزوَّراً تُبنى منه فاتورة PDF في
-- صفحة التأكيد. يستحق الإغلاق بهذا الوصف، لا أكثر.
--
-- الكاتب الوحيد بعد هذه الهجرة: stripe-webhook عبر service_role (يتجاوز RLS)،
-- ويكتب قيم الصف من جلسة Stripe لا من كتالوج التطبيق. أما الإلغاء والاستئناف
-- الذاتيان فيمران عبر server function مُصادَقة (subscription.functions.ts).

DROP POLICY IF EXISTS "users manage own subscription" ON public.user_subscriptions;

CREATE POLICY "users read own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- سحب صلاحيات الكتابة على مستوى الجدول أيضاً (دفاع بطبقتين: لا سياسة + لا GRANT)
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM authenticated;

-- api_keys: سياسة FOR ALL كانت تتيح للمالك UPDATE مباشراً على أي عمود —
-- رفع rate_limit_per_min (يُقرأ ويُطبَّق في v1-auth.server.ts) وتعديل
-- request_count/last_used_at.
--
-- بحدود دقيقة: request_count لا تقرأه فوترة ولا كشف إساءة — يُزاد في
-- v1-auth.server.ts ويُعرض في لوحة المستخدم فقط، فتزويره يضلّل صاحبه لا أكثر.
-- والحدّ الفعلي المطبَّق هو rate_limit_per_min، ولذا قُصر UPDATE عليه.
--
-- ملاحظة: هذه الهجرة وحدها لا تكفي. مسار الإنشاء كان يقبل rateLimitPerMin
-- من العميل حتى 6000، فالمنع هنا كان يُلتَفّ عليه بإنشاء مفتاح جديد. أُزيل
-- ذلك القبول من apiKeys.functions.ts ليأتي الحد من DEFAULT في المخطط.
--
-- الإنشاء والحذف يمران عبر server functions مُصادَقة تعمل بعميل المستخدم،
-- لذا نُبقي INSERT وDELETE ونمنع UPDATE إلا على عمودَي الإيقاف.
DROP POLICY IF EXISTS "users manage own api keys" ON public.api_keys;

CREATE POLICY "users read own api keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users create own api keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own api keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- الإيقاف/التفعيل (setApiKeyActive) يحتاج UPDATE على active/revoked_at فقط.
-- Postgres لا يقيّد الأعمدة داخل السياسة، فنقيّدها بالمنحة على مستوى العمود:
REVOKE UPDATE ON public.api_keys FROM authenticated;
GRANT UPDATE (active, revoked_at) ON public.api_keys TO authenticated;

CREATE POLICY "users toggle own api keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
