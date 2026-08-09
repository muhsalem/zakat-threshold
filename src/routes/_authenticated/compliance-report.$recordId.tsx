import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Printer,
  ShieldCheck,
  ArrowRight,
  ScrollText,
  BookOpenCheck,
  Landmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SHARIA_REFERENCES,
  RULING_LEVEL_LABELS,
  type ShariaReference,
} from "@/lib/shariaReferences";

export const Route = createFileRoute("/_authenticated/compliance-report/$recordId")({
  head: () => ({
    meta: [
      { title: "تقرير امتثال وحوكمة شرعية — نِصاب" },
      {
        name: "description",
        content:
          "تقرير امتثال شامل يجمع المدخلات والنتائج والأسس الشرعية لكل نوع زكاة (فرد/مؤسسة).",
      },
    ],
  }),
  component: ComplianceReportPage,
  errorComponent: ({ error, reset }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- TanStack يستدعي errorComponent كمكون React فعلي
    const router = useRouter();
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          إعادة المحاولة
        </Button>
      </main>
    );
  },
  notFoundComponent: () => (
    <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
      <Alert>
        <AlertDescription>لم يتم العثور على التقرير.</AlertDescription>
      </Alert>
    </main>
  ),
});

type RecordRow = {
  id: string;
  record_type: string;
  hijri_year: string | null;
  gregorian_date: string;
  currency: string;
  total_assets: number;
  total_liabilities: number;
  zakat_base: number;
  zakat_due: number;
  prepaid_zakat: number;
  net_due: number;
  notes: string | null;
  snapshot: any;
  created_at: string;
};

// ============ خرائط: بنود الوعاء + المرجعيات الشرعية ============

const FIELD_LABELS: Record<string, string> = {
  cash: "نقد باليد",
  bankAccounts: "أرصدة بنكية",
  savingsBonds: "صكوك ادخارية",
  cryptoValue: "عملات رقمية",
  gold: "ذهب (قيمة)",
  goldGrams: "ذهب (جرام)",
  silverGrams: "فضة (جرام)",
  jewelryPersonal: "حلي شخصي",
  investments: "استثمارات عامة",
  stocksTrading: "أسهم للمتاجرة",
  stocksLongTerm: "أسهم طويلة الأجل",
  mutualFunds: "صناديق استثمارية",
  sukuk: "صكوك",
  inventory: "عروض تجارة/مخزون",
  realEstateTrading: "عقار للمتاجرة",
  realEstateRental: "عقار مؤجَّر",
  rentalIncomeAnnual: "دخل إيجاري سنوي",
  agricultureValue: "قيمة المحصول الزراعي",
  agricultureType: "نوع الري",
  livestockCamels: "إبل (عدد)",
  livestockCattle: "بقر (عدد)",
  livestockSheep: "غنم (عدد)",
  salaryMonthly: "راتب شهري",
  endOfServiceBenefits: "مكافأة نهاية خدمة",
  businessAssets: "أصول تشغيلية",
  businessLiabilities: "التزامات قصيرة الأجل",
  receivables: "ديون مستحقة لك",
  debts: "ديون عليك",
  hijriYear: "السنة الهجرية",
  country: "الدولة",
  hawlDate: "تاريخ الحول",
  nisab: "قيمة النصاب",
};

interface Category {
  key: string;
  title: string;
  icon: string;
  fields: string[];
  topics: string[]; // مواضيع من SHARIA_REFERENCES
  intro: string;
}

