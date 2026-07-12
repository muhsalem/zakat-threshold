# Load Testing Plan — نصاب / Nisab Zakat Platform

خطة اختبار الحمل الرسمية لمنصّة نصاب قبل الإطلاق العام أو ذروة رمضان.

## الأهداف (SLOs)

| المؤشر | الهدف |
|---|---|
| p50 latency (حاسبة الزكاة) | ≤ 200ms |
| p95 latency (حاسبة الزكاة) | ≤ 800ms |
| p99 latency (تقارير PDF) | ≤ 3s |
| Error rate | < 0.5% |
| Throughput (peak) | 1,000 RPS |
| Availability (30d) | ≥ 99.9% |

## السيناريوهات

### S1 — Landing + Blog (قراءة عامّة)
- URL: `/`, `/blog`, `/blog/:slug`
- Load: 500 → 2000 VU خلال 10 دقائق
- Assertion: 200 status, TTFB < 400ms

### S2 — حاسبة الزكاة الفردية
- POST `/api/public/calc` مع 20 حمولة مختلفة
- Load: 300 VU مستمر 15 دقيقة
- Assertion: 200 status, response < 500ms

### S3 — OCR القوائم المالية
- POST `/api/extract-statement` (مصادَق)
- Load: 20 VU (محدود بحصص LLM)
- Assertion: rate-limit 10/min يُحترم، 200 status عند الاستحقاق

### S4 — أسعار الذهب/الفضّة (Cache)
- GET `/api/public/prices/history?days=30`
- Load: 100 VU لمدة 5 دقائق
- Assertion: cache hit ratio > 90%

### S5 — لوحة المحاسب (مصادَق)
- تسجيل دخول + استعلام سجلات + توليد تقرير
- Load: 50 VU مصادَق مستمر 10 دقائق

## الأدوات

- **k6** (مفضّل — يعمل من CLI مع تصدير JSON/Prometheus)
- **Grafana k6 Cloud** للتنفيذ الموزَّع الجغرافي (اختياري)
- **Artillery** بديل لسيناريوهات WebSocket

## مثال k6

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.005'],
  },
};
export default function () {
  const res = http.post('https://project--<id>.lovable.app/api/public/calc', JSON.stringify({
    cash: 100000, gold: 0, silver: 0, receivables: 0, inventory: 0, debts: 0,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

## معايير القبول قبل الإنتاج

1. جميع السيناريوهات S1–S5 اجتازت العتبات في 3 تشغيلات متتالية.
2. لا يوجد Memory leak (RSS مستقر بعد 30 دقيقة).
3. Rate limiting يعمل — S3 يرفض الطلبات الزائدة بـ 429.
4. لا توجد أخطاء 5xx غير متوقّعة في سجلات Cloudflare Workers.
5. Database (Supabase) لم يتجاوز 70% من حصّة الاتصالات المفتوحة.

## جدولة

- **اختبار Sanity أسبوعي** (Cron): S1 + S2 مبسّطان.
- **اختبار كامل قبل كل Release كبير**.
- **اختبار ذروة رمضاني** قبل شعبان بأسبوعين، مع نموذج حمل مضاعف ×3.

## سجل التنفيذ

| التاريخ | الإصدار | النتيجة | ملاحظات |
|---|---|---|---|
| — | — | — | مطلوب أول تنفيذ رسمي قبل الإطلاق |
