import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Printer, ShieldCheck, ArrowRight, FileText, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/certified-report/$recordId")({
  head: () => ({
    meta: [
      { title: "تقرير زكاة معتمد — نِصاب" },
      { name: "description", content: "تقرير زكاة معتمد شامل مع بصمة تدقيق شرعي" },
    ],
  }),
  component: CertifiedReportPage,
  errorComponent: CertifiedReportError,

  notFoundComponent: () => (
    <main className="container mx-auto max-w-2xl px-4 py-12" dir="rtl">
      <Alert>
        <AlertDescription>لم يتم العثور على التقرير.</AlertDescription>
      </Alert>
    </main>
  ),
});

type Record = {
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

function CertifiedReportPage() {
  const { recordId } = Route.useParams();
  const [record, setRecord] = useState<Record | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("zakat_records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();
      if (error) setError(error.message);
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
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-4" dir="rtl">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/history">
            <ArrowRight className="h-4 w-4" /> السجل
          </Link>
        </Button>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" /> طباعة / PDF
        </Button>
      </div>

      <Card className="border-2 border-primary/30 shadow-lg print:shadow-none print:border-primary">
        <CardHeader className="border-b bg-gradient-to-l from-primary/10 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-6 w-6 text-primary" />
                تقرير زكاة معتمد
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                رقم التقرير:{" "}
                <span dir="ltr" className="font-mono">
                  {record.id.slice(0, 8).toUpperCase()}
                </span>
              </p>
            </div>
            <Badge className="bg-gold text-gold-foreground gap-1">
              <BadgeCheck className="h-3 w-3" /> AAOIFI 35 · مجمع الفقه ٣/١
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Info
              label="نوع المكلَّف"
              value={record.record_type === "individual" ? "فرد" : "شركة/مؤسسة"}
            />
            <Info label="السنة الهجرية" value={record.hijri_year || "—"} />
            <Info
              label="تاريخ الاحتساب"
              value={new Date(record.gregorian_date).toLocaleDateString("ar-EG")}
            />
            <Info label="العملة" value={record.currency} />
          </section>

          <section>
            <h3 className="font-bold mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" /> ملخّص الوعاء الزكوي
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <Row label="إجمالي الأصول" value={fmt(record.total_assets)} />
              <Row label="الخصوم / المطلوبات" value={fmt(record.total_liabilities)} muted />
              <Row label="الوعاء الزكوي الصافي" value={fmt(record.zakat_base)} bold />
              <Row label="الزكاة المستحقة" value={fmt(record.zakat_due)} highlight />
              {record.prepaid_zakat > 0 && (
                <>
                  <Row label="المُعجَّل مسبقاً" value={fmt(record.prepaid_zakat)} muted />
                  <Row label="الصافي المطلوب للسداد" value={fmt(record.net_due)} highlight bold />
                </>
              )}
            </div>
          </section>

          {record.notes && (
            <section>
              <h3 className="font-bold mb-2">ملاحظات</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded">
                {record.notes}
              </p>
            </section>
          )}

          {record.snapshot && (
            <SnapshotBreakdown snapshot={record.snapshot} fmt={fmt} currency={record.currency} />
          )}

          <section className="border-t pt-4">
            <h3 className="font-bold mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> البصمة الشرعية
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">بصمة التدقيق (Fingerprint)</div>
                <div dir="ltr" className="font-mono bg-muted/40 p-2 rounded mt-1 break-all">
                  {fingerprint || "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">المرجعيات</div>
                <ul className="list-disc pr-5 mt-1 space-y-0.5">
                  <li>AAOIFI Standard 35 — الزكاة</li>
                  <li>قرار مجمع الفقه الإسلامي 3/1</li>
                  <li>سورة التوبة — الآية 60</li>
                </ul>
              </div>
            </div>
          </section>

          <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
            صادر عن منصة نِصاب · {new Date(record.created_at).toLocaleString("ar-EG")} · هذا التقرير
            قابل للتحقق عبر بصمة التدقيق.
          </footer>
        </CardContent>
      </Card>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}

function Row({
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

const SNAPSHOT_LABELS: { [key: string]: string } = {
  cash: "نقد باليد",
  bankAccounts: "أرصدة بنكية",
  savingsBonds: "صكوك ادخارية",
  cryptoValue: "عملات رقمية",
  gold: "ذهب/فضة (قيمة)",
  goldGrams: "ذهب (جرام)",
  silverGrams: "فضة (جرام)",
  jewelryPersonal: "حلي شخصي",
  investments: "استثمارات",
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
  madhab: "المذهب",
  hawlDate: "تاريخ الحول",
  nisab: "قيمة النصاب",
};

function flattenSnapshot(obj: any, prefix = ""): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = [];
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "" || v === 0 || v === false) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenSnapshot(v, prefix ? `${prefix}.${k}` : k));
    } else {
      out.push([prefix ? `${prefix}.${k}` : k, v]);
    }
  }
  return out;
}

function SnapshotBreakdown({
  snapshot,
  fmt,
  currency,
}: {
  snapshot: any;
  fmt: (n: number) => string;
  currency: string;
}) {
  const entries = flattenSnapshot(snapshot);
  if (entries.length === 0) return null;
  return (
    <section>
      <h3 className="font-bold mb-2">تفصيل بنود الاحتساب</h3>
      <div className="rounded-lg border overflow-hidden">
        {entries.map(([k, v], i) => {
          const shortKey = k.split(".").pop() || k;
          const label = SNAPSHOT_LABELS[shortKey] || shortKey;
          const isNum = typeof v === "number";
          const display = isNum ? `${fmt(v as number)} ${currency}` : String(v);
          return (
            <div
              key={k}
              className={`flex justify-between px-3 py-1.5 text-sm border-b last:border-b-0 ${i % 2 ? "bg-muted/20" : ""}`}
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium" dir={isNum ? "ltr" : "rtl"}>
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
