import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Wheat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listArchive, type ArchiveRow } from "@/lib/archive/cloud";
import { fmt } from "@/lib/zakat";

// Zakat item labels (must stay in sync with history.tsx POT_LABELS)
const ITEM_LABELS: Record<string, string> = {
  cash: "النقد والحسابات",
  gold: "الذهب",
  silver: "الفضة",
  securities: "الأوراق المالية",
  trade: "عروض التجارة",
  income: "الدخل والمستغلات",
  digital: "الأصول الرقمية",
  livestock: "الأنعام",
  rikaz: "الركاز والمعادن",
  realestate: "العقار",
  commercial: "الأوراق التجارية",
  takaful: "وثائق التأمين",
  fitr: "زكاة الفطر",
};

const ITEM_COLORS: Record<string, string> = {
  cash: "hsl(var(--primary))",
  gold: "hsl(45 95% 55%)",
  silver: "hsl(210 15% 65%)",
  securities: "hsl(200 80% 55%)",
  trade: "hsl(160 70% 45%)",
  income: "hsl(280 60% 60%)",
  digital: "hsl(190 80% 50%)",
  livestock: "hsl(30 70% 50%)",
  rikaz: "hsl(15 85% 60%)",
  realestate: "hsl(100 60% 50%)",
  commercial: "hsl(330 70% 60%)",
  takaful: "hsl(250 60% 60%)",
  fitr: "hsl(140 60% 45%)",
};

type ZakatRow = {
  id: string;
  gregorian_date: string;
  hijri_year: string | null;
  currency: string;
  zakat_due: number;
  snapshot: Record<string, unknown> | null;
};

type FitrPayload = { totalCash: number; peopleCount: number };

type YearBucket = {
  year: string;
  currency: string;
  items: Record<string, number>;
  total: number;
};

