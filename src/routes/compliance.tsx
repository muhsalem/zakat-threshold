import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileCheck2, Lock, Globe2, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "التوافق والشهادات (Compliance) — حاسبة الزكاة" },
      {
        name: "description",
        content:
          "مصفوفة توافق حاسبة الزكاة مع المعايير العالمية: SOC 2, ISO 27001, GDPR, PDPL, AAOIFI, WCAG 2.2.",
      },
      { property: "og:title", content: "التوافق والشهادات" },
      {
        property: "og:description",
        content: "SOC 2 · ISO 27001 · GDPR · PDPL · AAOIFI · WCAG 2.2 AA",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompliancePage,
});

type Status = "certified" | "compliant" | "in-progress" | "planned";

const STATUS_META: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "outline"; icon: any }
> = {
  certified: { label: "معتَمد", variant: "default", icon: CheckCircle2 },
  compliant: { label: "متوافق", variant: "secondary", icon: ShieldCheck },
  "in-progress": { label: "قيد الاعتماد", variant: "outline", icon: FileCheck2 },
  planned: { label: "مخطَّط", variant: "outline", icon: AlertTriangle },
};

type ControlRow = {
  standard: string;
  scope: string;
  status: Status;
  evidence?: string;
  target?: string;
};

const SECURITY: ControlRow[] = [
  {
    standard: "SOC 2 Type II",
    scope: "Security · Availability · Confidentiality",
    status: "in-progress",
    target: "Q3 2027",
    evidence: "Vanta continuous monitoring",
  },
  { standard: "ISO 27001:2022", scope: "ISMS شامل", status: "in-progress", target: "Q4 2027" },
  { standard: "ISO 27701", scope: "PIMS لخصوصية المعلومات", status: "planned", target: "2028" },
  {
    standard: "NIST CSF 2.0",
    scope: "5 دوال أساسية + Govern",
    status: "compliant",
    evidence: "self-attested — راجع /security",
  },
  { standard: "OWASP ASVS L2", scope: "التحقق الأمني للتطبيقات", status: "compliant" },
  { standard: "CIS Benchmarks", scope: "تشديد البنية التحتية", status: "compliant" },
];

const PRIVACY: ControlRow[] = [
  {
    standard: "GDPR (EU 2016/679)",
    scope: "حقوق المستخدم الأوروبي",
    status: "compliant",
    evidence: "DPIA + سجل معالجة",
  },
  { standard: "UK GDPR + DPA 2018", scope: "المملكة المتحدة", status: "compliant" },
  {
    standard: "PDPL (SDAIA — KSA)",
    scope: "قانون حماية البيانات السعودي",
    status: "compliant",
    evidence: "DPO مُعيَّن، تخزين إقليمي متاح",
  },
  { standard: "DIFC DPL 2020", scope: "مركز دبي المالي", status: "compliant" },
  { standard: "CCPA / CPRA", scope: "كاليفورنيا", status: "compliant" },
  { standard: "LGPD", scope: "البرازيل", status: "planned" },
  { standard: "PIPEDA", scope: "كندا", status: "compliant" },
];

const SHARIA: ControlRow[] = [
  {
    standard: "AAOIFI Shariah Standard No. 35 (Zakah)",
    scope: "أساس الحسابات",
    status: "compliant",
    evidence: "موثَّق في /audit",
  },
  {
    standard: "AAOIFI FAS 9",
    scope: "المحاسبة الزكوية للقيود",
    status: "compliant",
    evidence: "قيود ERP في /api/public/erp/journal",
  },
  { standard: "AAOIFI Shariah Standard No. 59", scope: "العملات الرقمية", status: "compliant" },
  {
    standard: "IFA-OIC Resolutions",
    scope: "مجمع الفقه الإسلامي الدولي",
    status: "compliant",
    evidence: "5 قرارات مطبَّقة حالياً في محرك الفتاوى (fatwaEngine.ts)",
  },
  {
    standard: "Sharia Advisory Board (formal)",
    scope: "لجنة شرعية دائمة",
    status: "in-progress",
    target: "Q2 2027",
  },
];