const CATEGORIES: Category[] = [
  {
    key: "cash",
    title: "زكاة النقود والودائع",
    icon: "💵",
    fields: ["cash", "bankAccounts", "savingsBonds"],
    topics: [
      "نصاب الفضة",
      "مقدار الزكاة (السنة الهجرية)",
      "مقدار الزكاة (السنة الميلادية)",
      "اشتراط الحَوْل",
    ],
    intro:
      "تُحتسب على مجموع النقود والأرصدة البنكية والصكوك الادخارية إذا بلغ النصاب واستقر عليه الحول.",
  },
  {
    key: "metals",
    title: "زكاة الذهب والفضة والحلي",
    icon: "🪙",
    fields: ["gold", "goldGrams", "silverGrams", "jewelryPersonal"],
    topics: [
      "نصاب الذهب",
      "نصاب الفضة",
      "زكاة حلي الزينة المباح",
      "استبعاد المصنعية والأحجار الكريمة",
    ],
    intro:
      "تُقوَّم قيمة الذهب الخالص وفق سعر الجرام يوم الوجوب، وتُستبعد المصنعية والأحجار الكريمة.",
  },
  {
    key: "trade",
    title: "زكاة عروض التجارة والمخزون",
    icon: "📦",
    fields: ["inventory", "realEstateTrading"],
    topics: ["زكاة عروض التجارة", "خصم الديون الحالَّة", "خصم الديون المؤجلة"],
    intro:
      "تُقوَّم البضائع والعقارات المُعدَّة للبيع بسعر الجملة يوم الوجوب، بعد خصم الديون المستحقة.",
  },
  {
    key: "securities",
    title: "زكاة الأسهم والصناديق والصكوك",
    icon: "📈",
    fields: ["stocksTrading", "stocksLongTerm", "mutualFunds", "sukuk", "investments"],
    topics: ["زكاة الأسهم (محفظة استثمارية)"],
    intro:
      "أسهم المتاجرة: كامل القيمة السوقية. أسهم طويلة الأجل: 25.7% من القيمة السوقية إن تعذّر معرفة الوعاء الفعلي.",
  },
  {
    key: "crypto",
    title: "زكاة العملات الرقمية",
    icon: "₿",
    fields: ["cryptoValue"],
    topics: [
      "زكاة العملات الرقمية (Bitcoin, Ethereum...)",
      "تقييم العملات الرقمية",
      "اشتراط الحَوْل",
    ],
    intro: "تجري فيها أحكام النقود إذا اتُّخذت للادخار أو الاستثمار بعد بلوغ النصاب وتمام الحول.",
  },
  {
    key: "rental",
    title: "زكاة العقار المؤجَّر والدخل الإيجاري",
    icon: "🏠",
    fields: ["realEstateRental", "rentalIncomeAnnual"],
    topics: ["اشتراط الحَوْل", "خصم الديون الحالَّة"],
    intro:
      "العقار المؤجَّر لا زكاة في ذاته، وإنما تُزكَّى غلّته النقدية إن بلغت النصاب مع سائر المال وحال عليها الحول.",
  },
  {
    key: "agriculture",
    title: "زكاة الزروع والثمار",
    icon: "🌾",
    fields: ["agricultureValue", "agricultureType"],
    topics: ["نصاب الزروع والثمار", "مقدار زكاة الزروع"],
    intro: "تجب عند الحصاد بلا اشتراط حول، ومقدارها 5% أو 7.5% أو 10% حسب نوع الري.",
  },
  {
    key: "livestock",
    title: "زكاة الأنعام (إبل/بقر/غنم)",
    icon: "🐫",
    fields: ["livestockCamels", "livestockCattle", "livestockSheep"],
    topics: ["اشتراط الحَوْل"],
    intro:
      "لها أنصبة عددية سائمة راعية أكثر الحول (5 من الإبل، 30 من البقر، 40 من الغنم) وفق جداول السنة النبوية.",
  },
  {
    key: "salary",
    title: "زكاة الرواتب والدخل المهني",
    icon: "💼",
    fields: ["salaryMonthly", "endOfServiceBenefits"],
    topics: ["زكاة الراتب والدخل المهني", "اشتراط الحَوْل"],
    intro:
      "لا زكاة على الراتب عند القبض ابتداءً، بل يُضم إلى المال الموجود ويُزكَّى المجموع عند تمام الحول.",
  },
  {
    key: "business",
    title: "زكاة المنشآت والشركات",
    icon: "🏢",
    fields: ["businessAssets", "businessLiabilities"],
    topics: [
      "زكاة عروض التجارة",
      "خصم الديون الحالَّة",
      "خصم الديون المؤجلة",
      "تطبيق هيئة الزكاة والضريبة السعودية (ZATCA)",
    ],
    intro:
      "تُقاس على قاعدة صافي رأس المال العامل: (الأصول المتداولة الزكوية − الالتزامات قصيرة الأجل) × 2.5%.",
  },
  {
    key: "debts",
    title: "معالجة الديون المدينة والدائنة",
    icon: "⚖️",
    fields: ["receivables", "debts"],
    topics: ["خصم الديون الحالَّة", "خصم الديون المؤجلة", "الديون المتعذرة (على معسر/جاحد)"],
    intro:
      "الديون المستحقة لك على مليء تُزكَّى، وعلى معسر تُؤجَّل. الديون التي عليك تُخصم من الوعاء بضوابطها.",
  },
];

