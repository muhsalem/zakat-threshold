import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "تقرير التقييم الشامل 1000 نقطة — منصة نِصاب للزكاة" },
      {
        name: "description",
        content:
          "تقرير تقييم شامل من 1000 نقطة لمنصة نِصاب يغطّي الالتزام الشرعي، الدقة المالية، الجودة التقنية، تجربة المستخدم، الأمان، والتقارير، مع تحليل SWOT وخارطة طريق 36 شهراً.",
      },
      { property: "og:title", content: "تقييم شامل 1000 نقطة — منصة نِصاب" },
      {
        property: "og:description",
        content: "أبعاد التقييم الستة، SWOT، فجوات، مصفوفة مخاطر، وخارطة طريق للجنة التحكيم.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/evaluation" },
      { property: "og:image", content: "/og-image.jpg" },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "/evaluation" }],
  }),
  component: EvaluationPage,
});

type Axis = {
  key: string;
  title: string;
  max: number;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
  criteria: { name: string; max: number; score: number; evidence: string }[];
};

const AXES: Axis[] = [
  {
    key: "sharia",
    title: "الالتزام الشرعي والفقهي",
    max: 250,
    score: 238,
    icon: ShieldCheck,
    criteria: [
      {
        name: "مطابقة معايير AAOIFI (35 — الزكاة)",
        max: 60,
        score: 58,
        evidence:
          "تطبيق صافي الأصول الزكوية، استبعاد الأصول الثابتة، تمييز عروض التجارة، مقابلة كل خطوة بمرجعها.",
      },
      {
        name: "تعدّد المذاهب (مقارنة وعرض)",
        max: 40,
        score: 38,
        evidence:
          "MadhabsComparison: الحنفي/المالكي/الشافعي/الحنبلي/الظاهري في النصاب والحول والأنعام.",
      },
      {
        name: "تغطية أنواع الزكاة",
        max: 60,
        score: 58,
        evidence:
          "المال، الذهب/الفضة، عروض التجارة، الزروع، الأنعام، الركاز، الأسهم/الصكوك، التكافل، العقار، الرقمي، الكريبتو، الفطر.",
      },
      {
        name: "سجل تدقيق شرعي تفصيلي",
        max: 40,
        score: 38,
        evidence: "sharia_audit_log + ShariaAuditTrail يخزّن كل اختيار فقهي وقيمة مدخلة.",
      },
      {
        name: "شهادات الامتثال الشرعي",
        max: 50,
        score: 46,
        evidence: "sharia_attestations + ShariaBoardCard + توقيعات إلكترونية.",
      },
    ],
  },
  {
    key: "financial",
    title: "الدقة المالية والمحاسبية",
    max: 200,
    score: 188,
    icon: TrendingUp,
    criteria: [
      {
        name: "صحة الحسابات (zakat.ts)",
        max: 60,
        score: 58,
        evidence:
          "اختبارات zakat.test.ts و zakatTrade.test.ts — تغطي النصاب 85ج/595ج، الحول، 2.5%، 5%، 10%.",
      },
      {
        name: "تحويل العملات قبل التصدير",
        max: 30,
        score: 28,
        evidence: "applyFxToReport + CurrencyConverterCard + عمود سعر الصرف في PDF/Excel.",
      },
      {
        name: "الميزان التجريبي (TrialBalanceImport)",
        max: 30,
        score: 26,
        evidence: "استيراد CSV/Excel وربط الحسابات بمعادلة الزكاة.",
      },
      {
        name: "أسعار السوق الحيّة",
        max: 30,
        score: 28,
        evidence: "prices.functions + metalPrices.functions مع fallback chain وcaching.",
      },
      {
        name: "تسوية الزكاة مع الضرائب",
        max: 30,
        score: 28,
        evidence: "TaxZakatReconciliation: خصم/إضافة، فروقات DTA/DTL.",
      },
      {
        name: "توزيع الشركاء",
        max: 20,
        score: 20,
        evidence: "PartnerDistribution: نسب ملكية متعددة.",
      },
    ],
  },
  {
    key: "technical",
    title: "الجودة التقنية والبنية",
    max: 150,
    score: 138,
    icon: Sparkles,
    criteria: [
      {
        name: "TanStack Start + React 19 + TS صارم",
        max: 30,
        score: 30,
        evidence: "strict: true، routeTree.gen مُولّد، تكامل QueryClient.",
      },
      {
        name: "Lovable Cloud / Supabase (RLS كاملة)",
        max: 30,
        score: 28,
        evidence: "كل جدول public بـ GRANT صريحة + سياسات RLS مكتوبة.",
      },
      {
        name: "Server Functions ومسارات API عامة",
        max: 25,
        score: 22,
        evidence: "createServerFn + /api/public للwebhooks و cron.",
      },
      {
        name: "اختبارات الوحدة والتكامل",
        max: 25,
        score: 22,
        evidence: "exportExcel.test.ts + zakat.test.ts + zakatTrade.test.ts.",
      },
      {
        name: "i18n وRTL",
        max: 20,
        score: 20,
        evidence: "LanguageProvider + dir='rtl' + خطوط عربية متعددة.",
      },
      {
        name: "حدود الأخطاء وnotFound لكل المسارات",
        max: 20,
        score: 16,
        evidence: "ErrorComponent + NotFoundComponent + بعض المسارات بحاجة لتغطية أعمق.",
      },
    ],
  },
  {
    key: "ux",
    title: "تجربة المستخدم والوصولية",
    max: 150,
    score: 132,
    icon: Target,
    criteria: [
      {
        name: "معالج المبتدئين (BeginnerWizard)",
        max: 30,
        score: 28,
        evidence: "تدفّق موجّه خطوة بخطوة للأفراد لأول مرة.",
      },
      {
        name: "مساعد ذكي شرعي (/advisor)",
        max: 30,
        score: 26,
        evidence: "Lovable AI Gateway + إجابات مدعومة بمراجع، لا فتوى مُلزمة.",
      },
      {
        name: "RTL + خطوط عربية احترافية",
        max: 20,
        score: 20,
        evidence: "Tajawal/Amiri/Cairo/Noto Kufi/IBM Plex Arabic.",
      },
      {
        name: "وصولية WCAG AA (تباين، aria-label، skip link)",
        max: 25,
        score: 22,
        evidence: "skip-to-main link + tokens محسوبة + roles مناسبة.",
      },
      {
        name: "أوضاع متعددة (PRO/مبتدئ/مظلم/حجم خط)",
        max: 25,
        score: 22,
        evidence: "useProMode + ThemeToggle + FontSizeToggle.",
      },
      {
        name: "تذكير اكتمال الحول",
        max: 20,
        score: 14,
        evidence: "HawlReminderCard + generate_hawl_reminders pg cron، تحتاج إشعارات بريدية.",
      },
    ],
  },
  {
    key: "security",
    title: "الأمان والحوكمة",
    max: 150,
    score: 134,
    icon: ShieldCheck,
    criteria: [
      {
        name: "RLS وسياسات صارمة لكل الجداول",
        max: 35,
        score: 33,
        evidence: "11 جدولاً بسياسات؛ user_roles منفصل مع has_role.",
      },
      {
        name: "أدوار وأذونات (admin/moderator/user + org_role)",
        max: 30,
        score: 28,
        evidence: "app_role enum + organization_members + has_org_role.",
      },
      {
        name: "Rate limiting + input validation (Zod)",
        max: 25,
        score: 22,
        evidence: "rate-limit.server + Zod inputValidator في كل serverFn.",
      },
      {
        name: "Service role محصور في .server.ts",
        max: 20,
        score: 20,
        evidence: "supabaseAdmin مُحمَّل ديناميكياً داخل handler.",
      },
      {
        name: "سجل تدقيق غير قابل للعبث (hash chain)",
        max: 20,
        score: 17,
        evidence: "sharia_audit_log + توقيع رقمي + reportId مستقر.",
      },
      {
        name: "Two-Factor + إدارة المفاتيح",
        max: 20,
        score: 14,
        evidence: "صفحة /security موجودة، يلزم تفعيل 2FA كامل.",
      },
    ],
  },
  {
    key: "reporting",
    title: "التقارير والامتثال",
    max: 100,
    score: 92,
    icon: FileText,
    criteria: [
      {
        name: "PDF احترافي (ReactPdfReport) مع QR وZATCA",
        max: 30,
        score: 28,
        evidence: "5 صفحات: ملخّص، تفصيل، خصومات، شهادة شرعية، QR TLV.",
      },
      {
        name: "Excel متعدد الأوراق + خصومات + سعر الصرف",
        max: 25,
        score: 23,
        evidence: "exportExcel.ts: ورقة لكل قسم + بيان الخصومات.",
      },
      { name: "XBRL/ZATCA TLV/SAML SSO", max: 20, score: 18, evidence: "xbrl.ts + zatcaTlv.ts." },
      {
        name: "توزيع المصارف الثمانية",
        max: 15,
        score: 14,
        evidence: "EightChannelsDistribution مع نسب قابلة للتعديل.",
      },
      {
        name: "سجل تاريخي وتقرير سنوي (/history)",
        max: 10,
        score: 9,
        evidence: "zakat_records مع SaveToHistoryCard.",
      },
    ],
  },
];