export function YearlyComparison() {
  const [records, setRecords] = useState<ZakatRow[]>([]);
  const [fitr, setFitr] = useState<ArchiveRow<FitrPayload>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data }, fitrList] = await Promise.all([
        supabase
          .from("zakat_records")
          .select("id, gregorian_date, hijri_year, currency, zakat_due, snapshot")
          .order("gregorian_date", { ascending: true }),
        listArchive<FitrPayload>("fitr"),
      ]);
      setRecords((data as ZakatRow[]) ?? []);
      setFitr(fitrList);
      setLoading(false);
    })();
  }, []);

  const { yearly, currency, itemKeys } = useMemo(() => {
    const map = new Map<string, YearBucket>();
    const lastCur = records[records.length - 1]?.currency || fitr[0]?.currency || "SAR";

    for (const r of records) {
      const y = r.hijri_year || new Date(r.gregorian_date).getFullYear().toString();
      const snap = (r.snapshot ?? {}) as Record<string, unknown>;
      const pots = ((snap.pots as Record<string, number>) ??
        (snap.buckets as Record<string, number>) ??
        {}) as Record<string, number>;
      const bucket =
        map.get(y) ??
        ({ year: y, currency: r.currency || lastCur, items: {}, total: 0 } as YearBucket);
      for (const [k, v] of Object.entries(pots)) {
        const n = Number(v) || 0;
        if (n <= 0) continue;
        // pot value * 2.5% approximates the item's zakat contribution
        const contrib = n * 0.025;
        bucket.items[k] = (bucket.items[k] || 0) + contrib;
      }
      // if snapshot missing, fall back to total zakat_due as generic "cash"
      if (!Object.keys(pots).length) {
        bucket.items.cash = (bucket.items.cash || 0) + Number(r.zakat_due || 0);
      }
      map.set(y, bucket);
    }

    for (const f of fitr) {
      const y = String(f.year ?? new Date(f.updated_at).getFullYear());
      const cash = Number(f.payload?.totalCash ?? 0);
      if (cash <= 0) continue;
      const bucket =
        map.get(y) ??
        ({ year: y, currency: f.currency || lastCur, items: {}, total: 0 } as YearBucket);
      bucket.items.fitr = (bucket.items.fitr || 0) + cash;
      map.set(y, bucket);
    }

    const yearly = Array.from(map.values())
      .map((b) => ({ ...b, total: Object.values(b.items).reduce((s, v) => s + v, 0) }))
      .sort((a, b) => Number(a.year) - Number(b.year));

    const keys = new Set<string>();
    for (const y of yearly) Object.keys(y.items).forEach((k) => keys.add(k));

    return { yearly, currency: lastCur, itemKeys: Array.from(keys) };
  }, [records, fitr]);

  const chartData = yearly.map((y) => ({
    year: y.year,
    total: Math.round(y.total),
    ...Object.fromEntries(itemKeys.map((k) => [k, Math.round(y.items[k] || 0)])),
  }));

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-12">جاري تحميل بيانات المقارنة...</div>
    );
  }

  if (!yearly.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          لا توجد بيانات كافية للمقارنة. احسب زكاتك أو زكاة الفطر وستظهر هنا مقارنة السنوات.
        </CardContent>
      </Card>
    );
  }

  const first = yearly[0];
  const last = yearly[yearly.length - 1];
  const totalDiff = last.total - first.total;
  const totalPct = first.total > 0 ? (totalDiff / first.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            مقارنة الزكاة السنوية — كل البنود + زكاة الفطر
          </CardTitle>
          {yearly.length > 1 && (
            <Badge variant={totalDiff >= 0 ? "default" : "secondary"} className="text-xs">
              {totalDiff >= 0 ? "▲" : "▼"} {Math.abs(totalPct).toFixed(1)}% من {first.year} إلى{" "}
              {last.year}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${fmt(Number(v))} ${currency}`,
                    ITEM_LABELS[name] ?? name,
                  ]}
                />
                <Legend formatter={(v: string) => ITEM_LABELS[v] ?? v} />
                {itemKeys.map((k) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="zakat"
                    fill={ITEM_COLORS[k] ?? "hsl(var(--primary))"}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            مخطط تغيّر الإجمالي عبر السنوات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 w-full" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${fmt(Number(v))} ${currency}`} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="إجمالي الزكاة"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wheat className="h-4 w-4 text-primary" />
            جدول التغيّر لكل بند (YoY)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 text-xs">
                  <th className="border p-2 text-start sticky start-0 bg-muted/50">البند</th>
                  {yearly.map((y) => (
                    <th key={y.year} className="border p-2 text-start whitespace-nowrap">
                      {y.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemKeys.map((k) => (
                  <tr key={k} className="hover:bg-muted/30">
                    <td className="border p-2 font-semibold sticky start-0 bg-card">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm me-1.5 align-middle"
                        style={{ background: ITEM_COLORS[k] ?? "hsl(var(--primary))" }}
                      />
                      {ITEM_LABELS[k] ?? k}
                    </td>
                    {yearly.map((y, i) => {
                      const cur = y.items[k] || 0;
                      const prev = i > 0 ? yearly[i - 1].items[k] || 0 : 0;
                      const d = cur - prev;
                      const p = prev > 0 ? (d / prev) * 100 : 0;
                      return (
                        <td key={y.year} className="border p-2 whitespace-nowrap">
                          <div className="font-medium">{cur ? fmt(Math.round(cur)) : "—"}</div>
                          {i > 0 && cur > 0 && prev > 0 && (
                            <div
                              className={`text-[11px] ${
                                d > 0
                                  ? "text-emerald-600"
                                  : d < 0
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {d >= 0 ? "+" : ""}
                              {p.toFixed(1)}%
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-primary/5 font-bold">
                  <td className="border p-2 sticky start-0 bg-primary/5">الإجمالي</td>
                  {yearly.map((y, i) => {
                    const prev = i > 0 ? yearly[i - 1].total : 0;
                    const d = y.total - prev;
                    const p = prev > 0 ? (d / prev) * 100 : 0;
                    return (
                      <td key={y.year} className="border p-2 whitespace-nowrap">
                        <div>{fmt(Math.round(y.total))}</div>
                        {i > 0 && prev > 0 && (
                          <div
                            className={`text-[11px] ${
                              d > 0
                                ? "text-emerald-600"
                                : d < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {d >= 0 ? "+" : ""}
                            {p.toFixed(1)}%
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            القيم بعملة {currency}. تُحتسب مساهمة كل بند بضرب رصيده في 2.5% (نسبة الزكاة)، وتُضاف
            زكاة الفطر كما هي.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
