import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/prices-history")({
  head: () => ({
    meta: [
      { title: "السجل التاريخي لأسعار الذهب والفضة — للزكاة" },
      {
        name: "description",
        content:
          "قاعدة بيانات تاريخية لأسعار الذهب والفضة بالدولار للجرام من 1975 حتى اليوم مع تحديث يومي، لاحتساب نصاب الزكاة بدقة لأي تاريخ سابق.",
      },
    ],
  }),
  component: PricesHistoryPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">خطأ: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

type Row = {
  price_date: string;
  metal: "gold" | "silver";
  price_usd_per_gram: number;
  source: string | null;
  reliability: "direct" | "derived" | "estimated";
};

const GOLD_NISAB = 85;
const SILVER_NISAB = 595;
const ZAKAT = 0.025;

function fmt(n: number, d = 2) {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: d }).format(n);
}

const REL_META = {
  direct: {
    label: "مباشر",
    icon: ShieldCheck,
    cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
    dot: "bg-emerald-500",
    desc: "مسحوب مباشرةً من مزوّد أسعار (gold-api / metalpriceapi)",
  },
  derived: {
    label: "مشتق",
    icon: Sparkles,
    cls: "bg-amber-500/15 text-amber-700 border-amber-500/40",
    dot: "bg-amber-500",
    desc: "مُحتسب من مرجع آخر (متوسط سنة قريبة)",
  },
  estimated: {
    label: "تقديري",
    icon: HelpCircle,
    cls: "bg-rose-500/15 text-rose-700 border-rose-500/40",
    dot: "bg-rose-500",
    desc: "متوسط سنوي تاريخي من مصادر علنية",
  },
} as const;

function RelBadge({ r }: { r: Row["reliability"] }) {
  const m = REL_META[r];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}

