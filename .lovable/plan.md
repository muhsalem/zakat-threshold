# خارطة طريق World-Class — 4 موجات متتابعة

اخترتَ الأربعة محاور معاً. لتجنّب تضخّم غير قابل للمراجعة، سأنفّذها على 4 موجات منفصلة، كل موجة تُغلق قبل بدء التالية. هذه الخطة توصيف الموجة (1) القابلة للتنفيذ فوراً، ثم عرض مختصر للموجات (2–4).

---

## الموجة 1 — تصليب أمني وامتثال (تنفيذ فوري بعد الموافقة)

### 1.1 معالجة تحذيرات linter الحالية
- **3 دوال SECURITY DEFINER يمكن للمستخدمين المسجّلين تنفيذها**: سحب صلاحية `EXECUTE` من `PUBLIC/anon/authenticated` عن:
  - `handle_new_user()` — تُستدعى بواسطة trigger مصادقة فقط.
  - `generate_hawl_reminders()` — تُستدعى من cron/admin فقط.
  - `capture_zakat_draft_version()` — trigger فقط.
  (`has_role/has_org_role/is_org_member` يُبقى عليها لأن RLS يستدعيها.)
- **Extension in Public (`pg_net`)**: نقلها إلى schema `extensions` مع تحديث `cron.job` لاستخدام `extensions.http_post` بدلاً من `net.http_post` — يمنع أي استعلام من ذاكر جدول `net.*` عبر Data API.

### 1.2 تفعيل حماية كلمات المرور المسرّبة
تفعيل HIBP Check عبر `configure_auth` بحيث يرفض Supabase Auth أي كلمة مرور موجودة في تسريبات معروفة أثناء التسجيل أو التغيير.

### 1.3 إعادة تدقيق RLS على الجداول الحسّاسة
مراجعة جدول-جدول:
- `zakat_records`, `zakat_drafts`, `zakat_draft_versions`, `zakat_approvals`, `nisab_records` → التأكد أن كل السياسات مرتبطة بـ `auth.uid()`.
- `notifications`, `sharia_attestations`, `sharia_audit_log`, `accountant_clients`, `accountant_client_history` → السياسات مطابقة للنموذج المتوقّع (المالك أو صلاحية دور).
- `metal_prices_daily`, `nisab_prices`, `nisab_daily_history` → قراءة عامة فقط (بلا كتابة عبر anon).

### 1.4 صفحة `Security & Compliance`
تحديث `/security` لتعكس الوضع الفعلي: قائمة الضوابط المُفعّلة (RLS، دوال بأذون محدودة، HIBP، مفاتيح مفصولة، rate-limit على الـ hooks العامة) بدون ادعاءات شهادات.

**الملفات المتأثرة (الموجة 1)**
- Migration جديد: revoke على 3 دوال + نقل `pg_net` إلى `extensions` + `insert` تحديث cron commands.
- `configure_auth` call لتفعيل HIBP.
- `src/routes/security.tsx` (تحديث محتوى).

---

## الموجة 2 — الأداء والإتاحة (a11y)
- **Route splitting**: مراجعة `router.tsx` وإضافة `lazy` لطرق الأدوات الثقيلة (تقارير PDF، ERP، admin).
- **LCP**: مراجعة الصفحة الرئيسية `index.tsx` — preload صورة الهيرو، `fetchpriority=high`، تحويل ثابت إلى AVIF/WebP عبر `vite-imagetools`.
- **Web Vitals**: إضافة إبلاغ CLS/INP إلى Sentry.
- **axe-core sweep**: تشغيل فحص وإصلاح: `aria-label` على أزرار أيقونات، `alt` صور، `h-dvh` بدل `h-screen`، contrast للـ dark mode.
- **44×44 targets** على الشريط السفلي للجوال.

## الموجة 3 — جودة وتغطية اختبارات
- **Vitest**: رفع تغطية `src/lib/**` إلى >85%: إضافة اختبارات لـ `fx.ts`, `zakatTrade.ts` extended cases, `xbrl.ts`, `zatcaTlv.ts`, `fatwaEngine` edge cases.
- **Playwright**: 6 سيناريوهات E2E حرجة (تسجيل، معالج فرد، معالج شركة، حفظ مسودة → استعادة، تقرير PDF، بوابة المحاسب).
- **CI Gate**: تحديث `.github/workflows/ci.yml` ليمنع الدمج عند فشل `tsgo` أو `vitest --coverage` (min threshold 80%) أو Playwright.

## الموجة 4 — توسعة i18n ولغات
- إضافة `en`, `fr`, `ur`, `id` إلى `src/lib/i18n.tsx` مع مفاتيح الترجمة لكل مكوّنات الواجهة الرئيسية (Navigation, Wizards, Dashboard, Reports).
- `hreflang` per-route عبر `head()`.
- نسخ منفصلة للصفحات العامة (`/`, `/faq`, `/blog`) بمسارات `/{locale}/...` أو query param + canonical.
- تحديث `sitemap.xml` ليضم كل لغة.

---

## تفاصيل تقنية (للموجة 1 التي ستنفَّذ الآن)

```sql
-- 1) قفل EXECUTE على الدوال الثلاث
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_hawl_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.capture_zakat_draft_version() FROM PUBLIC, anon, authenticated;

-- 2) نقل pg_net
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;
```

بعد الـ migration، سأشغّل `insert` لإعادة كتابة أوامر cron.job لتستخدم `extensions.http_post`، ثم `configure_auth` لتفعيل HIBP.

**نتيجة الموجة 1 المتوقّعة**: 0 تحذيرات في linter (باستثناء تلك التي تعود لنقاط تصميمية مثل شكل RLS)، حماية إضافية للمصادقة، صفحة أمان دقيقة.

بعد الموافقة على هذه الخارطة، أبدأ الموجة 1 مباشرةً وأعرض عليك النتائج قبل الانتقال للموجة 2.