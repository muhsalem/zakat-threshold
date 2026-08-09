import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeysPanel } from "@/components/developers/ApiKeysPanel";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      { title: "Public API — Zakat Developers" },
      {
        name: "description",
        content:
          "REST API for Zakat nisab lookup and certified calculation. AAOIFI 35-aligned, CORS-enabled, API-key authenticated.",
      },
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
        <section id="auth" className="space-y-3">
          <ApiKeysPanel />
          <p className="text-sm text-muted-foreground">
            نقاط <code>/v1/zakat-calc</code> و<code>/v1/verify</code> تتطلّب مفتاحاً صالحاً في
            ترويسة
            <code dir="ltr"> Authorization: Bearer &lt;key&gt;</code> أو <code>X-API-Key</code>.
            بدون مفتاح تُعاد <code>401 ZKT-1020</code>، وبمفتاح ملغى <code>403 ZKT-1022</code>،
            وبصلاحية ناقصة <code>403 ZKT-1023</code>. كتالوج القواعد <code>/v1/rules</code> يبقى
            قراءةً عامة.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">POST /api/public/v1/zakat-calc</code> — نتائج معتمدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              حساب v1 مع تحقق صارم من المدخلات، وتحقق من كتالوج القواعد الشرعية (لا تُصدر شهادة
              «معتمدة» إن كانت قاعدة أي بند محجوبة أو الحول غير مكتمل)، وبصمة محتوى قابلة لإعادة
              التحقق.
            </p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto">
              <code>{`curl -X POST "https://your-domain.com/api/public/v1/zakat-calc" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer nsb_live_xxx" \\
  -d '{"goldPricePerGram24":80,"silverPricePerGramPure":1,
       "cashAndBank":100000,"shortTermLiabilities":10000}'

{
  "apiVersion": "v1",
  "data": { "assessment": { "zakatDue": 2250, "reachesNisab": true } },
  "rules": { "certified": true, "catalogVersion": "2026.1.0", "checks": [...] },
  "certificate": { "status": "certified", "contentHash": "816b...", "versions": {...} }
}`}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">GET /api/public/v1/rules</code>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              كتالوج القواعد الشرعية: الحالة (مفعّلة/محجوبة مع السبب)، المصدر المتحقَّق، الإصدار.
              فلترة اختيارية بـ <code>?assetType=cash</code>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">POST /api/public/v1/verify</code>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              إعادة إنتاج نتيجة سابقة ومطابقة بصمتها: أرسل <code>{"{ input, contentHash }"}</code>{" "}
              ويعيد <code>valid</code> مع النتيجة والإصدارات المستخدمة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">GET /api/public/nisab</code>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">جلب آخر سعر للنصاب بعملة معينة.</p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto">
              <code>{`curl "https://your-domain.com/api/public/nisab?currency=USD"

{
  "ok": true,
  "currency": "USD",
  "zakat_rate": 0.025,
  "gold_grams": 85,
  "silver_grams": 595,
  "latest": { ... },
  "source": "AAOIFI 35 / Bayt al-Zakat"
}`}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">POST /api/public/calc</code>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">حساب زكاة المال السائل (نقد + ذهب + تجارة − ديون).</p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto">
              <code>{`curl -X POST "https://your-domain.com/api/public/calc" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer nsb_live_xxx" \\
  -d '{"assets": 100000, "liabilities": 5000, "nisab": 20000, "rate": 0.025}'

{
  "ok": true,
  "net_assets": 95000,
  "eligible": true,
  "zakat_due": 2375,
  "standard": "AAOIFI 35"
}`}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <code className="text-sm">GET /api/public/openapi</code>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              مواصفات OpenAPI 3.1 كاملة لجميع النقاط. صالحة للاستيراد مباشرةً في Postman وInsomnia
              وSwagger UI ومولّدات SDK.
            </p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto">
              <code>{`curl "https://your-domain.com/api/public/openapi"`}</code>
            </pre>
            <a
              className="text-primary underline text-xs"
              href="/api/public/openapi"
              target="_blank"
              rel="noreferrer"
            >
              فتح المواصفات في نافذة جديدة ↗
            </a>
          </CardContent>
        </Card>

        <Card id="errors">
          <CardHeader>
            <CardTitle>أكواد الأخطاء الموحّدة (v1)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              كل خطأ في <code>/api/public/v1/*</code> يعود بالهيكل نفسه، مع كود ثابت{" "}
              <code>ZKT-xxxx</code> ورسالة عربية/إنجليزية وتفاصيل لكل سبب فشل. الكتالوج الحيّ متاح
              في <code>GET /api/public/v1/rules</code> ضمن الحقل <code>errorCodes</code>.
            </p>
            <pre dir="ltr" className="bg-muted rounded p-3 text-xs overflow-x-auto">
              <code>{`{
  "apiVersion": "v1",
  "status": "error",
  "code": 422,
  "error": {
    "code": "ZKT-1010",
    "type": "validation_failed",
    "httpStatus": 422,
    "message": "فشل تحقق المدخلات — راجع تفاصيل الحقول.",
    "messageEn": "Input validation failed — see field details.",
    "details": [
      {
        "code": "ZKT-1010",
        "type": "validation_failed",
        "field": "goldPricePerGram24",
        "message": "الحقل «goldPricePerGram24»: Number must be greater than 0",
        "remediation": "راجع نوع القيمة ومداها في توثيق /developers.",
        "severity": "error"
      }
    ],
    "docs": ".../developers#errors"
  },
  "errors": [ ...same as details (legacy)... ],
  "requestId": "6f0b…",
  "timestamp": "2026-08-08T07:40:00.000Z"
}`}</code>
            </pre>
            <ul className="space-y-1 leading-6">
              <li>
                <code>ZKT-1001</code> — جسم الطلب ليس JSON صالحاً (400).
              </li>
              <li>
                <code>ZKT-1010</code> — فشل تحقق المدخلات مع تفصيل لكل حقل (422).
              </li>
              <li>
                <code>ZKT-1030</code> — بصمة <code>contentHash</code> بصيغة غير صحيحة (422).
              </li>
              <li>
                <code>ZKT-1040</code> — تجاوز حد الطلبات مع ترويسة <code>Retry-After</code> (429).
              </li>
              <li>
                <code>ZKT-2001</code> — لا توجد قاعدة مسجَّلة تحكم البند.
              </li>
              <li>
                <code>ZKT-2002</code> — القاعدة الحاكمة محجوبة/لم تنفذ، مع أسبابها.
              </li>
              <li>
                <code>ZKT-2003</code> — خلل في سلامة كتالوج القواعد.
              </li>
              <li>
                <code>ZKT-2004</code> — الحول غير مكتمل.
              </li>
              <li>
                <code>ZKT-2005</code> — القاعدة تستلزم مراجعة شرعية بشرية (تحذير).
              </li>
            </ul>
            <p>
              أخطاء القواعد (<code>ZKT-2xxx</code>) لا تُفشل الطلب: يعود 200 بشهادة{" "}
              <code>provisional</code> وتظهر أسبابها التفصيلية في <code>rules.failures</code> بنفس
              بنية <code>details</code>. كل استجابة تحمل <code>requestId</code> وترويسة{" "}
              <code>X-Request-Id</code> لتتبّع الحالة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate limits & SLA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>• CORS مفتوح للجميع.</p>
            <p>
              • Cache: 5 دقائق على <code>GET /nisab</code>، ساعة كاملة على <code>/openapi</code>.
            </p>
            <p>• Rate-limit: 30–60 req/min حسب النقطة.</p>
            <p>• بدون مصادقة لـ MVP — استخدام عادل (Fair Use).</p>
            <p>
              • لتكامل مؤسسي (SAP / Oracle / QuickBooks / Xero) مع SLA ومفاتيح API، تواصل عبر{" "}
              <a className="text-primary underline" href="/enterprise">
                صفحة المؤسسات
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