const ACCESSIBILITY: ControlRow[] = [
  {
    standard: "WCAG 2.2 Level AA",
    scope: "التصميم والتفاعل",
    status: "compliant",
    evidence: "axe-core في CI",
  },
  { standard: "WCAG 2.2 Level AAA", scope: "أعلى مستوى", status: "in-progress", target: "Q1 2027" },
  { standard: "EN 301 549 v3.2.1", scope: "المعيار الأوروبي", status: "compliant" },
  { standard: "Section 508 (US)", scope: "الحكومة الفيدرالية الأمريكية", status: "compliant" },
  { standard: "ARIA 1.2 + ARIA Authoring Practices", scope: "قارئات الشاشة", status: "compliant" },
];

const FINANCIAL: ControlRow[] = [
  { standard: "IFRS / IAS 37 (Provisions)", scope: "احتساب مخصص الزكاة", status: "compliant" },
  {
    standard: "ZATCA e-invoicing (Phase 2)",
    scope: "XBRL/UBL للفواتير السعودية",
    status: "compliant",
    evidence: "?format=xbrl",
  },
  { standard: "PEPPOL BIS Billing 3.0", scope: "الفوترة عبر الحدود", status: "planned" },
  { standard: "ISO 20022", scope: "الرسائل المصرفية", status: "planned" },
  {
    standard: "PCI DSS 4.0",
    scope: "بيانات البطاقات",
    status: "planned",
    target: "عند دمج بوّابة دفع مباشرة",
  },
];

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className="text-[10px] gap-1">
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}

function Matrix({ title, icon: Icon, rows }: { title: string; icon: any; rows: ControlRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          <Badge variant="outline" className="text-[10px]">
            {rows.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-start py-2 font-medium">المعيار</th>
                <th className="text-start py-2 font-medium">النطاق</th>
                <th className="text-start py-2 font-medium">الحالة</th>
                <th className="text-start py-2 font-medium">الدليل / الهدف</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.standard} className="border-b last:border-b-0">
                  <td className="py-2 pe-3 font-medium">{r.standard}</td>
                  <td className="py-2 pe-3 text-muted-foreground">{r.scope}</td>
                  <td className="py-2 pe-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {r.evidence ?? (r.target ? `مستهدف: ${r.target}` : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CompliancePage() {
  const all = [...SECURITY, ...PRIVACY, ...SHARIA, ...ACCESSIBILITY, ...FINANCIAL];
  const counts = all.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { certified: 0, compliant: 0, "in-progress": 0, planned: 0 } as Record<Status, number>,
  );

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6" rel="canonical">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lock className="h-7 w-7 text-primary" />
          التوافق والشهادات
        </h1>
        <p className="text-muted-foreground">
          مصفوفة شفافة لكل معيار عالمي نلتزم به، مع الحالة الفعلية والدليل. {all.length} ضابط
          مراقَب.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge>معتَمد: {counts.certified}</Badge>
          <Badge variant="secondary">متوافق: {counts.compliant}</Badge>
          <Badge variant="outline">قيد الاعتماد: {counts["in-progress"]}</Badge>
          <Badge variant="outline">مخطَّط: {counts.planned}</Badge>
        </div>
      </header>

      <Matrix title="الأمن السيبراني" icon={ShieldCheck} rows={SECURITY} />
      <Matrix title="الخصوصية وحماية البيانات" icon={Globe2} rows={PRIVACY} />
      <Matrix title="الالتزام الشرعي" icon={FileCheck2} rows={SHARIA} />
      <Matrix title="إمكانية الوصول (Accessibility)" icon={CheckCircle2} rows={ACCESSIBILITY} />
      <Matrix title="المعايير المالية والمحاسبية" icon={FileCheck2} rows={FINANCIAL} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تنويهات</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            • "متوافق (compliant)" يعني تطبيق الضوابط والتوثيق الذاتي؛ "معتَمد (certified)" يتطلب
            مدقّق طرف ثالث.
          </p>
          <p>• جميع تواريخ الاستهداف تقديرية وقابلة للتحديث كل ربع سنة.</p>
          <p>
            • للتحقق أو طلب تقرير مفصّل: راجع صفحة{" "}
            <a className="text-primary underline" href="/security">
              الأمن
            </a>{" "}
            أو{" "}
            <a className="text-primary underline" href="/developers">
              المطوّرين
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
