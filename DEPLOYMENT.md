# دليل نشر نِصاب — شامل

هذا الدليل يغطي نشر المنصة بالكامل من الصفر: البنية، الخدمات الخارجية،
متغيرات البيئة، النشر الفعلي، CI/CD، والتحقق بعد النشر. للإعداد السريع
للتطوير المحلي فقط راجع [`SETUP.md`](SETUP.md).

---

## 1) البنية العامة

| الطبقة | التقنية | ملاحظة |
|---|---|---|
| التطبيق | TanStack Start (SSR) + React 19 | `src/routes/` توجيه بالملفات |
| الاستضافة | Cloudflare Workers | `wrangler.jsonc`، نقطة الدخول `src/server.ts` |
| قاعدة البيانات | Supabase (Postgres) | `supabase/migrations/` — 75 هجرة حتى الآن، RLS على كل جدول |
| الدفع | Stripe Checkout | عبر Supabase Edge Function `create-checkout` |
| البريد | Resend | Edge Function `send-report-email` |
| الذكاء الاصطناعي | Anthropic / OpenAI / Lovable AI (أيّها متاح) | للمستشار الذكي واستخراج المستندات |
| المراقبة | Sentry (اختياري) | مُهيَّأ ومُغلَّق افتراضياً حتى تضع `VITE_SENTRY_DSN` |
| سطح المكتب | Tauri 2 (Rust) | سقالة جاهزة، غير مطلوبة لنشر الويب — راجع `src-tauri/README.md` |

**قاعدة مهمة**: لا نسخة أوفلاين مستقلة. كل الميزات (حساب الزكاة الأساسي مستثنى)
تحتاج اتصالاً بالسيرفر الحقيقي — لذا `SITE_URL` يجب أن يكون الدومين الفعلي
المنشور عليه، لا localhost، في أي بيئة إنتاج.

---

## 2) المتطلبات قبل البدء

- **Bun** (لا npm/yarn — المشروع مبني حول `bun.lock`): `curl -fsSL https://bun.sh/install | bash`
- حساب **Cloudflare** (Workers + KV)
- حساب **Supabase**
- حساب **Stripe** (للخطط المدفوعة)
- حساب **Resend** (لإرسال التقارير بالبريد)
- مفتاح **واحد على الأقل** من: Anthropic / OpenAI / Lovable AI
- (اختياري) حساب **Sentry** لمراقبة الأخطاء
- (اختياري، لبناء سطح المكتب فقط) **Rust** عبر rustup.rs + **Visual Studio Build Tools**
  (حِمل "C++ build tools") على ويندوز تحديداً — يحتاج 3.5+ جيجا فعلية على
  قرص التثبيت الافتراضي بغض النظر عن مسار التثبيت المخصَّص

---

## 3) متغيرات البيئة — القائمة الكاملة والدقيقة

`.env.example` الحالي **غير مكتمل** (يفتقد عدة متغيرات خادم حقيقية).
هذه القائمة مُستخرَجة مباشرة من الكود، لا من التخمين:

| المتغيّر | مطلوب؟ | أين يُستخدم | من أين تحصل عليه |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | عميل المتصفح | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | عميل المتصفح | نفس المكان — مفتاح علني آمن بالتصميم |
| `SUPABASE_URL` | ✅ | دوال الخادم (`requireSupabaseAuth`، مسارات API الخام) | نفس قيمة `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY` | ✅ | دوال الخادم | نفس قيمة النسخة العلنية |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | عمليات تتخطى RLS عمداً (مثل `verifyPdfReport` العامة) | Supabase Dashboard — **سرّي جداً، لا يُكشف أبداً للعميل** |
| `STRIPE_SECRET_KEY` | ✅ للدفع | Edge Function `create-checkout` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | ✅ للدفع | Edge Function `stripe-webhook` | Stripe Dashboard → Webhooks |
| `STRIPE_PRICE_CERTIFIED` / `_VIP_ANNUAL` / `_STARTUP` / `_BUSINESS` | ✅ للدفع | `create-checkout` | Stripe Dashboard → Products |
| `RESEND_API_KEY` | ✅ للبريد | Edge Function `send-report-email` | resend.com |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `LOVABLE_API_KEY` | ✅ (واحد على الأقل) | المستشار الذكي، استخراج المستندات، الفرز الشرعي للأسهم | لوحة كل مزوّد |
| `ACCOUNTANT_MASTER_PASSWORD` | ✅ | منح دور `accountant` عبر `/a-console` | تولّده أنت (32+ حرف عشوائي) |
| `CRON_SECRET` | ✅ للتذكيرات المجدولة | `POST /api/public/hooks/hawl-reminders` (ترويسة `X-Cron-Secret`) | تولّده أنت |
| `ERP_WEBHOOK_SECRET` | مطلوب لتكامل ERP الخارجي | `POST /api/public/erp/webhook` (HMAC-SHA256) | تولّده أنت |
| `SITE_URL` | ✅ | روابط التحقق، QR، البريد | الدومين الفعلي المنشور، مثال: `https://your-domain.example` |
| `VITE_SENTRY_DSN` | اختياري | مراقبة الأخطاء | sentry.io — بدونه Sentry معطَّل تماماً بصمت، لا خطأ |
| `VITE_EARLY_BIRD_UNTIL` | اختياري | تاريخ انتهاء خصم Early-Bird (`YYYY-MM-DD`) | تختاره أنت تسويقياً |

**لتوليد الأسرار التي تصنعها بنفسك** (`CRON_SECRET`, `ERP_WEBHOOK_SECRET`,
`ACCOUNTANT_MASTER_PASSWORD`):

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **لا تضع `.env` في git إطلاقاً** — المشروع سبق أن أُصلحت فيه هذه الغلطة
بالذات (`.gitignore` يستثنيه الآن). كل الأسرار أعلاه تُدخَل في:
- **Cloudflare**: `wrangler secret put <NAME>` لكل سرّ خادم، أو لوحة Cloudflare Dashboard → Workers → Settings → Variables
- **Supabase Edge Functions**: Dashboard → Edge Functions → Secrets (لـ`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SITE_URL` تحديداً — الدوال هذه منفصلة عن Cloudflare Workers)
- **GitHub Secrets**: فقط لو أضفت خطوة نشر آلي لاحقاً؛ CI الحالي (`ci.yml`) **لا يحتاج أي سرّ** لتشغيله (البناء والاختبارات لا تلمس خدمات حقيقية)

---

## 4) قاعدة البيانات (Supabase)

```bash
# تسجيل الدخول وربط المشروع (مرة واحدة)
bunx supabase login
bunx supabase link --project-ref YOUR_PROJECT_REF

# تطبيق كل الهجرات (75 ملفاً في supabase/migrations/) بالترتيب
bunx supabase db push
```

أو يدوياً: Supabase Dashboard → SQL Editor → شغّل كل ملف في
`supabase/migrations/` **بترتيب الاسم زمنياً** (الاسم يبدأ بطابع زمني).

**تحقق بعد التطبيق**: كل جدول جديد يجب أن يظهر بـ RLS مفعَّلة —
راجع Database → Tables → أي جدول → Row Level Security يجب أن يكون "Enabled".
هذا تحقّقنا منه فعلياً لكل الهجرات حتى الآن (بلا استثناء).

### نشر Edge Functions

```bash
bunx supabase functions deploy create-checkout
bunx supabase functions deploy stripe-webhook
bunx supabase functions deploy send-report-email
```

---

## 5) Cloudflare Workers (النشر الفعلي)

