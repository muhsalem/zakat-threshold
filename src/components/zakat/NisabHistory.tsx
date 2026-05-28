import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRY_PRICES,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  NISAB_HISTORY,
  NISAB_LAST_100_YEARS,
  fmt,
  num,
} from "@/lib/zakat";
import {
  Scroll,
  Coins,
  Gem,
  Globe2,
  CalendarClock,
  Database,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLivePrices } from "@/lib/prices.functions";

// Map internal country code -> ISO 4217 currency
const ISO_CURRENCY: Record<string, string> = {
  EG: "EGP", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", BH: "BHD",
  OM: "OMR", JO: "JOD", MA: "MAD", DZ: "DZD", TN: "TND", IQ: "IQD",
  SY: "SYP", LB: "LBP", YE: "YER", SD: "SDG", LY: "LYD", PS: "ILS",
  TR: "TRY", US: "USD", EU: "EUR", GB: "GBP",
};

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

type NisabRow = {
  id: string;
  year: number;
  month: number | null;
  hijri_year: number | null;
  currency: string;
  country_code?: string;
  gold_price: number;
  silver_price: number;
  event: string | null;
};

const COUNTRY_LABEL_AR: Record<string, string> = {
  GLOBAL: "السوق العالمية (XAU/XAG)",
  EG: "مصر", SA: "السعودية", AE: "الإمارات", KW: "الكويت", QA: "قطر",
  BH: "البحرين", OM: "عُمان", JO: "الأردن", US: "الولايات المتحدة",
};

