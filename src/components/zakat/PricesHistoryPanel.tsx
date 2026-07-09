import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, HelpCircle } from "lucide-react";

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
  },
  derived: {
    label: "مشتق",
    icon: Sparkles,
    cls: "bg-amber-500/15 text-amber-700 border-amber-500/40",
    dot: "bg-amber-500",
  },
  estimated: {
    label: "تقديري",
    icon: HelpCircle,
    cls: "bg-rose-500/15 text-rose-700 border-rose-500/40",
    dot: "bg-rose-500",
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

export function PricesHistoryPanel({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pickedDate, setPickedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [relFilter, setRelFilter] = useState<
    "all" | "direct" | "secondary" | "derived" | "estimated"
  >("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("metal_prices_daily")
        .select("price_date, metal, price_usd_per_gram, source, reliability")
        .order("price_date", { ascending: false })
        .limit(5000);
      if (error) {
        setErr(error.message);
        return;
      }
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
    let dates = Array.from(byDate.keys()).sort().reverse();
    if (query) dates = dates.filter((d) => d.includes(query));
    if (relFilter !== "all") {
      dates = dates.filter((d) => {
        const e = byDate.get(d)!;
        const r = e.gold?.reliability ?? e.silver?.reliability;
        if (!r) return false;
        if (relFilter === "secondary") return r === "derived" || r === "estimated";
        return r === relFilter;
      });
    }
    return dates;
  }, [byDate, query, relFilter]);

  const pickedNearest = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const dates = Array.from(byDate.keys()).sort();
    let best = dates[0];
    for (const d of dates)
      if (d <= pickedDate) best = d;
      else break;
    const e = byDate.get(best);
    return { date: best, gold: e?.gold, silver: e?.silver };
  }, [byDate, pickedDate, rows]);

  if (err) return <div className="p-4 text-destructive text-sm">خطأ: {err}</div>;
  if (!rows)
    return <div className="p-4 text-sm text-muted-foreground">جارٍ تحميل السجل التاريخي…</div>;

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">احسب النصاب لأي تاريخ سابق</CardTitle>
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
                <div className="text-xs text-muted-foreground">
                  أقرب تاريخ متاح: {pickedNearest.date}
                </div>
                <div className="mt-1 font-semibold">
                  ذهب: {fmt(pickedNearest.gold?.price_usd_per_gram ?? 0, 4)} USD/جم
                </div>
                <div className="text-sm">
                  نصاب الذهب: {fmt((pickedNearest.gold?.price_usd_per_gram ?? 0) * GOLD_NISAB)} USD
                </div>
                {pickedNearest.gold && <RelBadge r={pickedNearest.gold.reliability} />}
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">المعدن الفضي</div>
                <div className="mt-1 font-semibold">
                  فضة: {fmt(pickedNearest.silver?.price_usd_per_gram ?? 0, 4)} USD/جم
                </div>
                <div className="text-sm">
                  نصاب الفضة: {fmt((pickedNearest.silver?.price_usd_per_gram ?? 0) * SILVER_NISAB)}{" "}
                  USD
                </div>
                {pickedNearest.silver && <RelBadge r={pickedNearest.silver.reliability} />}
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
              <CardTitle className="text-base">
                كل التواريخ ({fmt(filteredDates.length, 0)})
              </CardTitle>
              <div className="flex flex-wrap items-end gap-3 pt-2">
                <Input
                  placeholder="بحث بسنة/تاريخ"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="max-w-xs"
                />
                <Select
                  value={relFilter}
                  onValueChange={(v) => setRelFilter(v as typeof relFilter)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المستويات</SelectItem>
                    <SelectItem value="direct">مباشر فقط</SelectItem>
                    <SelectItem value="secondary">مصادر ثانوية</SelectItem>
                    <SelectItem value="derived">مشتق</SelectItem>
                    <SelectItem value="estimated">تقديري</SelectItem>
                  </SelectContent>
                </Select>
                {(query || relFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setRelFilter("all");
                    }}
                  >
                    مسح
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent
              className={compact ? "max-h-[400px] overflow-auto" : "max-h-[600px] overflow-auto"}
            >
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>ذهب USD/جم</TableHead>
                    <TableHead>نصاب ذهب</TableHead>
                    <TableHead>فضة USD/جم</TableHead>
                    <TableHead>نصاب فضة</TableHead>
                    <TableHead>الجودة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDates.slice(0, compact ? 200 : 600).map((d) => {
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
                        <TableCell>
                          <RelBadge r={rel} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="about">
          <Card>
            <CardContent className="prose dark:prose-invert max-w-none pt-6 text-sm">
              <p>
                <strong>مباشر:</strong> من gold-api / metalpriceapi يومياً. <strong>مشتق:</strong>{" "}
                محسوب من متوسط قريب. <strong>تقديري:</strong> متوسط سنوي تاريخي.
              </p>
              <p>1975→2025: متوسطات شهرية. 2026→اليوم: سجل يومي محدَّث.</p>
              <p>
                نصاب الذهب 85 جم — نصاب الفضة 595 جم — نسبة الزكاة 2.5%. تُستخدم لاحتساب النصاب لأي
                تاريخ حول.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