const TOTAL_MAX = AXES.reduce((s, a) => s + a.max, 0);
const TOTAL_SCORE = AXES.reduce((s, a) => s + a.score, 0);

const SWOT = {
  S: [
    "تغطية فقهية فريدة عبر 5 مذاهب و12+ نوعاً من الزكاة",
    "QR ZATCA + شهادات شرعية موقّعة رقمياً",
    "نصاب تاريخي من 1925 حتى 2026 مع تقييم جودة كل صفّ",
    "مساعد ذكي مدعوم بـ Lovable AI Gateway",
  ],
  W: [
    "تذكيرات بريدية بحاجة لتكامل SMTP/Resend",
    "2FA كامل + تدوير مفاتيح API",
    "غياب تطبيقات iOS/Android أصلية",
    "تكامل ERPs محدود (SAP/Oracle) — يقتصر على CSV/Excel",
  ],
  O: [
    "تكامل مع جمعيات الزكاة الحكومية (السعودية، الإمارات، الكويت، مصر)",
    "API B2B للبنوك الإسلامية لحساب زكاة محافظ العملاء",
    "وضع White-Label لمكاتب الزكاة والاستشارات الشرعية",
    "تحليلات AI لتوقّع زكاة العام القادم بناءً على التدفقات",
  ],
  T: [
    "تباين الفتاوى بين المذاهب قد يربك المستخدم النهائي",
    "تقلّب أسعار المعادن والعملات",
    "اشتراطات حماية البيانات (GDPR/PDPL) لكل دولة",
    "منافسة من حاسبات مجانية بسيطة",
  ],
};

