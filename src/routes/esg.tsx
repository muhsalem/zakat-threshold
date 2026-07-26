import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Users, ShieldCheck, Eye, Activity, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/esg")({
  head: () => ({
    meta: [
      { title: "تقرير الاستدامة والحوكمة (ESG) — حاسبة الزكاة" },
      {
        name: "description",
        content: "شفافية كاملة حول أثرنا البيئي والاجتماعي والحوكمي في خدمة أموال الزكاة.",
      },
      { property: "og:title", content: "تقرير ESG — حاسبة الزكاة" },
      { property: "og:description", content: "الحوكمة والشفافية وإدارة أموال الزكاة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EsgPage,
});

function EsgPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Leaf className="h-7 w-7 text-primary" />
          تقرير الاستدامة والحوكمة (ESG)
        </h1>
        <p className="text-muted-foreground">
          التزامنا بالشفافية والمساءلة في خدمة فريضة الزكاة وأمانتها.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" /> البيئي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">&lt; 0.5 g</div>
            <div className="text-xs text-muted-foreground">
              CO₂e لكل عملية حساب (Cloudflare edge)
            </div>
            <Badge variant="outline" className="text-[10px] mt-2">
              Green Hosting
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" /> الاجتماعي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">8 قنوات</div>
            <div className="text-xs text-muted-foreground">تتبّع كامل للمصارف الثمانية الشرعية</div>
            <Badge variant="outline" className="text-[10px] mt-2">
              Sadaqah Impact
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> الحوكمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">Full Audit</div>
            <div className="text-xs text-muted-foreground">سجل تدقيق شرعي قابل للتصدير</div>
            <Badge variant="outline" className="text-[10px] mt-2">
              Sharia Governance
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            مبادئ الشفافية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>• جميع الحسابات موثّقة بمرجعية فقهية ومعيار شرعي (AAOIFI 35 / IFA-OIC).</p>
          <p>• سجل تعديلات الفتاوى قابل للمراجعة العامة.</p>
          <p>• أسعار المعادن من مصادر متعددة مع مؤشّر موثوقية (Direct / Derived / Estimated).</p>
          <p>• لا نحتفظ بأي بيانات مالية بدون موافقة صريحة من المستخدم.</p>
          <p>• سياسة الخصوصية متوافقة مع GDPR وCCPA.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            مؤشرات الأداء (KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[
              { k: "المذاهب", v: "5" },
              { k: "الفتاوى", v: "50+" },
              { k: "الولايات", v: "14" },
              { k: "العملات", v: "25+" },
              { k: "الأصول", v: "40+ نوع" },
              { k: "بيانات الأسعار", v: "1926→" },
            ].map((x) => (
              <div key={x.k} className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xl font-bold text-primary">{x.v}</div>
                <div className="text-xs text-muted-foreground">{x.k}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            التوافق مع المعايير العالمية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "AAOIFI 35",
              "AAOIFI 59",
              "IFA-OIC",
              "IFRS",
              "IAS",
              "ISO 25010",
              "ISO 27001 (قيد)",
              "WCAG 2.2 AA",
              "NIST CSF 2.0",
              "OpenAPI 3.1",
              "GRI (قيد)",
              "SASB (قيد)",
            ].map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground border-t pt-4">
        يُحدَّث هذا التقرير ربع سنوياً. لطلب نسخة كاملة موقّعة تواصل معنا عبر{" "}
        <a className="underline" href="/advisor">
          مركز الدعم
        </a>
        .
      </p>
    </main>
  );
}
