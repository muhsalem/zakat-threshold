import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Database, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/erp-connectors")({
  head: () => ({
    meta: [
      { title: "تكاملات ERP لحساب الزكاة — نصاب" },
      {
        name: "description",
        content:
          "اربط برنامج المحاسبة الخاص بشركتك (Zoho Books، QuickBooks، Xero، Wave، Odoo، SAP) بمنصة نصاب لسحب ميزان المراجعة تلقائياً وحساب الزكاة بدقة.",
      },
      { property: "og:title", content: "تكاملات ERP — نصاب" },
      {
        property: "og:description",
        content: "8 مزودي ERP مدعومين — Odoo وSAP جاهزان الآن، والباقي في الطريق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ErpConnectorsPage,
});

interface Provider {
  id: string;
  name: string;
  status: "live" | "beta" | "coming_soon";
  desc: string;
  logo: string;
}

const PROVIDERS: Provider[] = [
  {
    id: "odoo",
    name: "Odoo",
    status: "live",
    desc: "JSON-RPC مباشر مع نسخة Cloud/On-premise، push قيود يومية للزكاة.",
    logo: "🟣",
  },
  {
    id: "sap",
    name: "SAP S/4HANA Cloud",
    status: "live",
    desc: "OData API مع دعم CSRF token وpush قيد اليومية إلى API_JOURNALENTRY_SRV.",
    logo: "🔵",
  },
  {
    id: "zoho_books",
    name: "Zoho Books",
    status: "beta",
    desc: "متوفر كموصل عام (Standard Connector). اربطه ثم استخدم /organizations لسحب البيانات.",
    logo: "🟠",
  },
  {
    id: "waveapps",
    name: "Wave Accounting",
    status: "beta",
    desc: "متوفر كموصل عام مع GraphQL — مناسب للشركات الصغيرة والمحاسبين المستقلين.",
    logo: "🌊",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    status: "coming_soon",
    desc: "قيد التطوير — يتطلب تسجيل تطبيق OAuth في Intuit Developer + App User Connector.",
    logo: "🟢",
  },
  {
    id: "xero",
    name: "Xero",
    status: "coming_soon",
    desc: "قيد التطوير — يتطلب تسجيل تطبيق OAuth 2.0 في Xero Developer Portal.",
    logo: "🔷",
  },
  {
    id: "microsoft_dynamics",
    name: "Microsoft Dynamics 365",
    status: "coming_soon",
    desc: "OData v4 مع Azure AD OAuth — للشركات الكبيرة.",
    logo: "🟦",
  },
  {
    id: "netsuite",
    name: "Oracle NetSuite",
    status: "coming_soon",
    desc: "SuiteTalk REST مع Token-Based Authentication.",
    logo: "🔴",
  },
];

function StatusBadge({ status }: { status: Provider["status"] }) {
  if (status === "live")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mr-1 h-3 w-3" /> مفعّل الآن
      </Badge>
    );
  if (status === "beta")
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">تجريبي</Badge>
    );
  return (
    <Badge variant="outline">
      <Clock className="mr-1 h-3 w-3" /> قريباً
    </Badge>
  );
}

function ErpConnectorsPage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Database className="h-6 w-6 text-primary" />
          تكاملات ERP وأنظمة المحاسبة
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          اربط برنامج المحاسبة الخاص بشركتك لسحب ميزان المراجعة وحساب الزكاة تلقائياً،
          ثم دفع قيد الزكاة إلى دفاترك عند الاعتماد.
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-xs leading-6">
          <strong>Odoo وSAP</strong> مفعّلان بالكامل — يمكنك إعداد الاتصال الآن من
          {" "}
          <Link to="/_authenticated/erp-setup" className="font-semibold text-primary hover:underline">
            صفحة إعداد ERP
          </Link>
          . <strong>Zoho Books وWave</strong> متوفران عبر Standard Connectors في لوحة الإعدادات.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => (
          <Card key={p.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-2xl">{p.logo}</span>
                  {p.name}
                </CardTitle>
                <StatusBadge status={p.status} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-6 text-muted-foreground">{p.desc}</p>
              {p.status === "live" && (
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/_authenticated/erp-setup">
                    إعداد الاتصال <ArrowRight className="mr-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">تحتاج تكامل مع نظام غير مدرج؟</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ندعم أي نظام محاسبي عبر API عام أو تصدير CSV/Excel لميزان المراجعة.
          استخدم <Link to="/_authenticated/erp-setup" className="text-primary hover:underline">
          إعداد ERP</Link> لرفع ملف يدوياً، أو <Link to="/enterprise" className="text-primary hover:underline">
          تواصل معنا</Link> لتكامل مخصّص.
        </CardContent>
      </Card>
    </div>
  );
}