function RelDot({ r }: { r: Row["reliability"] }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${REL_META[r].dot}`} title={REL_META[r].label} />;
}

function PricesHistoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pickedDate, setPickedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [relFilter, setRelFilter] = useState<"all" | "direct" | "secondary" | "derived" | "estimated">("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("metal_prices_daily")
        .select("price_date, metal, price_usd_per_gram, source, reliability")
        .order("price_date", { ascending: false })
        .limit(5000);
      if (error) { setErr(error.message); return; }
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, { gold?: Row; silver?: Row }>();
    for (const r of rows ?? []) {
      const e = m.get(r.price_date) ?? {};
      e[r.metal] = r;
      m.set(r.price_date, e);
    }
    return m;
  }, [rows]);

  const filteredDates = useMemo(() => {
    const dates = Array.from(byDate.keys()).sort().reverse();
    if (!query) return dates;
    return dates.filter((d) => d.includes(query));
  }, [byDate, query]);

  const pickedNearest = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const target = pickedDate;
    const dates = Array.from(byDate.keys()).sort();
    let best = dates[0];
    for (const d of dates) if (d <= target) best = d; else break;
    const e = byDate.get(best);
    return { date: best, gold: e?.gold, silver: e?.silver };
  }, [byDate, pickedDate, rows]);

  if (err) return <div className="p-6 text-destructive">خطأ: {err}</div>;
  if (!rows) return <div className="p-6">جارٍ تحميل السجل التاريخي…</div>;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">السجل التاريخي لأسعار الذهب والفضة</h1>
        <p className="text-muted-foreground">
          قاعدة بيانات يومية وشهرية بالدولار/جرام من 1975 حتى اليوم. تُستخدم لاحتساب نصاب
          الزكاة بدقة عند أي تاريخ سابق، وتُحدَّث يومياً تلقائياً.
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">إجمالي السجلات: {fmt(rows.length, 0)}</Badge>
          <Badge variant="outline">نصاب الذهب: 85 جم</Badge>
          <Badge variant="outline">نصاب الفضة: 595 جم</Badge>
          <Badge variant="outline">نسبة الزكاة: 2.5%</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>احسب النصاب لأي تاريخ سابق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="date"
            value={pickedDate}
            min="1975-01-01"
            onChange={(e) => setPickedDate(e.target.value)}
            className="max-w-xs"
          />
          {pickedNearest && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">أقرب تاريخ متاح: {pickedNearest.date}</div>
                <div className="mt-2 text-lg font-semibold">
                  ذهب: {fmt(pickedNearest.gold?.price_usd_per_gram ?? 0, 4)} USD/جم
                </div>
                <div className="text-sm">نصاب الذهب: {fmt((pickedNearest.gold?.price_usd_per_gram ?? 0) * GOLD_NISAB)} USD</div>
                <div className="text-sm text-primary">
                  زكاة نصاب الذهب: {fmt((pickedNearest.gold?.price_usd_per_gram ?? 0) * GOLD_NISAB * ZAKAT)} USD
                </div>
                {pickedNearest.gold && relBadge(pickedNearest.gold.reliability)}
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">المعدن الفضي</div>
                <div className="mt-2 text-lg font-semibold">
                  فضة: {fmt(pickedNearest.silver?.price_usd_per_gram ?? 0, 4)} USD/جم
                </div>
                <div className="text-sm">نصاب الفضة: {fmt((pickedNearest.silver?.price_usd_per_gram ?? 0) * SILVER_NISAB)} USD</div>
                <div className="text-sm text-primary">
                  زكاة نصاب الفضة: {fmt((pickedNearest.silver?.price_usd_per_gram ?? 0) * SILVER_NISAB * ZAKAT)} USD
                </div>
                {pickedNearest.silver && relBadge(pickedNearest.silver.reliability)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">جدول كامل</TabsTrigger>
          <TabsTrigger value="about">عن البيانات</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>كل التواريخ ({fmt(filteredDates.length, 0)})</CardTitle>
              <Input
                placeholder="ابحث عن سنة أو تاريخ (مثل 2020 أو 2020-03)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="max-w-sm mt-2"
              />
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>سعر الذهب USD/جم</TableHead>
                    <TableHead>نصاب الذهب USD</TableHead>
                    <TableHead>سعر الفضة USD/جم</TableHead>
                    <TableHead>نصاب الفضة USD</TableHead>
                    <TableHead>الجودة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDates.slice(0, 600).map((d) => {
                    const e = byDate.get(d)!;
                    const g = Number(e.gold?.price_usd_per_gram ?? 0);
                    const s = Number(e.silver?.price_usd_per_gram ?? 0);
                    const rel = e.gold?.reliability ?? e.silver?.reliability ?? "estimated";
                    return (
                      <TableRow key={d}>
                        <TableCell className="font-mono">{d}</TableCell>
                        <TableCell>{fmt(g, 4)}</TableCell>
                        <TableCell>{fmt(g * GOLD_NISAB)}</TableCell>
                        <TableCell>{fmt(s, 4)}</TableCell>
                        <TableCell>{fmt(s * SILVER_NISAB)}</TableCell>
                        <TableCell>{relBadge(rel)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredDates.length > 600 && (
                <p className="text-sm text-muted-foreground mt-2">يُعرض أول 600 سجل — استخدم البحث للتصفية.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="about">
          <Card>
            <CardContent className="prose dark:prose-invert max-w-none pt-6">
              <h3>المصادر ودرجات الثقة</h3>
              <ul>
                <li><strong>مباشر:</strong> سعر مسحوب يومياً من واجهات gold-api / metalpriceapi.</li>
                <li><strong>مشتق:</strong> سعر مُحتسب من مرجع آخر (مثل متوسط السنة).</li>
                <li><strong>تقديري:</strong> سعر تاريخي بمتوسط سنوي من مصادر علنية (London PM Fix).</li>
              </ul>
              <h3>التغطية</h3>
              <p>1975→2025: متوسطات شهرية تقديرية. 2026→الآن: سجل يومي يُحدَّث تلقائياً.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
