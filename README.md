# نِصاب (Nisab) — منصة حساب الزكاة

منصة زكاة للأفراد والشركات مبنية على معيار **AAOIFI الشرعي رقم 35**،
تدعم 5 مذاهب فقهية، وتغطي: النقد والذهب والفضة، الأسهم والاستثمارات،
عروض التجارة، الزروع والثمار، الأنعام، مع خصم الديون والالتزامات وفق
منهجيات محاسبية متعددة قابلة للتدقيق المتقاطع.

لتبويب الشركات: تدقيق وامتثال وحوكمة شرعية، ربط مباشر بأنظمة ERP
(Odoo/SAP)، محرك ديون قابل للتفسير، فرز شرعي لأسهم الشركات المتداوَلة
وفق ثلاث منهجيات (AAOIFI/DJIM/S&P)، وتقارير PDF موقَّعة برمز تحقق QR
عام.

**حالة الاعتماد الشرعي المؤسسي وحالة كل مرجعية موثَّقة بشفافية على
[`/certifications`](src/routes/certifications.tsx) — لا ادعاءات غير موثَّقة.**

## التقنيات

TanStack Start (SSR) · React 19 · Cloudflare Workers · Supabase (Postgres + RLS) · Tailwind

## البدء السريع

```bash
git clone <repo-url>
cd remix-of-zakat-buddy
bun install
cp .env.example .env   # عبّئ القيم — راجع DEPLOYMENT.md لشرح كل متغيّر
bun run dev
```

الموقع محلياً على: http://localhost:8080

## التوثيق

| الملف | الغرض |
|---|---|
| [`SETUP.md`](SETUP.md) | إعداد سريع للتطوير المحلي |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | دليل نشر شامل: البنية، متغيرات البيئة الكاملة، Cloudflare/Supabase، CI/CD |
| [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) | خطة التعافي من الكوارث، RTO/RPO، سيناريوهات الاستعادة |
| [`src-tauri/README.md`](src-tauri/README.md) | سقالة تطبيق سطح المكتب (Tauri) |

## الاختبارات والجودة

```bash
bun run test    # 378 اختباراً (Vitest)
bunx tsc --noEmit
bun run lint
bun audit       # فحص ثغرات التبعيات
```

## مزامنة Lovable Cloud

هذا المشروع مرتبط بـ [Lovable](https://lovable.dev) — التعديلات من محرر
Lovable تُدفع مباشرة لهذا المستودع، والعكس صحيح عند الدفع لفرع `main`.
