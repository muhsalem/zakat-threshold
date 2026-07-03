import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "Public API — Zakat Developers" },
      { name: "description", content: "Public REST API for Zakat nisab lookup and calculation. AAOIFI 35-aligned, CORS-enabled, no auth required." },
    ],
  }),
  component: DevPage,
});

function DevPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">واجهة برمجية عامة (Public API)</h1>
      <p className="text-muted-foreground mb-8">
        نقاط نهاية REST مجانية ومفتوحة لاستعلام النصاب وحساب الزكاة من تطبيقاتكم، وفق AAOIFI 35.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle><code className="text-sm">GET /api/public/nisab</code></CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm mb-2">جلب آخر سعر للنصاب بعملة معينة.</p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`curl "https://your-domain.com/api/public/nisab?currency=USD"

{
  "ok": true,
  "currency": "USD",
  "zakat_rate": 0.025,
  "gold_grams": 85,
  "silver_grams": 595,
  "latest": { ... },
  "source": "AAOIFI 35 / Bayt al-Zakat"
}`}</code></pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle><code className="text-sm">POST /api/public/calc</code></CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm mb-2">حساب زكاة المال السائل (نقد + ذهب + تجارة − ديون).</p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`curl -X POST "https://your-domain.com/api/public/calc" \\
  -H "Content-Type: application/json" \\
  -d '{"assets": 100000, "liabilities": 5000, "nisab": 20000, "rate": 0.025}'

{
  "ok": true,
  "net_assets": 95000,
  "eligible": true,
  "zakat_due": 2375,
  "standard": "AAOIFI 35"
}`}</code></pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle><code className="text-sm">GET /api/public/openapi</code></CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>مواصفات OpenAPI 3.1 كاملة لجميع النقاط. صالحة للاستيراد مباشرةً في Postman وInsomnia وSwagger UI ومولّدات SDK.</p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`curl "https://your-domain.com/api/public/openapi"`}</code></pre>
            <a className="text-primary underline text-xs" href="/api/public/openapi" target="_blank" rel="noreferrer">فتح المواصفات في نافذة جديدة ↗</a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rate limits & SLA</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>• CORS مفتوح للجميع.</p>
            <p>• Cache: 5 دقائق على <code>GET /nisab</code>، ساعة كاملة على <code>/openapi</code>.</p>
            <p>• Rate-limit: 30–60 req/min حسب النقطة.</p>
            <p>• بدون مصادقة لـ MVP — استخدام عادل (Fair Use).</p>
            <p>• لتكامل مؤسسي (SAP / Oracle / QuickBooks / Xero) مع SLA ومفاتيح API، تواصل عبر <a className="text-primary underline" href="/enterprise">صفحة المؤسسات</a>.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
