# تسعير جغرافي ذكي (Global PPP Pricing)

## استراتيجية الأسعار (توصية تسويقية)

### 4 مناطق قوة شرائية (مستوحاة من البنك الدولي)

| المنطقة | معامل | العملة المعروضة | أمثلة الدول |
|--------|-------|-----------------|-------------|
| **T1 High-income** | ×1.00 | USD / SAR / AED / EUR / GBP | US, UK, EU, دول الخليج، كندا، أستراليا، سنغافورة، اليابان |
| **T2 Upper-middle** | ×0.60 | TRY / MYR / MXN / BRL | تركيا، ماليزيا، المكسيك، البرازيل، الأرجنتين، الصين |
| **T3 Lower-middle** | ×0.35 | EGP / JOD / MAD / IDR / PKR / INR | مصر، الأردن، المغرب، الجزائر، تونس، العراق، لبنان، إندونيسيا، الهند، باكستان، نيجيريا |
| **T4 Low-income** | ×0.20 | USD (رمزي) | اليمن، السودان، الصومال، أفغانستان، إثيوبيا |

**افتراضي عالمي**: T1 / USD إذا تعذّر الكشف.

### هيكل الباقات المقترح (خبرة تسويقية)

**للأفراد** — تدرّج تحويلي واضح:
- **مجاني** — حاسبة كاملة، حفظ 3 حسابات، بدون PDF رسمي
- **Personal Pro** — T1: $9.99/شهر — تقرير PDF بختم شرعي، أرشيف، تنبيهات الحول، توثيق سنوي
- **Family** — T1: $19.99/شهر — حتى 5 أفراد + زكاة العائلة المجمّعة + استشارة سنوية

**للشركات** — 3 مستويات (موجودة، سنُبقيها ونطبق PPP):
- **Startup** — T1: $149/شهر
- **Business** — T1: $499/شهر (الأكثر طلبًا)
- **Enterprise** — حسب الطلب

مثال أثر PPP على "Personal Pro":
- T1: $9.99 → **9.99 USD / 37 SAR / 37 AED**
- T3 (مصر): $9.99 × 0.35 → **~170 EGP** (بدل 490 EGP للسعر العالمي المباشر)
- T3 (باكستان): **~980 PKR**

## التنفيذ التقني

### 1. قاعدة البيانات
Migration واحد: إضافة `country CHAR(2)` (nullable) إلى `profiles` لحفظ اختيار المستخدم.

### 2. الكشف التلقائي
- Server route `src/routes/api/public/geo.ts` — يقرأ `CF-IPCountry` header ويُرجع `{ country, tier, currency }`.
- Hook `useGeoPricing()` — يستدعي الـ route مرة واحدة، يخزّن في `localStorage`، ويطابق مع `profile.country` للمسجّلين (تكامل ثنائي: كل تغيير يُحفظ في الاثنين).

### 3. طبقة التسعير
- `src/lib/geo/countries.ts` — خريطة كاملة ISO-2 → `{ tier, currency, currencySymbol, locale }` (≈200 دولة).
- `src/lib/geo/pricing.ts` — دوال: `getLocalPrice(usdBase, country)`, `formatPrice(amount, currency, locale)` مع تقريب نفسي (99, 149, 499).

### 4. واجهات
- **تحديث** `src/routes/enterprise-pricing.tsx` — أسعار ديناميكية + مبدّل دولة/عملة أعلى الصفحة + شارة "أسعار محلية معتمدة على منطقتك".
- **جديد** `src/routes/pricing.tsx` — صفحة تسعير موحّدة (أفراد + شركات) مع تبويبين، تستخدم نفس النظام.
- **مكوّن** `CountryPricingSwitcher` — قائمة منسدلة (أعلام + أسماء) للتبديل اليدوي.

### 5. رابط تنقّل
إضافة "الأسعار" في القائمة الرئيسية → `/pricing`.

## ملفات ستُنشأ/تُعدّل

```text
src/lib/geo/countries.ts              (جديد)
src/lib/geo/pricing.ts                (جديد)
src/lib/geo/plans.ts                  (جديد — تعريف الباقات المركزي)
src/hooks/useGeoPricing.ts            (جديد)
src/components/pricing/PriceTag.tsx   (جديد)
src/components/pricing/CountrySwitcher.tsx (جديد)
src/routes/api/public/geo.ts          (جديد)
src/routes/pricing.tsx                (جديد — أفراد + شركات موحّد)
src/routes/enterprise-pricing.tsx     (تحديث لاستخدام plans.ts + PPP)
supabase migration                    (profiles.country)
```

## خارج النطاق
- الدفع الفعلي بالعملات المحلية (Stripe/Paddle) — لاحقًا.
- VAT/ضريبة القيمة المضافة الإقليمية — لاحقًا.
- كشف عبر GPS/طلب إذن المتصفح — نكتفي بـ IP + اختيار يدوي.