const LEVEL_STYLE: Record<ShariaReference["level"], string> = {
  ijma: "bg-success text-success border-success",
  majority: "bg-blue-100 text-blue-800 border-blue-300",
  majma: "bg-warning text-warning border-warning",
  ijtihad: "bg-purple-100 text-purple-800 border-purple-300",
};

// ============ الصفحة ============

function ComplianceReportPage() {
  const { recordId } = Route.useParams();
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: e1 } = await supabase
        .from("zakat_records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();
      if (e1) setError(e1.message);
      else setRecord(data as any);
      const { data: audit } = await supabase
        .from("sharia_audit_log")
        .select("fingerprint")
        .eq("zakat_record_id", recordId)
        .maybeSingle();
      if (audit) setFingerprint(audit.fingerprint);
      setLoading(false);
    })();
  }, [recordId]);

  const snapshotMap = useMemo(() => flattenSnapshotMap(record?.snapshot), [record]);
  const activeCategories = useMemo(
    () => CATEGORIES.filter((c) => c.fields.some((f) => hasValue(snapshotMap[f]))),
    [snapshotMap],
  );

  if (loading)
    return (
      <main className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  if (error || !record)
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
        <Alert variant="destructive">
          <AlertDescription>{error || "التقرير غير موجود"}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/history">العودة للسجل</Link>
        </Button>
      </main>
    );

  const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-4" dir="rtl">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/certified-report/$recordId" params={{ recordId }}>
            <ArrowRight className="h-4 w-4" /> التقرير المعتمد
          </Link>
        </Button>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" /> طباعة / PDF
        </Button>
      </div>

      {/* رأس التقرير */}
      <Card className="border-2 border-primary/30 shadow-lg print:shadow-none print:border-primary">
        <CardHeader className="border-b bg-gradient-to-l from-primary/10 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpenCheck className="h-6 w-6 text-primary" />
                تقرير الامتثال والحوكمة الشرعية
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                رقم التقرير:{" "}
                <span dir="ltr" className="font-mono">
                  {record.id.slice(0, 8).toUpperCase()}
                </span>{" "}
                — يجمع المدخلات والنتائج والأسس الشرعية لكل نوع زكاة داخل هذا الاحتساب.
              </p>
            </div>
            <Badge className="bg-gold text-gold-foreground gap-1 shrink-0">
              <ShieldCheck className="h-3 w-3" /> AAOIFI 35 · مجمع الفقه ٣/١
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetaBox
              label="نوع المكلَّف"
              value={record.record_type === "individual" ? "فرد" : "شركة/مؤسسة"}
            />
            <MetaBox label="السنة الهجرية" value={record.hijri_year || "—"} />
            <MetaBox
              label="تاريخ الاحتساب"
              value={new Date(record.gregorian_date).toLocaleDateString("ar-EG")}
            />
            <MetaBox label="العملة" value={record.currency} />
          </section>

          <section className="rounded-lg border overflow-hidden">
            <SumRow label="إجمالي الأصول" value={fmt(record.total_assets)} />
            <SumRow label="الخصوم / المطلوبات" value={fmt(record.total_liabilities)} muted />
            <SumRow label="الوعاء الزكوي الصافي" value={fmt(record.zakat_base)} bold />
            <SumRow label="الزكاة المستحقة" value={fmt(record.zakat_due)} highlight bold />
            {record.prepaid_zakat > 0 && (
              <>
                <SumRow label="المُعجَّل مسبقاً" value={fmt(record.prepaid_zakat)} muted />
                <SumRow label="الصافي المطلوب" value={fmt(record.net_due)} highlight bold />
              </>
            )}
          </section>
        </CardContent>
      </Card>

      {/* أقسام كل نوع زكاة */}
      {activeCategories.length === 0 ? (
        <Alert>
          <AlertDescription>
            لا توجد بنود مفصّلة في هذا الاحتساب — الرجاء مراجعة التقرير المعتمد للتفاصيل العامة.
          </AlertDescription>
        </Alert>
      ) : (
        activeCategories.map((cat) => (
          <CategorySection
            key={cat.key}
            category={cat}
            snapshotMap={snapshotMap}
            currency={record.currency}
            fmt={fmt}
          />
        ))
      )}

      {/* البصمة الشرعية */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-success" />
            بصمة الحوكمة والتدقيق
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">بصمة التدقيق (Fingerprint)</div>
            <div dir="ltr" className="font-mono bg-muted/40 p-2 rounded mt-1 break-all">
              {fingerprint || "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">المصادر الحاكمة للاحتساب</div>
            <ul className="list-disc pe-5 mt-1 space-y-0.5">
              <li>AAOIFI Standard 35 — الزكاة</li>
              <li>قرارات مجمع الفقه الإسلامي الدولي (جدة)</li>
              <li>ندوات قضايا الزكاة المعاصرة (بيت الزكاة الكويتي)</li>
              <li>سورة التوبة — الآية 60 (مصارف الزكاة)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <footer className="border-t pt-3 text-center text-xs text-muted-foreground print:mt-6">
        صادر عن منصة نِصاب · {new Date(record.created_at).toLocaleString("ar-EG")} · تقرير امتثال
        وحوكمة شرعية قابل للتحقق عبر بصمة التدقيق.
      </footer>
    </main>
  );
}

