import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart as LineChartIcon, TrendingUp, Building2, User, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "لوحات المعلومات والتحليلات — حاسبة الزكاة" },
      {
        name: "description",
        content:
          "مؤشرات الأداء (KPIs) والتحليلات التنبؤية للأفراد والمؤسسات — رصيد زكوي متوقّع، حساسية النصاب، ونمو الوعاء.",
      },
      { property: "og:title", content: "لوحات المعلومات والتحليلات" },
      { property: "og:description", content: "KPIs + تحليلات تنبؤية للأفراد والمؤسسات" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

// بيانات تمثيلية (Demo). في الإنتاج تُغذّى من ‎/api/public/prices/history وسجلات المستخدم.
function generateIndividualSeries() {
  const now = new Date();
  const arr: { month: string; wealth: number; zakat: number; nisab: number }[] = [];
  let wealth = 45000;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    wealth = wealth * (1 + (Math.random() * 0.03 - 0.005));
    const nisab = 30000 + Math.sin(i) * 800;
    const zakat = Math.max(0, ((wealth - nisab) * 0.02577) / 12);
    arr.push({
      month: d.toLocaleDateString("ar", { month: "short" }),
      wealth: Math.round(wealth),
      zakat: Math.round(zakat),
      nisab: Math.round(nisab),
    });
  }
  return arr;
}

function generateInstitutionalSeries() {
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  return quarters.map((q, i) => ({
    quarter: q,
    base: 4_800_000 + i * 350_000 + Math.random() * 200_000,
    zakat: (4_800_000 + i * 350_000) * 0.025,
    tax_deduct: (4_800_000 + i * 350_000) * 0.025 * 0.4,
  }));
}

function forecastNextYear(current: number, growthRate = 0.045) {
  const points: { month: string; projected: number; low: number; high: number }[] = [];
  const now = new Date();
  let v = current;
  for (let i = 1; i <= 12; i++) {
    v *= 1 + growthRate / 12;
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    points.push({
      month: d.toLocaleDateString("ar", { month: "short" }),
      projected: Math.round(v * 0.02577),
      low: Math.round(v * 0.02577 * 0.88),
      high: Math.round(v * 0.02577 * 1.12),
    });
  }
  return points;
}

function AnalyticsPage() {
  const individual = useMemo(generateIndividualSeries, []);
  const institutional = useMemo(generateInstitutionalSeries, []);
  const [growth, setGrowth] = useState(0.045);
  const currentWealth = individual[individual.length - 1]?.wealth ?? 0;
  const forecast = useMemo(() => forecastNextYear(currentWealth, growth), [currentWealth, growth]);

  const totalZakat = individual.reduce((s, x) => s + x.zakat, 0);
  const avgWealth = Math.round(individual.reduce((s, x) => s + x.wealth, 0) / individual.length);
  const distribution = [
    { name: "الفقراء والمساكين", value: 40, color: "hsl(var(--primary))" },
    { name: "العاملون عليها", value: 10, color: "hsl(var(--muted-foreground))" },
    { name: "في سبيل الله", value: 20, color: "hsl(var(--accent))" },
    { name: "ابن السبيل والغارمون", value: 15, color: "hsl(var(--secondary))" },
    { name: "المؤلفة قلوبهم وفي الرقاب", value: 15, color: "hsl(var(--destructive))" },
  ];

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LineChartIcon className="h-7 w-7 text-primary" />
          لوحات المعلومات والتحليلات
        </h1>
        <p className="text-muted-foreground">
          مؤشرات الأداء الرئيسية للأفراد والمؤسسات مع نموذج تنبؤي لمخصص الزكاة السنة القادمة.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="متوسط الثروة (12 شهر)" value={avgWealth.toLocaleString()} suffix="ر.س" />
        <Kpi
          label="زكاة متراكمة تقديرية"
          value={Math.round(totalZakat).toLocaleString()}
          suffix="ر.س"
        />
        <Kpi
          label="فوق النصاب"
          value={`${Math.round((individual.filter((x) => x.wealth > x.nisab).length / individual.length) * 100)}%`}
        />
        <Kpi label="معدل النمو الوعائي" value={`${(growth * 100).toFixed(1)}%`} note="سنوي" />
      </div>

      <Tabs defaultValue="individuals">
        <TabsList>
          <TabsTrigger value="individuals" className="gap-1">
            <User className="h-4 w-4" /> الأفراد
          </TabsTrigger>
          <TabsTrigger value="institutions" className="gap-1">
            <Building2 className="h-4 w-4" /> المؤسسات
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1">
            <Sparkles className="h-4 w-4" /> التنبؤ
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-1">
            <TrendingUp className="h-4 w-4" /> المصارف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individuals">
          <Card>
            <CardHeader>
              <CardTitle>الثروة مقابل النصاب — آخر 12 شهر</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={individual}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="wealth"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="الثروة"
                  />
                  <Line
                    type="monotone"
                    dataKey="nisab"
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="5 5"
                    name="النصاب"
                  />
                  <Line
                    type="monotone"
                    dataKey="zakat"
                    stroke="hsl(var(--accent))"
                    name="زكاة شهرية"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="institutions">
          <Card>
            <CardHeader>
              <CardTitle>الوعاء الزكوي المؤسسي — ربع سنوي</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={institutional}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="quarter" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="base" fill="hsl(var(--primary))" name="الوعاء" />
                  <Bar dataKey="zakat" fill="hsl(var(--accent))" name="مخصص الزكاة" />
                  <Bar dataKey="tax_deduct" fill="hsl(var(--secondary))" name="الخصم الضريبي" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تنبؤ الزكاة للسنة القادمة (نطاق ثقة ±12%)</CardTitle>
              <div className="flex gap-1">
                {[0.02, 0.045, 0.08].map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={growth === g ? "default" : "outline"}
                    onClick={() => setGrowth(g)}
                  >
                    نمو {(g * 100).toFixed(0)}%
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent style={{ height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="high"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    name="حدّ أعلى"
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="المتوقَّع"
                  />
                  <Line
                    type="monotone"
                    dataKey="low"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    name="حدّ أدنى"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3">
                نموذج بسيط قائم على النمو المُركَّب. للاستخدام المؤسسي يُنصح بربطه ببيانات ERP
                الفعلية عبر
                <a className="text-primary underline mx-1" href="/api/public/erp/journal">
                  /api/public/erp/journal
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>مصارف الزكاة الثمانية — توزيع تمثيلي</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 340 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={110} label>
                    {distribution.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تنويه منهجي</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            • الأرقام في هذه الصفحة تمثيلية للعرض وتوضيح البنية التحليلية؛ في الاستخدام الفعلي
            تُغذّى من حسابك أو ERP.
          </p>
          <p>
            • التنبؤ لا يُعدّ فتوى شرعية ولا استشارة استثمارية — الزكاة تُحسب على المال المملوك
            فعلاً عند الحول.
          </p>
          <p>
            • التوزيع على المصارف الثمانية استرشادي؛ الأصل هو التوزيع الفعلي من الأصناف المذكورة في
            قوله تعالى ﴿إنما الصدقات...﴾.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function Kpi({
  label,
  value,
  suffix,
  note,
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">
          {value}
          {suffix && <span className="text-sm text-muted-foreground ms-1">{suffix}</span>}
        </div>
        {note && <div className="text-[10px] text-muted-foreground mt-1">{note}</div>}
      </CardContent>
    </Card>
  );
}
