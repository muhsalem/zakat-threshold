import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Cloud,
  ShieldCheck,
  Activity,
  Workflow,
  Bot,
  TestTube2,
  Database,
  Lock,
  GitBranch,
  LineChart,
  MessagesSquare,
} from "lucide-react";

export const Route = createFileRoute("/software-recommendations")({
  head: () => ({
    meta: [
      { title: "توصيات البرمجيات وموصّلات ERP — حاسبة الزكاة" },
      {
        name: "description",
        content:
          "خارطة الحلول والبرمجيات الموصى بها لحاسبة الزكاة على مستوى المؤسسات: ERP وiPaaS ومراقبة وأمن وتحاليل.",
      },
      { property: "og:title", content: "توصيات البرمجيات وموصّلات ERP" },
      {
        property: "og:description",
        content: "Stack مؤسسي متكامل: ERP + iPaaS + Security + Observability",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Item = {
  name: string;
  role: string;
  status: "in-use" | "recommended" | "roadmap";
  note?: string;
};
type Section = { title: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "موصّلات ERP الأصلية",
    icon: Boxes,
    items: [
      {
        name: "QuickBooks Online — JournalEntry API v3",
        role: "SMB accounting",
        status: "in-use",
        note: "endpoint: /api/public/erp/journal?format=quickbooks",
      },
      {
        name: "Xero — ManualJournal API",
        role: "SMB accounting",
        status: "in-use",
        note: "?format=xero (LineAmount مع إشارة سالبة للائتمان)",
      },
      {
        name: "Zoho Books / Sage / Wave",
        role: "SMB accounting",
        status: "in-use",
        note: "?format=csv (استيراد قياسي)",
      },
      {
        name: "Odoo — account.move",
        role: "Open-source ERP",
        status: "in-use",
        note: "?format=odoo يُمرَّر عبر XML-RPC",
      },
      {
        name: "NetSuite — SuiteTalk",
        role: "Enterprise ERP",
        status: "in-use",
        note: "?format=netsuite يُرجِع JSON جاهز للاستيراد اليدوي — لا يوجد اتصال SuiteTalk API حي بعد",
      },
      {
        name: "SAP S/4HANA — IDoc ACC_DOCUMENT03",
        role: "Enterprise ERP",
        status: "in-use",
        note: "?format=sap يُرجِع XML جاهز للاستيراد",
      },
      {
        name: "Microsoft Dynamics 365 F&O",
        role: "Enterprise ERP",
        status: "roadmap",
        note: "OData v4 + Data Management Framework",
      },
      {
        name: "Oracle Fusion Cloud ERP",
        role: "Enterprise ERP",
        status: "roadmap",
        note: "FBDI + REST 21D+",
      },
    ],
  },
  {
    title: "iPaaS ومنصات التنسيق",
    icon: Workflow,
    items: [
      {
        name: "Zapier",
        role: "لا-كود، آلاف التطبيقات",
        status: "in-use",
        note: "استقبل Webhook موقّع HMAC من /api/public/erp/webhook",
      },
      { name: "Make (Integromat)", role: "بديل مرن أرخص", status: "in-use" },
      {
        name: "n8n (self-hosted)",
        role: "سيادة كاملة على البيانات",
        status: "in-use",
        note: "موصى به للبنوك/المؤسسات الشرعية",
      },
      {
        name: "Workato / MuleSoft / Boomi",
        role: "Enterprise iPaaS",
        status: "recommended",
        note: "للتكامل مع SAP/Oracle عبر iDocs & ESB",
      },
      {
        name: "Apache Camel / Kafka Connect",
        role: "Event streaming",
        status: "roadmap",
        note: "لبيئات معالجة الأحداث الشرعية",
      },
    ],
  },
  {
    title: "معايير مالية ومصرفية",
    icon: Cloud,
    items: [
      { name: "SAMA Open Banking (KSA)", role: "Account Info + AISP", status: "roadmap" },
      { name: "CBUAE Open Finance", role: "AISP/PISP", status: "roadmap" },
      { name: "BankID / Aadhaar / Absher", role: "eKYC مسلم", status: "roadmap" },
      { name: "ISO 20022 (pain.001, camt.053)", role: "رسائل مصرفية", status: "recommended" },
      {
        name: "XBRL / iXBRL",
        role: "تقارير رقابية (ZATCA/FCA/SEC)",
        status: "in-use",
        note: "?format=xbrl",
      },
      { name: "PEPPOL BIS 3.0", role: "فوترة إلكترونية عابرة الحدود", status: "recommended" },
    ],
  },
  {
    title: "المراقبة والرصد (Observability)",
    icon: Activity,
    items: [
      {
        name: "Sentry",
        role: "أخطاء واجهة/خادم",
        status: "recommended",
        note: "SDK متوافق مع Workers + tRPC",
      },
      {
        name: "PostHog",
        role: "منتج/تحليلات سلوك",
        status: "recommended",
        note: "self-hosted متاح — أفضل لخصوصية الزكاة",
      },
      {
        name: "OpenTelemetry + Grafana Tempo/Loki/Mimir",
        role: "Traces/Logs/Metrics",
        status: "recommended",
      },
      { name: "Datadog / New Relic", role: "APM مؤسسي", status: "roadmap" },
      {
        name: "Cloudflare Logpush → BigQuery/Snowflake",
        role: "تدقيق طويل الأمد",
        status: "recommended",
      },
    ],
  },
  {
    title: "الأمن السيبراني والامتثال",
    icon: ShieldCheck,
    items: [
      {
        name: "Snyk / Semgrep / Trivy",
        role: "SAST + SCA + Container scan",
        status: "recommended",
      },
      { name: "Dependabot + Renovate", role: "Patch management آلي", status: "in-use" },
      { name: "Vault (HashiCorp) / AWS KMS", role: "إدارة أسرار مؤسسية", status: "roadmap" },
      { name: "Cloudflare WAF + Bot Management + Turnstile", role: "طبقة حافة", status: "in-use" },
      { name: "SOC 2 Type II — Vanta / Drata", role: "أتمتة الشهادة", status: "roadmap" },
      { name: "ISO 27001 / ISO 27701", role: "أمن معلومات + خصوصية", status: "roadmap" },
      { name: "GDPR / PDPL (KSA) / DIFC DPL", role: "خصوصية إقليمية", status: "recommended" },
    ],
  },
  {
    title: "الاختبار وضمان الجودة",
    icon: TestTube2,
    items: [
      { name: "Vitest — Unit/Integration", role: "72+ اختبار حاليًا", status: "in-use" },
      { name: "fast-check — Property-based", role: "2000+ سيناريو عشوائي", status: "in-use" },
      { name: "Playwright — E2E متعدد المتصفحات", role: "متضمّن في CI", status: "recommended" },
      { name: "axe-core / pa11y — WCAG 2.2 AA/AAA", role: "إمكانية الوصول", status: "recommended" },
      { name: "k6 / Artillery — Load testing", role: "قدرة الاستجابة", status: "recommended" },
      { name: "Stryker — Mutation testing", role: "قوة الاختبارات", status: "roadmap" },
      { name: "Chaos Mesh / LitmusChaos", role: "هندسة الفوضى", status: "roadmap" },
    ],
  },
  {
    title: "قواعد البيانات والبيانات",
    icon: Database,
    items: [
      { name: "Supabase Postgres + RLS", role: "قاعدة أساسية", status: "in-use" },
      {
        name: "TimescaleDB / Hypertables",
        role: "لأسعار المعادن اليومية 50 سنة",
        status: "recommended",
      },
      { name: "pg_cron + pg_net", role: "جدولة snapshots يومية", status: "in-use" },
      { name: "Meilisearch / Typesense", role: "بحث فوري في الفتاوى", status: "recommended" },
      { name: "DuckDB / MotherDuck", role: "تحليلات جانب المتصفح", status: "recommended" },
      {
        name: "Snowflake / BigQuery / Databricks",
        role: "Data warehouse مؤسسي",
        status: "roadmap",
      },
    ],
  },
  {
    title: "الذكاء الاصطناعي والفتاوى",
    icon: Bot,
    items: [
      { name: "Lovable AI Gateway (Gemini/Claude/GPT)", role: "المحرك الرئيسي", status: "in-use" },
      { name: "Voyage / Cohere Embeddings", role: "بحث دلالي في المتون", status: "recommended" },
      { name: "pgvector + HNSW", role: "تخزين متجهي", status: "recommended" },
      { name: "Gemini Vision — OCR للفواتير/العملات", role: "استيراد ذكي", status: "roadmap" },
      { name: "Whisper — إدخال صوتي عربي", role: "وصول أوسع", status: "roadmap" },
      { name: "LangSmith / Langfuse", role: "تتبّع سلاسل LLM", status: "recommended" },
    ],
  },
  {
    title: "CI/CD وإدارة الإصدارات",
    icon: GitBranch,
    items: [
      { name: "GitHub Actions", role: "بناء + اختبار + نشر", status: "recommended" },
      { name: "Changesets", role: "إدارة إصدارات دلالية", status: "recommended" },
      { name: "Argo CD / Flux", role: "GitOps للنشر المؤسسي", status: "roadmap" },
      { name: "Sigstore / cosign", role: "توقيع القطع الفنية", status: "roadmap" },
      { name: "SLSA Level 3", role: "سلسلة توريد آمنة", status: "roadmap" },
    ],
  },
  {
    title: "التحليلات ولوحات المعلومات",
    icon: LineChart,
    items: [
      { name: "Metabase / Superset / Lightdash", role: "BI مفتوح المصدر", status: "recommended" },
      { name: "Cube.js / Malloy", role: "طبقة نمذجة موحّدة", status: "recommended" },
      { name: "PowerBI / Tableau — via ODBC", role: "تقارير مؤسسية", status: "roadmap" },
    ],
  },
  {
    title: "التواصل والدعم",
    icon: MessagesSquare,
    items: [
      { name: "Resend / SendGrid — بريد المعاملات", role: "تنبيهات الحول", status: "in-use" },
      {
        name: "Twilio / MessageBird — SMS/WhatsApp",
        role: "تذكير الحول محلياً",
        status: "recommended",
      },
      { name: "Crisp / Intercom / Chatwoot", role: "دعم فوري", status: "roadmap" },
      { name: "Discourse", role: "مجتمع الفقهاء والمحاسبين", status: "roadmap" },
    ],
  },
  {
    title: "الهوية والوصول",
    icon: Lock,
    items: [
      { name: "Supabase Auth (Google/Email/OTP)", role: "المستوى الحالي", status: "in-use" },
      {
        name: "WorkOS / Auth0 — SAML SSO + SCIM",
        role: "متطلّب مؤسسات B2B",
        status: "recommended",
      },
      { name: "Passkeys (WebAuthn)", role: "بدون كلمة سر", status: "recommended" },
      { name: "OpenFGA / Cerbos", role: "تفويض دقيق (RBAC/ABAC)", status: "roadmap" },
    ],
  },
];

function statusBadge(s: Item["status"]) {
  if (s === "in-use") return <Badge className="text-[10px]">مطبَّق</Badge>;
  if (s === "recommended")
    return (
      <Badge variant="secondary" className="text-[10px]">
        موصى به
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[10px]">
      خارطة الطريق
    </Badge>
  );
}

function Page() {
  const total = SECTIONS.reduce((s, x) => s + x.items.length, 0);
  const inUse = SECTIONS.reduce(
    (s, x) => s + x.items.filter((i) => i.status === "in-use").length,
    0,
  );
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">توصيات البرمجيات وموصّلات ERP</h1>
        <p className="text-muted-foreground">
          خارطة مرجعية مؤسسية شاملة: {total} أداة/معيار موزّعة على {SECTIONS.length} محاور، منها{" "}
          {inUse} مطبّقة فعلاً في الحاسبة اليوم.
        </p>
        <div className="flex gap-2 flex-wrap text-xs">
          <Badge>مطبَّق ({inUse})</Badge>
          <Badge variant="secondary">موصى به قريب المدى</Badge>
          <Badge variant="outline">خارطة الطريق</Badge>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <Card key={sec.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {sec.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sec.items.map((i) => (
                  <div key={i.name} className="rounded border p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium text-sm">{i.name}</div>
                      {statusBadge(i.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">{i.role}</div>
                    {i.note && (
                      <div className="text-[11px] text-muted-foreground/80 border-t pt-1">
                        {i.note}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الجاهزية اليوم</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            تُصدَّر قيود الزكاة الآن مباشرةً بصيغ:
            <span className="font-mono mx-2">
              QuickBooks · Xero · Odoo · NetSuite · SAP IDoc · CSV · XBRL · Generic JSON
            </span>
            عبر{" "}
            <a
              className="text-primary underline"
              href="/api/public/erp/journal?format=xero"
              target="_blank"
              rel="noreferrer"
            >
              /api/public/erp/journal
            </a>
            .
          </p>
          <p>
            يستقبل النظام Webhooks موقّعة (HMAC-SHA256 + منع Replay 5 دقائق) من iPaaS عبر
            <a className="text-primary underline mx-1" href="/api/public/erp/webhook">
              /api/public/erp/webhook
            </a>
            — كافية اليوم لدمج Zapier/Make/n8n دون كتابة أي كود عميل.
          </p>
          <p>
            انظر{" "}
            <a className="text-primary underline" href="/enterprise">
              /enterprise
            </a>{" "}
            للتجربة المباشرة، و{" "}
            <a
              className="text-primary underline"
              href="/api/public/openapi"
              target="_blank"
              rel="noreferrer"
            >
              /api/public/openapi
            </a>{" "}
            لمواصفات OpenAPI 3.1 الكاملة.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