```bash
bunx wrangler login

# خطوة إلزامية قبل أول نشر — بدونها حد الطلبات يعمل بالذاكرة المحلية
# لكل نسخة بدل موزَّع (يعمل، لكن أضعف أمنياً تحت حِمل حقيقي)
bunx wrangler kv namespace create RATE_LIMIT_KV
# الصق الـ id الناتج في wrangler.jsonc بدل REPLACE_WITH_KV_NAMESPACE_ID

# أسرار الخادم (وليس أسرار Supabase Edge Functions — منفصلة تماماً)
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put ANTHROPIC_API_KEY
bunx wrangler secret put CRON_SECRET
bunx wrangler secret put ERP_WEBHOOK_SECRET
bunx wrangler secret put ACCOUNTANT_MASTER_PASSWORD
# كرّر لباقي المتغيرات من الجدول أعلاه حسب حاجتك

# البناء والنشر
bun run build
bunx wrangler deploy
```

**ملاحظة عن Lovable Cloud**: لو المشروع مربوط بـLovable Cloud (كما هو حال
هذا المستودع)، النشر الفعلي قد يحدث تلقائياً عبر مزامنتهم الخاصة بدل
`wrangler deploy` اليدوي — تحقق من إعدادات المشروع في Lovable أولاً قبل
افتراض أن الأمر أعلاه هو المسار المستخدَم فعلياً.

---

## 6) CI/CD (GitHub Actions)

`.github/workflows/ci.yml` يعمل على كل push لـ`main` وكل pull request:

| الوظيفة | ماذا تفعل | متى تشغَّل بكامل نطاقها |
|---|---|---|
| Type-check · Lint · Unit · Build | `tsc` + ESLint + Vitest (378 اختبار) + `vite build` كامل | كل مرة |
| Accessibility (axe) | فحص إتاحة الوصول عبر axe-core على خادم تطوير حي | كل مرة |
| Security scans | Trivy (فحص ثغرات) — أي HIGH/CRITICAL يُفشل البناء | كل مرة |
| RTL pagination | اختبارات Playwright سلوكية/بصرية | **3 متصفحات (chromium/firefox/webkit) عند pull_request فقط — chromium وحده عند push مباشر** (لتوفير حصة دقائق Actions، كانت سبب نفاد الحصة سابقاً) |

**لا يحتاج CI أي GitHub Secret** ليعمل — البناء والاختبارات معزولة عن أي
خدمة خارجية حقيقية.

⚠️ **حادثة أمنية موثَّقة**: `trivy-action` تعرّضت لاختراق سلسلة توريد فعلي
سابقاً (إصدارات 0.0.1–0.34.2). الملف الآن مثبَّت على commit SHA غير قابل
للتغيير، لا وسم متحرك — **لا تُرجعه لـ`@master` أو أي وسم عادي مهما كان السبب**.

---

## 7) قائمة تحقق ما بعد النشر

- [ ] `SITE_URL` يطابق الدومين الفعلي المنشور (لا localhost)
- [ ] `/verify/<token-عشوائي-تجريبي>` يرجع "لم يُعثر على تقرير" لا خطأ خادم
- [ ] تسجيل دخول فعلي يعمل، وتحقق من دور `accountant` عبر `/a-console`
- [ ] طلب دفع تجريبي (Stripe test mode) يكتمل ويُنشئ سجلاً في `payments`
- [ ] رفع ملف PDF حقيقي عبر `/client-intake` (وضع "التقرير الشامل") ينجح ويولّد QR صحيح
- [ ] `bun audit` نظيف (كان صفر ثغرات عند آخر تحقق)
- [ ] تحقق أن `.env` غير موجود في المستودع البعيد (`git ls-files | grep .env`)

---

## 8) فجوات معروفة — لا تُخفَ عن أي قارئ لهذا الدليل

- **لا اعتماد شرعي مؤسسي حقيقي بعد** — الموقع يفصح عن هذا صراحة حالياً في `/certifications` و`ShariaBoardCard`، لا يدّعي خلاف الواقع
- **KV لحد الطلبات** غالباً لم تُزوَّد بعد (راجع القسم 5)
- **بناء سطح المكتب (Tauri)** غير مُختبَر محلياً بنجاح على ويندوز — يحتاج VS Build Tools بمساحة C حقيقية كافية
