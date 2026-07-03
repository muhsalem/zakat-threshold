## الإصلاحات المتبقية

بعد المرحلة السابقة (حذف مؤشرات، إخفاء الحاسبة، حماية النموذج، صفحات SEO)، الأعمال المتبقية الأهم:

### 1. ترحيل بيانات المحاسب من localStorage إلى Lovable Cloud
حالياً `src/lib/accountantStore.ts` يعتمد على `localStorage` — البيانات تضيع بين الأجهزة ولا تُشارَك بين المحاسب والعميل.

- إنشاء جدول `accountant_clients` مع RLS: كل محاسب يرى عملاءه فقط (`owner_id = auth.uid()`).
- الأعمدة: `id, owner_id, name, email, kind, currency, country, madhab, fiscal_year, status, hawl_date, nisab, breakdown (jsonb), notes, created_via, last_calc_at, last_calc_amount, created_at, updated_at`.
- جدول `accountant_client_history` للأحداث.
- استبدال `loadClients / saveClients / upsertClient` بدوال Supabase (مع `useQuery` + invalidation).
- تحديث `accountant.tsx` و `accountant.$clientId.tsx` و `client-intake.tsx` لاستعمال الدوال الجديدة.

### 2. ربط نافذة العميل بالمحاسب فعلياً
حالياً `client-intake` يستدعي `newClientFromIntake` ويحفظ محلياً — لن يظهر عند المحاسب على جهاز آخر.
- بعد الإرسال: `insert` في `accountant_clients` مع `owner_id` = المحاسب المستهدف (أو NULL في قائمة انتظار عامة يستقبلها المحاسبون).
- إشعار داخل `notifications` للمحاسب.

### 3. تحسينات صغيرة إضافية
- إضافة head/meta واضح ل `client-intake` و `verify` و `faq`.
- زر «نسخ رابط التقرير» في `certified-report.$recordId.tsx`.
- تنظيف `SEED` (يظل fallback للعرض فقط عند غياب سجلات).

### تنفيذ

```text
migration → أنشئ جدولين + RLS + GRANT
src/lib/accountantStore.ts → أعد الكتابة لدوال async تعتمد supabase
src/routes/_authenticated/accountant.tsx → استبدل التحميل والحفظ
src/routes/_authenticated/accountant.$clientId.tsx → نفس الشيء
src/routes/client-intake.tsx → insert مباشر في الجدول
```

هل أبدأ التنفيذ بهذا الترتيب؟ أم تفضل أن أبدأ فقط بالتحسينات الصغيرة (#3) وأؤجل ترحيل قاعدة البيانات؟