// ============ مكوّنات مساعدة ============

function CategorySection({
  category,
  snapshotMap,
  currency,
  fmt,
}: {
  category: Category;
  snapshotMap: Record<string, unknown>;
  currency: string;
  fmt: (n: number) => string;
}) {
  const inputs = category.fields
    .filter((f) => hasValue(snapshotMap[f]))
    .map((f) => ({ key: f, label: FIELD_LABELS[f] || f, value: snapshotMap[f] }));

  const refs = SHARIA_REFERENCES.filter((r) => category.topics.includes(r.topic));

  const numericSum = inputs.reduce(
    (s, it) => (typeof it.value === "number" ? s + (it.value as number) : s),
    0,
  );

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-lg">{category.icon}</span>
            {category.title}
          </CardTitle>
          {numericSum > 0 && (
            <Badge variant="outline" className="text-xs shrink-0">
              مجموع المدخلات: {fmt(numericSum)} {currency}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{category.intro}</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* المدخلات */}
        <div>
          <h4 className="text-xs font-bold mb-1.5 flex items-center gap-1 text-primary">
            <Landmark className="h-3.5 w-3.5" /> المدخلات المُعتمدة
          </h4>
          <div className="rounded-md border divide-y">
            {inputs.map((it) => {
              const isNum = typeof it.value === "number";
              return (
                <div key={it.key} className="flex justify-between px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{it.label}</span>
                  <span className="font-medium" dir={isNum ? "ltr" : "rtl"}>
                    {isNum ? `${fmt(it.value as number)} ${currency}` : String(it.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* الأسس الشرعية */}
        <div>
          <h4 className="text-xs font-bold mb-1.5 flex items-center gap-1 text-success">
            <BookOpenCheck className="h-3.5 w-3.5" /> الأسس الشرعية المعتمدة
          </h4>
          {refs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              لا توجد مرجعية مخصّصة لهذا القسم — تُطبَّق القواعد العامة للزكاة.
            </p>
          ) : (
            <div className="space-y-2">
              {refs.map((r, i) => (
                <div key={i} className="rounded-md border p-2.5 bg-muted/10">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="font-semibold text-sm">{r.topic}</div>
                    <Badge variant="outline" className={`text-[10px] ${LEVEL_STYLE[r.level]}`}>
                      {RULING_LEVEL_LABELS[r.level]}
                    </Badge>
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-muted-foreground">الحكم:</span>{" "}
                    <span className="font-medium">{r.ruling}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    <b>المرجع:</b> {r.source}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <b>النص/الإحالة:</b> {r.citation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}

function SumRow({
  label,
  value,
  bold,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between px-3 py-2 border-b last:border-b-0 ${highlight ? "bg-primary/5" : muted ? "bg-muted/20" : ""}`}
    >
      <span className={`text-sm ${bold ? "font-bold" : ""}`}>{label}</span>
      <span
        className={`text-sm ${bold ? "font-bold" : ""} ${highlight ? "text-primary" : ""}`}
        dir="ltr"
      >
        {value}
      </span>
    </div>
  );
}

function hasValue(v: unknown) {
  if (v == null || v === "" || v === false) return false;
  if (typeof v === "number" && v === 0) return false;
  return true;
}

function flattenSnapshotMap(obj: any, prefix = "", out: Record<string, unknown> = {}) {
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      flattenSnapshotMap(v, prefix ? `${prefix}.${k}` : k, out);
    } else {
      // نُخزّن بالاسم القصير أيضاً ليسهل الوصول من CATEGORIES.fields
      out[k] = v;
      if (prefix) out[`${prefix}.${k}`] = v;
    }
  }
  return out;
}
