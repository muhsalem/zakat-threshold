import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Plug, Globe2, ShieldCheck, Download, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { listJurisdictions } from "@/lib/jurisdictions";
import { SUPPORTED_ERP_FORMATS, type ErpFormat } from "@/lib/erp/journal";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "التكامل المؤسسي — حاسبة الزكاة" },
      { name: "description", content: "موصّلات ERP وواجهات API للبنوك الإسلامية والشركات — SAP, Oracle, QuickBooks, Xero." },
      { property: "og:title", content: "التكامل المؤسسي — حاسبة الزكاة" },
      { property: "og:description", content: "ERP + Islamic Banking connectors" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnterprisePage,
});

const CONNECTORS = [
  { name: "QuickBooks Online", status: "planned", eta: "Q1 2027", tier: "SaaS" },
  { name: "Xero", status: "planned", eta: "Q1 2027", tier: "SaaS" },
  { name: "Zoho Books", status: "planned", eta: "Q2 2027", tier: "SaaS" },
  { name: "Odoo", status: "planned", eta: "Q2 2027", tier: "ERP" },
  { name: "Microsoft Dynamics 365", status: "planned", eta: "Q3 2027", tier: "ERP" },
  { name: "SAP S/4HANA", status: "planned", eta: "Q4 2027", tier: "ERP" },
  { name: "Oracle Fusion", status: "planned", eta: "Q4 2027", tier: "ERP" },
  { name: "NetSuite", status: "planned", eta: "Q1 2028", tier: "ERP" },
  { name: "SAMA Open Banking (KSA)", status: "planned", eta: "Q2 2027", tier: "Banking" },
  { name: "CBUAE Open Finance", status: "planned", eta: "Q3 2027", tier: "Banking" },
  { name: "Zapier / Make / n8n (iPaaS)", status: "available", eta: "via REST", tier: "iPaaS" },
  { name: "Webhooks (custom)", status: "available", eta: "متاح", tier: "Custom" },
];

function EnterprisePage() {
  const jurisdictions = listJurisdictions();
  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          التكامل المؤسسي (Enterprise)
        </h1>
        <p className="text-muted-foreground">
          موصّلات جاهزة لأنظمة ERP وواجهات مصرفية إسلامية لتضمين حسابات الزكاة داخل بيئتك المؤسسية.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            الموصّلات (Connectors)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONNECTORS.map((c) => (
              <div key={c.name} className="rounded-lg border p-3 flex flex-col gap-1">
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={c.status === "available" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {c.status === "available" ? "متاح" : "قيد التطوير"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">{c.tier}</Badge>
                  <span className="text-xs text-muted-foreground mr-auto">{c.eta}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
            التكامل المتاح اليوم يعتمد على REST API عبر iPaaS. للتكامل الأصلي (Native ERP)
            تواصل معنا لبدء برنامج Early Access.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            الولايات القضائية المدعومة ({jurisdictions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {jurisdictions.map((j) => (
              <div key={j.code} className="rounded border bg-muted/30 p-2">
                <div className="font-semibold">{j.name_ar}</div>
                <div className="text-xs text-muted-foreground">
                  {j.official_body} · {j.currency}
                </div>
                {j.report_format && (
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {j.report_format}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            التوافق والأمان
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• OpenAPI 3.1 — تكامل فوري مع Postman/Swagger.</p>
          <p>• OAuth 2.1 + JWT للتكاملات المصادَق عليها.</p>
          <p>• RLS على قاعدة البيانات + Audit Trail شرعي كامل.</p>
          <p>• قيد الحصول على: ISO 27001، SOC 2 Type II.</p>
          <p>• متوافق مع AAOIFI 35 &amp; 59، IFA-OIC، IFRS/IAS.</p>
          <p className="pt-2 border-t mt-3">
            راجع <a className="text-primary underline" href="/developers">صفحة المطوّرين</a> للبدء
            الفوري، أو <a className="text-primary underline" href="/api/public/openapi" target="_blank" rel="noreferrer">حمّل مواصفات OpenAPI</a>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