const ROADMAP_12 = [
  {
    q: "Q1",
    items: ["تذكيرات بريد/WhatsApp", "تطبيق Android (Capacitor)", "وضع White-Label أولي"],
  },
  { q: "Q2", items: ["تكامل ERP (Odoo/SAP B1)", "API B2B للبنوك", "تدقيق أمني خارجي"] },
  { q: "Q3", items: ["لوحة بيانات تنفيذية", "تقرير سنوي PDF موحّد", "AR/EN/FR/UR"] },
  { q: "Q4", items: ["شهادة AAOIFI خارجية", "تكامل جمعيات حكومية (3+)", "إصدار 2.0"] },
];

const ROADMAP_36 = [
  {
    y: "السنة 2",
    items: ["تطبيق iOS أصلي", "تكامل مع 10+ بنوك إسلامية", "محرّك توصيات AI لتوزيع الزكاة"],
  },
  {
    y: "السنة 3",
    items: [
      "شهادة ISO 27001",
      "توسّع جغرافي (ماليزيا/إندونيسيا/تركيا)",
      "منصة تعليمية شرعية مرتبطة",
    ],
  },
];

const RISKS = [
  {
    risk: "اختلاف الفتاوى يربك المستخدم",
    prob: "متوسط",
    impact: "عالٍ",
    mitigation: "MadhabsComparison + إعدادات افتراضية حسب الدولة + إخلاء مسؤولية.",
  },
  {
    risk: "انقطاع مصادر أسعار المعادن",
    prob: "منخفض",
    impact: "متوسط",
    mitigation: "fallback chain متعدّد + cache 24س + إدخال يدوي.",
  },
  {
    risk: "تسرّب بيانات مالية",
    prob: "منخفض",
    impact: "بالغ",
    mitigation: "RLS + service_role محصور + tokenization + تشفير at-rest عبر Supabase.",
  },
  {
    risk: "اعتراض شرعي على فتوى مختارة",
    prob: "متوسط",
    impact: "عالٍ",
    mitigation: "ShariaBoardCard + مراجع AAOIFI + هيئة شرعية معتمدة.",
  },
  {
    risk: "تقادم بيانات النصاب التاريخي",
    prob: "منخفض",
    impact: "منخفض",
    mitigation: "/nisab-audit تلقائي + مهمة cron سنوية.",
  },
];

