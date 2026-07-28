import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PieChart as PieIcon, BarChart3, Coins } from "lucide-react";

export interface CategoryValue {
  key: string;
  label: string;
  /** قيمة الوعاء بالعملة */
  base: number;
  /** الزكاة المستحقة على هذه الفئة */
  zakat: number;
  color: string;
}

interface Props {
  currencyName: string;
  categories: CategoryValue[];
  /** رأس الأنعام (عيني — لا يدخل الرسم البياني النقدي) */
  livestock?: { camels: number; cows: number; sheep: number };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(n);

export function ZakatBreakdownChart({ currencyName, categories, livestock }: Props) {
  const [view, setView] = useState<"pie" | "bar">("pie");

  const data = useMemo(
    () => categories.filter((c) => c.zakat > 0.001).sort((a, b) => b.zakat - a.zakat),
    [categories],
  );

  const totalZakat = useMemo(() => data.reduce((s, d) => s + d.zakat, 0), [data]);
  const totalBase = useMemo(() => data.reduce((s, d) => s + d.base, 0), [data]);

  const hasLivestock =
    livestock && (livestock.camels > 0 || livestock.cows > 0 || livestock.sheep > 0);

  if (data.length === 0 && !hasLivestock) {
    return (
      <Card className="shadow-soft print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" /> توزيع الزكاة حسب الفئات
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground py-6 text-center">
          أدخل بيانات الأصول أعلاه لعرض المخطط.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" /> توزيع الزكاة حسب الفئات
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={view === "pie" ? "default" : "outline"}
              className="h-7 px-2"
              onClick={() => setView("pie")}
              aria-label="عرض دائري"
            >
              <PieIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={view === "bar" ? "default" : "outline"}
              className="h-7 px-2"
              onClick={() => setView("bar")}
              aria-label="عرض أعمدة"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border p-2">
            <div className="text-muted-foreground">إجمالي الوعاء</div>
            <div className="font-bold">
              {fmt(totalBase)} <span className="opacity-70">{currencyName}</span>
            </div>
          </div>
          <div className="rounded-md border p-2 bg-primary/5 border-primary/20">
            <div className="text-muted-foreground">إجمالي الزكاة</div>
            <div className="font-bold text-primary">
              {fmt(totalZakat)} <span className="opacity-70">{currencyName}</span>
            </div>
          </div>
        </div>

        {data.length > 0 && (
          <div className="h-[260px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {view === "pie" ? (
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="zakat"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v)} ${currencyName}`, "الزكاة"]}
                    contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ direction: "rtl", fontSize: 11 }}
                  />
                </PieChart>
              ) : (
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => fmt(v)} fontSize={10} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    fontSize={11}
                    width={100}
                    tick={{ textAnchor: "end" }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v)} ${currencyName}`, "الزكاة"]}
                    contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="zakat" radius={[0, 4, 4, 0]}>
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* جدول مفصّل */}
        <div className="space-y-1 text-xs">
          {data.map((d) => {
            const pct = totalZakat > 0 ? (d.zakat / totalZakat) * 100 : 0;
            return (
              <div
                key={d.key}
                className="flex items-center justify-between gap-2 rounded-md border p-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                    aria-hidden
                  />
                  <span className="truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground tabular-nums">
                    وعاء: {fmt(d.base)}
                  </span>
                  <span className="font-bold tabular-nums">{fmt(d.zakat)}</span>
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {pct.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {hasLivestock && (
          <div className="rounded-md border border-dashed p-2 text-xs bg-muted/30">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Coins className="h-3.5 w-3.5 text-primary" />
              زكاة الأنعام (تُخرَج عيناً — لا تُدرَج بالمخطط النقدي)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {livestock!.camels > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  إبل: {livestock!.camels}
                </Badge>
              )}
              {livestock!.cows > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  بقر: {livestock!.cows}
                </Badge>
              )}
              {livestock!.sheep > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  غنم: {livestock!.sheep}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
