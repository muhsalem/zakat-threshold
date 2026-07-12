## الهدف
تفكيك ملفَي `IndividualTab.tsx` (4251 سطر) و`CompanyTab.tsx` (3419 سطر) إلى مكوّنات أصغر ووحدات حسابية منفصلة، مع **الحفاظ على كامل المنطق والسلوك والواجهة الحالية** — بدون حذف أي حقل أو حساب أو خانة.

## المبادئ
- **بدون حذف**: كل حالة (`useState`), كل `useMemo`, كل حقل إدخال، كل بطاقة نتيجة، كل نص شرعي — يبقى كما هو، يتنقّل فقط إلى ملف جديد.
- **الحالة تبقى في الأب**: `IndividualTab` و`CompanyTab` تظلّ مالكةً لكل `useState` و`useMemo`، وتمرّر القيم/الـsetters كـ props إلى الأقسام المستخرجة (لا Context جديد، لا Zustand).
- **صفرة تغيير على السلوك**: نفس الـIDs، نفس أسماء الحقول، نفس ترتيب الأقسام، نفس النصوص.
- **دفعات صغيرة**: كل دفعة → تحرير → `bunx tsgo --noEmit` → معاينة سريعة قبل الدفعة التالية.

## البنية الجديدة

```text
src/
├── lib/zakat/
│   ├── individual-calcs.ts     ← دوال حساب نقية (nisab, hawl, gold/silver totals…)
│   └── company-calcs.ts        ← دوال النماذج القطاعية والقوائم المالية
└── components/zakat/
    ├── individual/
    │   ├── shared/             ← NumField, SectionResult, Row (المشتركة داخل الملف حالياً)
    │   ├── inputs/             ← بطاقات الإدخال (Card الأولى في تبويب calc)
    │   ├── sections/           ← كل AccordionItem كمكوّن مستقل
    │   │   ├── GoldSilverSection.tsx
    │   │   ├── CashSection.tsx
    │   │   ├── SecuritiesSection.tsx
    │   │   ├── RealEstateSection.tsx
    │   │   ├── DigitalAssetsSection.tsx
    │   │   ├── DebtsSection.tsx
    │   │   └── … (بقية الأقسام: 12 قسماً تقريباً)
    │   ├── results/
    │   │   ├── ZakatTotalCard.tsx
    │   │   ├── DistributionCard.tsx
    │   │   └── ActionsCard.tsx
    │   └── audit/
    │       ├── FingerprintCard.tsx
    │       ├── ShariaRefsCard.tsx
    │       └── AuditLogCard.tsx
    ├── company/
    │   ├── shared/
    │   ├── models/             ← 6 نماذج قطاعية (net_assets, working_capital, net_income, net_equity, invested_funds, net_working_capital)
    │   ├── sections/           ← الركاز + المعادن + إضافات
    │   ├── results/
    │   └── audit/
    ├── IndividualTab.tsx       ← يبقى نفس الملف، لكن ~400-600 سطر (تنسيق + توزيع props)
    └── CompanyTab.tsx          ← نفس المبدأ
```

## الدفعات

### الدفعة 1 — البنية والمشتركات (منخفضة الخطورة)
- إنشاء `src/lib/zakat/individual-calcs.ts` و`company-calcs.ts` (فارغين مؤقتاً).
- إنشاء مجلدات `individual/{shared,inputs,sections,results,audit}` و`company/{…}`.
- نقل الـhelpers الداخلية: `NumField`, `SectionResult`, `Row` إلى `individual/shared/`.
- استبدال التعريفات المحلية باستيرادات، بدون تغيير سطر واحد من الاستخدام.
- تحقّق: `bunx tsgo --noEmit` + معاينة `/calculator`.

### الدفعة 2 — استخراج الحسابات النقية
- نقل كل دوال الحساب البحتة (بدون JSX، بدون useState) من IndividualTab إلى `individual-calcs.ts` (nisab, aggregation formulas, purification, hawl checkers…).
- استيرادها في IndividualTab. نفس السلوك.
- نفس الشيء لـCompanyTab → `company-calcs.ts`.
- تحقّق: `tsgo` + اختبارات الوحدة إن وُجدت.

### الدفعة 3 — أقسام IndividualTab (Accordion sections)
- كل `AccordionItem` بارز (10 عناصر تقريباً حسب المسح) → ملف مستقل يستقبل: `{ state, setState, computed }`.
- استبدال الجسم في IndividualTab باستدعاء `<GoldSilverSection {...} />` مثلاً.
- الحفاظ على ترتيب الأقسام والـvalue attributes للـAccordion كما هي.
- تحقّق دفعة-دفعة.

### الدفعة 4 — بطاقات النتائج والتوصيات (IndividualTab)
- استخراج الـCards من السطور ~3076-3990 (النتيجة الرئيسية، التوزيع، أزرار الإجراءات، الطباعة).

### الدفعة 5 — تبويب التدقيق (IndividualTab audit)
- استخراج بطاقات السطور 4003-4241.

### الدفعة 6 — النماذج القطاعية (CompanyTab)
- كل `<TabsContent value="…">` من الستة نماذج (net_assets, net_working_capital, working_capital, net_income, net_equity, invested_funds) → ملف مستقل تحت `company/models/`.

### الدفعة 7 — أقسام + نتائج + تدقيق CompanyTab
- الركاز/المعادن، بطاقات النتائج، بطاقات التدقيق.

### الدفعة 8 — تنظيف نهائي
- إزالة أي imports غير مستخدمة، فحص أن كل ملف صار ≤600 سطر.
- تشغيل `bunx tsgo --noEmit` + `bunx vitest run` + معاينة الصفحة.

## الأثر المتوقّع
- `IndividualTab.tsx`: 4251 → ~500 سطر (تنسيق + توزيع state/props).
- `CompanyTab.tsx`: 3419 → ~450 سطر.
- ~30 مكوّن جديد صغير (≤300 سطر لكل واحد) قابلة للاختبار والـmemoization لاحقاً.
- **لا يوجد تغيير سلوكي مرئي للمستخدم**.

## المخاطر والتخفيف
- **خطر**: أي `useMemo` يعتمد على متغيّر لم يُمرَّر كـprop سيكسر الحساب.
  - **تخفيف**: كل دفعة يليها فحص `tsgo` ومعاينة الصفحة قبل الانتقال.
- **خطر**: تعارض أسماء الملفات مع مكوّنات موجودة (مثلاً `CashBankSection.tsx` موجود).
  - **تخفيف**: استخدام مجلدات فرعية `individual/`, `company/` تجنّباً للاصطدام.

## نطاق هذه المحادثة
سأنفّذ **الدفعات 1 و2** الآن (البنية + استخراج الحسابات) لأنها أدنى مخاطرة وتُظهر النمط. عند نجاح المعاينة نتابع بالدفعات التالية على رسائل منفصلة لتبقى كل دفعة قابلة للمراجعة.