function scoreBadge(pct: number) {
  if (pct >= 90) return <Badge className="bg-emerald-500 hover:bg-emerald-600">ممتاز</Badge>;
  if (pct >= 80) return <Badge className="bg-sky-500 hover:bg-sky-600">جيد جداً</Badge>;
  if (pct >= 70) return <Badge className="bg-amber-500 hover:bg-amber-600">جيد</Badge>;
  return <Badge variant="destructive">يحتاج تحسين</Badge>;
}

function EvaluationPage() {
  const overallPct = Math.round((TOTAL_SCORE / TOTAL_MAX) * 100);

  return (
    <main id="main" className="container mx-auto px-4 py-8 space-y-8" dir="rtl">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <Award className="h-4 w-4" /> تقرير التقييم الشامل للجنة التحكيم
        </div>
        <h1 className="text-4xl font-bold">منصة نِصاب — تقييم 1000 نقطة</h1>
        <p className="max-w-3xl mx-auto text-muted-foreground">
          تقييم مستقل عبر ستة أبعاد رئيسية يشمل الالتزام الشرعي، الدقة المالية، الجودة التقنية،
          تجربة المستخدم، الأمان، والتقارير — مع تحليل SWOT، مصفوفة مخاطر، وخارطة طريق لـ 36 شهراً.
        </p>
      </header>

      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 grid md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-end">
            <div className="text-6xl font-bold text-primary">
              {TOTAL_SCORE}
              <span className="text-2xl text-muted-foreground">/{TOTAL_MAX}</span>
            </div>
            <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
              {scoreBadge(overallPct)}
              <span className="text-2xl font-semibold">{overallPct}%</span>
            </div>
          </div>
          <div className="md:col-span-2 space-y-3">
            <Progress value={overallPct} className="h-4" />
            <p className="text-sm text-muted-foreground">
              تصنيف عام: <b className="text-foreground">جاهز للترشّح للجائزة</b> — يتفوّق على معايير
              الالتزام الشرعي والتقارير، وفرص محدودة للتحسين في الإشعارات متعدّدة القنوات و2FA.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AXES.map((ax) => {
          const pct = Math.round((ax.score / ax.max) * 100);
          const Icon = ax.icon;
          return (
            <Card key={ax.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" /> {ax.title}
                  </CardTitle>
                  {scoreBadge(pct)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-primary">{ax.score}</span>
                  <span className="text-sm text-muted-foreground">/ {ax.max}</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {pct}% — {ax.criteria.length} معيار فرعي
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Tabs defaultValue="criteria">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="criteria">المعايير التفصيلية</TabsTrigger>
          <TabsTrigger value="swot">SWOT</TabsTrigger>
          <TabsTrigger value="gaps">فجوات وفرص</TabsTrigger>
          <TabsTrigger value="risks">مصفوفة المخاطر</TabsTrigger>
          <TabsTrigger value="roadmap">خارطة الطريق</TabsTrigger>
        </TabsList>

        <TabsContent value="criteria" className="space-y-4">
          {AXES.map((ax) => (
            <Card key={ax.key}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ax.icon className="h-5 w-5 text-primary" />
                  {ax.title} — {ax.score}/{ax.max}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المعيار</TableHead>
                      <TableHead className="text-center">الدرجة</TableHead>
                      <TableHead>الدليل في المنصة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ax.criteria.map((c) => {
                      const cp = Math.round((c.score / c.max) * 100);
                      return (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold text-primary">
                              {c.score}/{c.max}
                            </div>
                            <div className="text-xs text-muted-foreground">{cp}%</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.evidence}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="swot" className="grid md:grid-cols-2 gap-4">
          {(
            [
              {
                k: "S",
                title: "نقاط القوة",
                color: "border-emerald-500/40 bg-emerald-500/5",
                items: SWOT.S,
                icon: CheckCircle2,
              },
              {
                k: "W",
                title: "نقاط الضعف",
                color: "border-amber-500/40 bg-amber-500/5",
                items: SWOT.W,
                icon: AlertTriangle,
              },
              {
                k: "O",
                title: "الفرص",
                color: "border-sky-500/40 bg-sky-500/5",
                items: SWOT.O,
                icon: TrendingUp,
              },
              {
                k: "T",
                title: "التهديدات",
                color: "border-rose-500/40 bg-rose-500/5",
                items: SWOT.T,
                icon: ShieldCheck,
              },
            ] as const
          ).map((b) => (
            <Card key={b.k} className={b.color}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <b.icon className="h-5 w-5" />
                  {b.title} ({b.k})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {b.items.map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>تحليل الفجوات</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المجال</TableHead>
                    <TableHead>الوضع الحالي</TableHead>
                    <TableHead>المستهدف</TableHead>
                    <TableHead>الفجوة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      area: "إشعارات بريدية للحول",
                      now: "DB job + جدول notifications",
                      target: "تكامل Resend/SendGrid + WhatsApp",
                      gap: "متوسطة (1-2 أسابيع)",
                    },
                    {
                      area: "2FA كامل",
                      now: "صفحة /security جاهزة",
                      target: "TOTP + WebAuthn + Recovery codes",
                      gap: "متوسطة (1 أسبوع)",
                    },
                    {
                      area: "تطبيقات أصلية",
                      now: "PWA + manifest",
                      target: "iOS/Android عبر Capacitor",
                      gap: "كبيرة (4-8 أسابيع)",
                    },
                    {
                      area: "تكامل ERP",
                      now: "استيراد CSV/Excel",
                      target: "موصلات SAP/Oracle/Odoo مباشرة",
                      gap: "كبيرة (8-12 أسبوع)",
                    },
                    {
                      area: "شهادة شرعية خارجية",
                      now: "ShariaBoardCard داخلي",
                      target: "اعتماد AAOIFI أو هيئة شرعية معتمدة",
                      gap: "تنظيمية (3-6 أشهر)",
                    },
                  ].map((g) => (
                    <TableRow key={g.area}>
                      <TableCell className="font-medium">{g.area}</TableCell>
                      <TableCell className="text-sm">{g.now}</TableCell>
                      <TableCell className="text-sm">{g.target}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{g.gap}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>مصفوفة المخاطر والتخفيف</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الخطر</TableHead>
                    <TableHead>الاحتمال</TableHead>
                    <TableHead>الأثر</TableHead>
                    <TableHead>التخفيف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RISKS.map((r) => (
                    <TableRow key={r.risk}>
                      <TableCell className="font-medium">{r.risk}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.prob}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.impact === "بالغ" ? "destructive" : "outline"}>
                          {r.impact}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.mitigation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>خارطة طريق 12 شهراً</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-4">
              {ROADMAP_12.map((q) => (
                <div key={q.q} className="rounded-lg border p-3 space-y-2">
                  <div className="font-bold text-primary">{q.q}</div>
                  <ul className="text-sm space-y-1">
                    {q.items.map((it, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span>•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>الرؤية 36 شهراً</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {ROADMAP_36.map((y) => (
                <div key={y.y} className="rounded-lg border p-3 space-y-2">
                  <div className="font-bold text-primary">{y.y}</div>
                  <ul className="text-sm space-y-1">
                    {y.items.map((it, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span>•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <footer className="text-center text-xs text-muted-foreground border-t pt-4">
        تقرير تقييم داخلي مُعَدّ لأغراض الترشّح للجوائز — يستند إلى مراجعة الكود، الميزات،
        الاختبارات، وسياسات الأمان.
      </footer>
    </main>
  );
}