export function NisabHistory() {
  const [countryCode, setCountryCode] = useState("EG");
  const country = COUNTRY_PRICES.find((c) => c.code === countryCode) ?? COUNTRY_PRICES[0];
  const [goldPrice, setGoldPrice] = useState<string>(String(country.gold24));
  const [silverPrice, setSilverPrice] = useState<string>(String(country.silver));

  // قاعدة بيانات الأنصبة
  const [dbRows, setDbRows] = useState<NisabRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  useEffect(() => {
    supabase
      .from("nisab_prices")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false, nullsFirst: false })
      .then(({ data }) => { if (data) setDbRows(data as NisabRow[]); });
  }, []);

  const dbYears = useMemo(() => {
    const set = new Set<number>(dbRows.map((r) => r.year));
    return [...set].sort((a, b) => b - a);
  }, [dbRows]);

  const monthsForYear = useMemo(
    () => dbRows.filter((r) => r.year === selectedYear && r.month !== null)
      .map((r) => r.month as number)
      .sort((a, b) => a - b),
    [dbRows, selectedYear]
  );

  const selectedRow = useMemo(() => {
    if (monthsForYear.length > 0) {
      return dbRows.find((r) => r.year === selectedYear && r.month === selectedMonth) ?? null;
    }
    return dbRows.find((r) => r.year === selectedYear && r.month === null) ?? null;
  }, [dbRows, selectedYear, selectedMonth, monthsForYear]);

  // --- Live prices ---
  const fetchPrices = useServerFn(getLivePrices);
  const [livePrices, setLivePrices] = useState<{
    goldPerGram: number;
    silverPerGram: number;
    fetchedAt: string;
  } | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const refreshLive = useCallback(
    async (code: string) => {
      const iso = ISO_CURRENCY[code] ?? "USD";
      setLiveLoading(true);
      setLiveError(null);
      try {
        const res = await fetchPrices({ data: { currency: iso } });
        setLivePrices({
          goldPerGram: res.goldPerGram,
          silverPerGram: res.silverPerGram,
          fetchedAt: res.fetchedAt,
        });
        setGoldPrice(res.goldPerGram.toFixed(2));
        setSilverPrice(res.silverPerGram.toFixed(3));
      } catch (e) {
        setLiveError(e instanceof Error ? e.message : "تعذّر جلب الأسعار");
      } finally {
        setLiveLoading(false);
      }
    },
    [fetchPrices],
  );

  // Initial + on country change: live fetch, with 5-min auto refresh
  useEffect(() => {
    refreshLive(countryCode);
    const t = setInterval(() => refreshLive(countryCode), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [countryCode, refreshLive]);

  const onCountryChange = (code: string) => {
    const c = COUNTRY_PRICES.find((x) => x.code === code);
    if (!c) return;
    setCountryCode(code);
    // fallback defaults while live fetch is pending
    setGoldPrice(String(c.gold24));
    setSilverPrice(String(c.silver));
  };

  const goldNisabValue = num(goldPrice) * GOLD_NISAB_GRAMS;
  const silverNisabValue = num(silverPrice) * SILVER_NISAB_GRAMS;
  const lowerNisab = Math.min(
    goldNisabValue || Infinity,
    silverNisabValue || Infinity,
  );

  // --- Historical chart data (USD baseline) ---
  const [chartMode, setChartMode] = useState<"USD" | "LOCAL">("USD");
  const liveFxRate = useMemo(() => {
    if (chartMode === "USD" || !livePrices) return 1;
    // derive USD->local fx from live data (gold per gram local / gold per gram usd-equivalent)
    // We don't have the raw USD value here, so use a simpler proxy: pull from country defaults
    const c = COUNTRY_PRICES.find((x) => x.code === countryCode);
    const usd = COUNTRY_PRICES.find((x) => x.code === "US");
    if (!c || !usd) return 1;
    return c.gold24 / usd.gold24;
  }, [chartMode, livePrices, countryCode]);

  const chartData = useMemo(
    () =>
      NISAB_LAST_100_YEARS.map((y) => {
        const gold = y.goldUsd * liveFxRate;
        const silver = y.silverUsd * liveFxRate;
        return {
          year: y.gregorian,
          gold: Number(gold.toFixed(2)),
          silver: Number(silver.toFixed(3)),
          ratio: silver > 0 ? Number((gold / silver).toFixed(1)) : 0,
          event: y.event,
        };
      }),
    [liveFxRate],
  );

  const currencyLabel = chartMode === "USD" ? "$" : country.currency;




  return (
    <div className="space-y-6">
      {/* نصاب اليوم */}
      <Card className="border-gold/30 shadow-soft">
        <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe2 className="h-5 w-5 text-gold" />
                نصاب اليوم — حسب الدولة (تحديث لحظي)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                الأسعار محدّثة لحظيًّا من مصادر السوق العالمية (XAU/XAG + سعر صرف USD)،
                ويعاد التحديث تلقائيًّا كل 5 دقائق. يمكنك تعديل القيم يدويًّا للسعر المحلي.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshLive(countryCode)}
                disabled={liveLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ml-1 ${liveLoading ? "animate-spin" : ""}`} />
                تحديث الأسعار
              </Button>
              {livePrices && !liveError && (
                <Badge variant="secondary" className="text-[10px]">
                  ● حيّ — {new Date(livePrices.fetchedAt).toLocaleTimeString("ar-EG")}
                </Badge>
              )}
              {liveError && (
                <Badge variant="destructive" className="text-[10px]">تعذّر التحديث</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الدولة</Label>
              <Select value={countryCode} onValueChange={onCountryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRY_PRICES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">سعر جرام الذهب عيار 24 ({country.currency})</Label>
              <Input
                type="number"
                value={goldPrice}
                onChange={(e) => setGoldPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">سعر جرام الفضة ({country.currency})</Label>
              <Input
                type="number"
                value={silverPrice}
                onChange={(e) => setSilverPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gold/30 bg-gold/10 p-4">
              <div className="flex items-center gap-2 mb-2 text-gold-foreground">
                <Gem className="h-4 w-4" />
                <span className="font-semibold">نصاب الذهب</span>
                <Badge variant="secondary" className="text-[10px]">85 جم</Badge>
              </div>
              <p className="text-2xl font-bold">
                {fmt(goldNisabValue)} <span className="text-sm font-normal">{country.currency}</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4" />
                <span className="font-semibold">نصاب الفضة</span>
                <Badge variant="secondary" className="text-[10px]">595 جم</Badge>
              </div>
              <p className="text-2xl font-bold">
                {fmt(silverNisabValue)} <span className="text-sm font-normal">{country.currency}</span>
              </p>
            </div>
          </div>

          <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3 text-sm leading-relaxed">
            <span className="font-semibold text-primary">القيمة الواجب اعتبارها (الأنفع للفقراء): </span>
            {isFinite(lowerNisab) ? `${fmt(lowerNisab)} ${country.currency}` : "—"}
            <span className="text-muted-foreground"> — تجب الزكاة إذا بلغ مالك هذا الحد وحال عليه الحول.</span>
          </div>
        </CardContent>
      </Card>

      {/* قاعدة بيانات الأنصبة — اختيار السنة والشهر */}
      <Card className="border-primary/30 shadow-soft" dir="rtl">
        <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Database className="h-5 w-5 text-primary" />
            قاعدة بيانات الأنصبة — اختر السنة والشهر
          </CardTitle>
          <p className="text-sm text-muted-foreground text-right">
            البيانات محفوظة في قاعدة بيانات النظام. اختر السنة، ولسنة 2026 يمكنك اختيار الشهر للاطلاع على
            النصاب الشهري التفصيلي.
          </p>
        </CardHeader>
        <CardContent className="pt-6 space-y-4 text-right">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">السنة</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {dbYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}م</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {monthsForYear.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">الشهر</Label>
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(v) => setSelectedMonth(Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {monthsForYear.map((m) => (
                      <SelectItem key={m} value={String(m)}>{MONTHS_AR[m - 1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedRow ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gold/30 bg-gold/10 p-4">
                <div className="flex items-center gap-2 mb-2 text-gold-foreground">
                  <Gem className="h-4 w-4" />
                  <span className="font-semibold">سعر جرام الذهب</span>
                  <Badge variant="secondary" className="text-[10px]">{selectedRow.currency}</Badge>
                </div>
                <p className="text-xl font-bold">{fmt(selectedRow.gold_price, 2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  نصاب الذهب = {fmt(selectedRow.gold_price * GOLD_NISAB_GRAMS, 0)} {selectedRow.currency}
                </p>
              </div>
              <div className="rounded-lg border bg-muted p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">سعر جرام الفضة</span>
                  <Badge variant="secondary" className="text-[10px]">{selectedRow.currency}</Badge>
                </div>
                <p className="text-xl font-bold">{fmt(selectedRow.silver_price, 3)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  نصاب الفضة = {fmt(selectedRow.silver_price * SILVER_NISAB_GRAMS, 0)} {selectedRow.currency}
                </p>
              </div>
              {selectedRow.event && (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  📌 {selectedRow.event}
                  {selectedRow.hijri_year ? ` — الموافق ${selectedRow.hijri_year}هـ` : ""}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد بيانات متاحة لهذا الاختيار.</p>
          )}
        </CardContent>
      </Card>


      {/* رسم بياني — آخر 100 عام + نسبة الذهب/الفضة */}
      <Card className="border-gold/30 shadow-soft">
        <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarClock className="h-5 w-5 text-gold" />
                النصاب خلال آخر 100 عام — مخطط بياني
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                تطور سعر جرام الذهب والفضة ونسبة الذهب/الفضة (Gold-Silver Ratio) سنويًا.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chartMode === "USD" ? "default" : "outline"}
                onClick={() => setChartMode("USD")}
              >
                بالدولار
              </Button>
              <Button
                size="sm"
                variant={chartMode === "LOCAL" ? "default" : "outline"}
                onClick={() => setChartMode("LOCAL")}
              >
                بعملة {country.name}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="price"
                  tick={{ fontSize: 11 }}
                  label={{ value: `سعر الجرام (${currencyLabel})`, angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="ratio"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  label={{ value: "النسبة (Ratio)", angle: 90, position: "insideRight", style: { fontSize: 11 } }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, direction: "rtl" }}
                  formatter={(value: number, name: string) => {
                    if (name === "ratio") return [`${value} : 1`, "نسبة الذهب/الفضة"];
                    if (name === "gold") return [`${fmt(value, 2)} ${currencyLabel}`, "جرام الذهب"];
                    if (name === "silver") return [`${fmt(value, 3)} ${currencyLabel}`, "جرام الفضة"];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `سنة ${label}م`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="gold"
                  name="الذهب"
                  stroke="hsl(45 90% 50%)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="silver"
                  name="الفضة"
                  stroke="hsl(220 10% 60%)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="ratio"
                  type="monotone"
                  dataKey="ratio"
                  name="نسبة الذهب/الفضة"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border border-gold/30 bg-gold/10 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-gold-foreground mb-1">
                <Gem className="h-3.5 w-3.5" /> الذهب
              </div>
              متوسط جرام الذهب — خط ذهبي متصل (محور أيسر).
            </div>
            <div className="rounded-md border bg-muted p-3">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <Coins className="h-3.5 w-3.5" /> الفضة
              </div>
              متوسط جرام الفضة — خط رمادي متصل (محور أيسر).
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> نسبة الذهب/الفضة
              </div>
              كم جرام فضة يساوي جرام ذهب — متقطّع (محور أيمن). كلما زادت النسبة كانت الفضة هي
              الأنفع للفقراء.
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            * بيانات تاريخية تقديرية بالدولار. وضع &quot;بعملة الدولة&quot; يستخدم سعر صرف
            تقديري حالي وليس تاريخيًّا — للمقارنة البصرية فقط. المرجع الشرعي هو الوزن (85 جم
            ذهبًا و595 جم فضة).
          </p>
        </CardContent>
      </Card>


      {/* التطور التاريخي عبر العصور */}
      <Card className="border-gold/30 shadow-soft">
        <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Scroll className="h-5 w-5 text-gold" />
            التطور التاريخي للنصاب عبر العصور
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            من العهد النبوي حتى العصر الحديث — مع توثيق المعيار الشرعي عبر العصور.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative">
            <div className="absolute right-3 top-2 bottom-2 w-px bg-gradient-to-b from-gold via-primary/30 to-transparent" />
            <div className="space-y-6">
              {NISAB_HISTORY.map((item, idx) => (
                <div key={idx} className="relative pr-10">
                  <div className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-gradient-gold ring-4 ring-background shadow-gold" />
                  <div className="flex flex-wrap items-baseline gap-2 mb-2">
                    <h3 className="text-lg font-bold text-primary">{item.era}</h3>
                    <Badge variant="secondary" className="text-xs">{item.period}</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <div className="rounded-md bg-gold/10 border border-gold/20 px-3 py-2 text-sm">
                      <span className="font-semibold text-gold-foreground">الذهب: </span>
                      {item.gold}
                    </div>
                    <div className="rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-semibold">الفضة: </span>
                      {item.silver}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
