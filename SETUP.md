# دليل إعداد نِصاب للإنتاج

## المتطلبات

- Node.js 18+
- حساب Supabase
- حساب Stripe
- حساب Resend (للبريد)

---

## 1. Supabase

### أ) تشغيل الـ Migrations

```bash
npx supabase db push
```

أو عبر لوحة Supabase > SQL Editor > شغّل ملفات `supabase/migrations/` بالترتيب.

### ب) نشر Edge Functions

```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy stripe-webhook
npx supabase functions deploy send-report-email
```

### ج) إضافة Secrets للـ Edge Functions (Supabase Dashboard > Edge Functions > Secrets)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
SITE_URL=https://nisab.app
```

---

## 2. Stripe

### أ) إنشاء المنتجات والأسعار

في لوحة Stripe > Products، أنشئ:

| المنتج   | النوع     | السعر      |
| -------- | --------- | ---------- |
| معتمد    | one_time  | $19 USD    |
| سنوي VIP | recurring | $79/year   |
| Startup  | recurring | $149/month |
| Business | recurring | $499/month |

انسخ الـ `price_id` لكل منتج وضعه في `src/lib/payments.ts` داخل كائن `PLANS`.

### ب) إعداد Webhook

Stripe Dashboard > Developers > Webhooks > Add endpoint:

- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
- انسخ الـ Signing Secret وضعه في Supabase Secrets كـ `STRIPE_WEBHOOK_SECRET`

---

## 3. Resend (البريد الإلكتروني)

1. سجّل في resend.com
2. أضف دومينك (nisab.app) وتحقق منه
3. أنشئ API Key وضعه في Supabase Secrets كـ `RESEND_API_KEY`
4. في `send-report-email/index.ts`، غيّر `reports@nisab.app` لبريدك المتحقق

---

## 4. AI مستشار الزكاة

أضف **أحد** المفاتيح التالية في متغيرات البيئة (`.env` أو منصة النشر):

- `LOVABLE_API_KEY` — الأسرع (Gemini Flash عبر Lovable)
- `OPENAI_API_KEY` — GPT-4o-mini
- `ANTHROPIC_API_KEY` — Claude Haiku (الأرخص والأكثر موثوقية)

---

## 5. بوابة المحاسب

1. أضف `ACCOUNTANT_MASTER_PASSWORD` في متغيرات البيئة
2. اذهب لـ `/a-console` وأدخل كلمة المرور لمنح صلاحية `accountant` لحسابك
3. بعدها ستظهر بوابة المحاسب في `/accountant`

---

## 6. تشغيل محلي

```bash
cp .env.example .env
# عبّئ القيم في .env
bun install
bun run dev
```

الموقع على: http://localhost:8080

---

## 7. النشر

المنصة هدفها **Cloudflare Workers** تحديداً (`wrangler.jsonc` + `src/server.ts`)،
لا Vercel/Netlify. راجع الدليل الشامل [`DEPLOYMENT.md`](DEPLOYMENT.md) للخطوات
الكاملة: قائمة متغيرات البيئة الدقيقة (هذا الملف ناقص عدة متغيرات خادم حقيقية)،
KV namespace، أسرار Wrangler، CI/CD، وقائمة تحقق ما بعد النشر.

---

## ملاحظات

- Stripe يعمل في وضع **test** بـ `sk_test_...` — لا يخصم مبالغ حقيقية
- لاختبار الـ Webhook محلياً: `stripe listen --forward-to localhost:8080/api/stripe-webhook`
- بيانات تجريبية موجودة في الـ DB — احذفها قبل الإنتاج عبر Supabase Dashboard
