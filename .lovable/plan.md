## نظرة عامة

إعادة تنظيم المنصة حول نوع حساب المستخدم (فرد / شركة / مؤسسة)، مع تشديد صحة مدخلات الشركة، تبسيط شريط الأدوات، ونقل البحث إلى شريط جانبي ثابت، وإضافة بوابة سرية للمحاسب.

---

## 1) فحص صارم لمدخلات الشركة (Zod)

ملف جديد: `src/lib/validation/companyInputsSchema.ts` باستخدام `zod` مع رسائل عربية واضحة.

القواعد:

- `totalAssets` ≥ 0، رقم صحيح مالي، إجباري.
- `totalEquity` ≥ 0، ولا يتجاوز `totalAssets` (رسالة: "حقوق الملكية لا يمكن أن تتجاوز إجمالي الموجودات").
- `currentAssets` ≤ `totalAssets`.
- `currentLiabilities` ≥ 0 و ≤ `totalAssets`.
- `netIncome` ≥ 0 مع سماح بسالب لكن تنبيه.
- `exemptRatio` بين 0 و 1 (نسبة الملكية المعفاة: أجنبي/حكومي/شرطي).
- مجموع النسب المعفاة (foreign+gov+conditional+nonMuslim) ≤ 1.
- إذا `zakatableRatio = 1 - exempt` انتهى للصفر → منع الحساب مع رسالة.

التطبيق:

- تعديل `CompanyTab.tsx`: زر "احسب/اعتمد" يمرّ عبر `schema.safeParse`. عند الفشل تُعرض قائمة أخطاء أعلى النموذج (bg-destructive/10) وحقول مميّزة بحد أحمر (`aria-invalid`).
- تعطيل زر الاعتماد في `MethodsComparison` حتى تنجح الصحة.
- toast خطأ موحّد.

## 2) شريط جانبي أيسر ثابت + بحث

- استخدام `SidebarProvider` من `@/components/ui/sidebar` في `__root.tsx`.
- مكوّن جديد `src/components/AppSidebar.tsx`:
  - أعلى الشريط: حقل بحث (`Input` + أيقونة) يبحث في: التبويبات، الأدوات، المسارات، الفتاوى، مصطلحات الزكاة (مصدر بيانات محلي `searchIndex.ts`).
  - قائمة تنقّل مختصرة: الحاسبة، السجل، الإشعارات، الأدوات.
  - قابل للطي (`collapsible="icon"`).
- إزالة أي حقل بحث موجود في FloatingDock/Header.

## 3) اختصار "البوابات والأدوات" على "المستشار الذكي"

- تعديل `FloatingDock.tsx` وأي قائمة بوابات: حذف كل الاختصارات عدا "المستشار الذكي" (AI Advisor).
- إزالة بطاقات الأدوات المتعددة من الصفحة الرئيسية وإبقاء بطاقة واحدة تفتح المستشار.

## 4) تسجيل دخول أعلى يسار الصفحة + تمييز نوع الحساب

- زر "دخول/تسجيل" ثابت أعلى يسار الهيدر (خارج الشريط الجانبي).
- صفحة `/auth` تعرض:
  - تبويبين: دخول / تسجيل جديد.
  - عند التسجيل: اختيار إجباري لنوع الحساب (radio): فرد / شركة / مؤسسة — يُحفظ مرة واحدة في `profiles.account_type`.
- Migration: إضافة عمود `account_type` (enum: `individual`, `company`, `institution`) إلى `profiles` مع قيمة افتراضية `individual`.
- تحديث `handle_new_user` لقراءة `raw_user_meta_data->>'account_type'`.

## 5) لوحات مبسّطة موجّهة (Wizard) لكل نوع

مسار محمي `/_authenticated/dashboard` يقرأ `account_type` ويعرض المعالج المناسب:

### لوحة الفرد — `IndividualWizard.tsx`

خطوات موجّهة (Stepper):

1. النقد والبنوك والدين.
2. الذهب والفضة.
3. الأسهم والاستثمارات.
4. عروض التجارة/التجارة الإلكترونية.
5. المراجعة → **تقرير PDF جاهز** (تاريخ الحول، النصاب، الوعاء، الزكاة المستحقّة، مصارف مقترحة).

### لوحة الشركة — `CompanyWizard.tsx`

1. البيانات الأساسية (رأس المال، نوع النشاط).
2. الميزانية المختصرة (موجودات/مطلوبات/حقوق ملكية) — تمرّ عبر فحص §1.
3. نسب الملكية المعفاة.
4. اختيار الطريقة من `MethodsComparison`.
5. المراجعة → تقرير PDF.

### لوحة المؤسسة — `InstitutionWizard.tsx`

مشابهة للشركة لكن مع حقول أوقاف/تبرعات مقيّدة وبند التمييز بين النشاط التجاري والخيري.

كلها تستخدم مكوّنات موجودة (`CashBankSection`, `SecuritiesSection`, ...) داخل خطوات مبسّطة بدلًا من عرض كل التبويبات دفعة واحدة. زر "وضع متقدّم" يفتح اللوحة الحالية الكاملة.

## 6) بوابة المحاسب المخفيّة (لك فقط)

- **مسار سري**: `/_a-console` (غير مذكور في أي قائمة).
- **آلية**: صفحة تعرض حقل "كلمة المرور الرئيسية" أولًا. تُرسل إلى `createServerFn` تقارن بـ `ACCOUNTANT_MASTER_PASSWORD` (secret) بشكل **timing-safe** (`crypto.timingSafeEqual` على SHA-256).
- عند النجاح: يُنشئ/يُفعّل دور `accountant` في `user_roles` للمستخدم الحالي (يجب أن يكون مسجّل دخول)، ثم يعيد التوجيه إلى `/accountant`.
- الوصول إلى `/_authenticated/accountant` يُشترط بـ `has_role(auth.uid(), 'accountant')` عبر `beforeLoad` استدعاء server fn.
- سيُطلب منك تعيين قيمة السر `ACCOUNTANT_MASTER_PASSWORD` بعد الموافقة على الخطة.

## 7) تفاصيل تقنية

- Migration واحدة تضيف: `account_type` على `profiles` + تحديث تريغر `handle_new_user`.
- Server fn `verifyAccountantPassword` + `grantAccountantRole` (يحمل `requireSupabaseAuth`).
- لا مساس بجدول `user_roles` باستثناء INSERT عند نجاح كلمة السر.
- استخدام `zod` (موجود) + `react-hook-form` (إن غير موجود سيُثبَّت).
- شريط البحث يستخدم فهرس محلي `src/lib/searchIndex.ts` (بدون شبكة).

## 8) الملفات المتوقّعة

- إنشاء: `src/lib/validation/companyInputsSchema.ts`, `src/components/AppSidebar.tsx`, `src/lib/searchIndex.ts`, `src/routes/_authenticated/dashboard.tsx`, `src/components/wizards/{Individual,Company,Institution}Wizard.tsx`, `src/routes/_a-console.tsx`, `src/lib/accountantGate.functions.ts`, migration جديدة.
- تعديل: `src/routes/__root.tsx`, `src/components/FloatingDock.tsx`, `src/components/zakat/CompanyTab.tsx`, `src/components/zakat/MethodsComparison.tsx`, `src/routes/auth.tsx` (اختيار نوع الحساب), `src/routes/_authenticated/accountant.tsx` (حماية بدور).

## ملاحظة مهمة

بعد الموافقة سأطلب منك تعيين السر `ACCOUNTANT_MASTER_PASSWORD` كي أستخدمه في البوابة المخفيّة.
