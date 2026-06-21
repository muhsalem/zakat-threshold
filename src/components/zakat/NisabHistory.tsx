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
  // فلتر الدولة/العملة لقاعدة بيانات الأنصبة (مستقل)
  const [dbCountryCode, setDbCountryCode] = useState<string>("EG");
  const dbCountry = COUNTRY_PRICES.find((c) => c.code === dbCountryCode) ?? COUNTRY_PRICES[0];
  // معامل تحويل USD → العملة المحلية (تقديري عبر نسبة سعر جرام الذهب)
  const dbFx = useMemo(() => {
    if (dbCountryCode === "US") return 1;
    const us = COUNTRY_PRICES.find((c) => c.code === "US");
    if (!us || !dbCountry) return 1;
    return dbCountry.gold24 / us.gold24;
  }, [dbCountry, dbCountryCode]);

  useEffect(() => {
    supabase
      .from("nisab_prices")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false, nullsFirst: false })
      .then(({ data }) => { if (data) setDbRows(data as NisabRow[]); });
  }, []);

  // الصفوف المرشَّحة حسب الدولة: المحلية أولًا، وإلا الصف العالمي (GLOBAL)
  const rowsForCountry = useMemo(() => {
    const local = dbRows.filter((r) => r.country_code === dbCountryCode);
    const localYears = new Set(local.map((r) => `${r.year}-${r.month ?? 0}`));
    const globalFallback = dbRows.filter(
      (r) => (r.country_code === "GLOBAL" || !r.country_code) &&
             !localYears.has(`${r.year}-${r.month ?? 0}`)
    );
    return [...local, ...globalFallback];
  }, [dbRows, dbCountryCode]);

  const dbYears = useMemo(() => {
    const set = new Set<number>(rowsForCountry.map((r) => r.year));
    return [...set].sort((a, b) => b - a);
  }, [rowsForCountry]);

  const monthsForYear = useMemo(
    () => rowsForCountry.filter((r) => r.year === selectedYear && r.month !== null)
      .map((r) => r.month as number)
      .sort((a, b) => a - b),
    [rowsForCountry, selectedYear]
  );

  const selectedRow = useMemo(() => {
    if (monthsForYear.length > 0) {
      return rowsForCountry.find((r) => r.year === selectedYear && r.month === selectedMonth) ?? null;
    }
    return rowsForCountry.find((r) => r.year === selectedYear && r.month === null) ?? null;
  }, [rowsForCountry, selectedYear, selectedMonth, monthsForYear]);


  // === توقّع بقيّة العام بسيناريوهات (Scenario-Based) ===
  const forecastScenarios = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const yearRows = dbRows
      .filter((r) => r.year === curYear && r.month !== null)
      .sort((a, b) => (a.month ?? 0) - (b.month ?? 0));
    if (yearRows.length < 2) return null;
    const first = yearRows[0];
    const last = yearRows[yearRows.length - 1];
    const months = (last.month ?? 1) - (first.month ?? 1) || 1;
    const goldRate = (last.gold_price - first.gold_price) / months;
    const silverRate = (last.silver_price - first.silver_price) / months;
    const remaining: number[] = [];
    for (let m = (last.month ?? curMonth) + 1; m <= 12; m++) remaining.push(m);
    const project = (base: number, rate: number, factor: number) =>
      remaining.map((m) => ({
        month: m,
        value: Math.max(0, base + rate * factor * (m - (last.month ?? curMonth))),
      }));
    return {
      remaining,
      gold: {
        conservative: project(last.gold_price, goldRate, 0.5),
        base: project(last.gold_price, goldRate, 1),
        optimistic: project(last.gold_price, goldRate, 1.5),
      },
      silver: {
        conservative: project(last.silver_price, silverRate, 0.5),
        base: project(last.silver_price, silverRate, 1),
        optimistic: project(last.silver_price, silverRate, 1.5),
      },
      asOfMonth: last.month ?? curMonth,
      asOfYear: last.year,
    };
  }, [dbRows]);

  // اعتماد توقّع كنصاب اليوم في القسم (أ)
  const applyForecast = (goldUsd: number, silverUsd: number) => {
    setCountryCode(dbCountryCode);
    setGoldPrice((goldUsd * dbFx).toFixed(2));
    setSilverPrice((silverUsd * dbFx).toFixed(3));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
  // محدِّد دولة مستقل لمخطط 100 عام
  const [chartCountryCode, setChartCountryCode] = useState<string>("EG");
  const chartCountry = COUNTRY_PRICES.find((c) => c.code === chartCountryCode) ?? COUNTRY_PRICES[0];
  const liveFxRate = useMemo(() => {
    if (chartMode === "USD") return 1;
    const c = COUNTRY_PRICES.find((x) => x.code === chartCountryCode);
    const usd = COUNTRY_PRICES.find((x) => x.code === "US");
    if (!c || !usd) return 1;
    return c.gold24 / usd.gold24;
  }, [chartMode, chartCountryCode]);

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

  const currencyLabel = chartMode === "USD" ? "$" : chartCountry.currency;




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
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الدولة / العملة</Label>
              <Select value={dbCountryCode} onValueChange={setDbCountryCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRY_PRICES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                يُحوَّل سعر السوق العالمية (USD) إلى عملة الدولة عبر معامل تقريبي.
              </p>
            </div>
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


          {selectedRow ? (() => {
            const today = new Date();
            const rowDate = new Date(selectedRow.year, (selectedRow.month ?? 1) - 1, 1);
            const isForecast = rowDate > new Date(today.getFullYear(), today.getMonth(), 1);
            const countryLabel = COUNTRY_LABEL_AR[selectedRow.country_code || "GLOBAL"] || (selectedRow.country_code || "GLOBAL");
            const goldLocal = selectedRow.gold_price * dbFx;
            const silverLocal = selectedRow.silver_price * dbFx;
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="gap-1">
                    <Globe2 className="h-3 w-3" /> {countryLabel}
                  </Badge>
                  <Badge variant="secondary">مرجع: {selectedRow.currency}</Badge>
                  <Badge className="bg-primary/10 text-primary border border-primary/30">
                    العرض: {dbCountry.name} ({dbCountry.currency})
                  </Badge>
                  {isForecast ? (
                    <Badge className="bg-amber-100 text-amber-900 border border-amber-300 gap-1">
                      <TrendingUp className="h-3 w-3" /> توقع مستقبلي
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300">سعر فعلي مسجل</Badge>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gold/30 bg-gold/10 p-4">
                    <div className="flex items-center gap-2 mb-2 text-gold-foreground">
                      <Gem className="h-4 w-4" />
                      <span className="font-semibold">سعر جرام الذهب</span>
                    </div>
                    <p className="text-xl font-bold">
                      {fmt(goldLocal, 2)} <span className="text-xs font-normal">{dbCountry.currency}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      عالميًا: {fmt(selectedRow.gold_price, 2)} {selectedRow.currency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 border-t pt-1.5">
                      نصاب الذهب = <b>{fmt(goldLocal * GOLD_NISAB_GRAMS, 0)} {dbCountry.currency}</b>
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-4 w-4" />
                      <span className="font-semibold">سعر جرام الفضة</span>
                    </div>
                    <p className="text-xl font-bold">
                      {fmt(silverLocal, 3)} <span className="text-xs font-normal">{dbCountry.currency}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      عالميًا: {fmt(selectedRow.silver_price, 3)} {selectedRow.currency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 border-t pt-1.5">
                      نصاب الفضة = <b>{fmt(silverLocal * SILVER_NISAB_GRAMS, 0)} {dbCountry.currency}</b>
                    </p>
                  </div>
                </div>

                {/* انحراف معياري: محلي vs عالمي */}
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed">
                  <div className="font-semibold text-primary mb-1">📊 مقارنة السعر المحلي بالعالمي</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div>
                      الذهب — محلي حالي: <b>{fmt(dbCountry.gold24, 2)} {dbCountry.currency}</b>{" "}
                      / مرجع السوق (محوّل): <b>{fmt(goldLocal, 2)} {dbCountry.currency}</b>{" "}
                      <span className={dbCountry.gold24 > goldLocal ? "text-amber-700" : "text-emerald-700"}>
                        ({dbCountry.gold24 > goldLocal ? "+" : ""}{(((dbCountry.gold24 - goldLocal) / Math.max(1, goldLocal)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div>
                      الفضة — محلي حالي: <b>{fmt(dbCountry.silver, 3)} {dbCountry.currency}</b>{" "}
                      / مرجع السوق (محوّل): <b>{fmt(silverLocal, 3)} {dbCountry.currency}</b>
                    </div>
                  </div>
                </div>

                {selectedRow.event && (
                  <p className="text-xs text-muted-foreground">
                    📌 {selectedRow.event}
                    {selectedRow.hijri_year ? ` — الموافق ${selectedRow.hijri_year}هـ` : ""}
                  </p>
                )}

                {isForecast && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    <div className="font-bold mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> كيف تم احتساب هذا التوقع؟
                    </div>
                    <p>
                      <b>توقع اتجاهي خطي (Trend-Based Linear Extrapolation)</b> مبني على متوسط الاتجاه
                      الشهري للسنوات (2020–2025)، مع تنعيم بسيط ونمو الذهب التاريخي ~٨٪ سنوياً والفضة ~٦٪ سنوياً.
                    </p>
                    <p className="mt-1.5 opacity-90">
                      ⚠️ التوقع لأغراض تخطيطية فقط، ولا يجوز اعتماده فقهيًا لحساب الزكاة قبل حلول وقته.
                    </p>
                  </div>
                )}
              </div>
            );
          })() : (
            <p className="text-sm text-muted-foreground">لا توجد بيانات متاحة لهذا الاختيار.</p>
          )}

          {/* === توقّع بقيّة العام بالسيناريوهات (الأفضل للزكاة) === */}
          {forecastScenarios && forecastScenarios.remaining.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-gradient-to-bl from-primary/5 to-transparent p-4 space-y-3 mt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-primary flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> توقع النصاب لبقيّة العام — بالسيناريوهات
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    الأنسب للزكاة: يقارن سيناريو محافظ/أساسي/متفائل لمساعدتك في تخطيط حولان النصاب.
                    المرجع: آخر قراءة مسجّلة ({MONTHS_AR[forecastScenarios.asOfMonth - 1]} {forecastScenarios.asOfYear}).
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  العملة المعروضة: {dbCountry.currency}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="border px-2 py-1.5 text-right">الشهر</th>
                      <th className="border px-2 py-1.5">محافظ — ذهب</th>
                      <th className="border px-2 py-1.5">أساسي — ذهب</th>
                      <th className="border px-2 py-1.5">متفائل — ذهب</th>
                      <th className="border px-2 py-1.5">أساسي — فضة</th>
                      <th className="border px-2 py-1.5 print:hidden">اعتماد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastScenarios.remaining.map((m, idx) => {
                      const gC = forecastScenarios.gold.conservative[idx].value * dbFx;
                      const gB = forecastScenarios.gold.base[idx].value * dbFx;
                      const gO = forecastScenarios.gold.optimistic[idx].value * dbFx;
                      const sB = forecastScenarios.silver.base[idx].value * dbFx;
                      return (
                        <tr key={m} className="hover:bg-muted/30">
                          <td className="border px-2 py-1.5 text-right font-semibold">
                            {MONTHS_AR[m - 1]}
                          </td>
                          <td className="border px-2 py-1.5 text-center text-emerald-700">{fmt(gC, 2)}</td>
                          <td className="border px-2 py-1.5 text-center font-bold text-primary">{fmt(gB, 2)}</td>
                          <td className="border px-2 py-1.5 text-center text-amber-700">{fmt(gO, 2)}</td>
                          <td className="border px-2 py-1.5 text-center">{fmt(sB, 3)}</td>
                          <td className="border px-2 py-1.5 text-center print:hidden">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => applyForecast(
                                forecastScenarios.gold.base[idx].value,
                                forecastScenarios.silver.base[idx].value
                              )}
                            >
                              اعتماد في (أ)
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-900">
                  <b>محافظ (Conservative)</b> — يفترض تباطؤ النمو (50% من الاتجاه). الأكثر احتياطًا لحماية الفقير.
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
                  <b>أساسي (Base)</b> — استمرار الاتجاه الحالي كما هو. هو السيناريو المعتمد افتراضيًا.
                </div>
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                  <b>متفائل (Optimistic)</b> — تسارع الاتجاه (150%). للتخطيط الأقصى.
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                * هذه توقعات إحصائية وليست فتوى. عند حلول وقت الزكاة فعليًا، اعتمد دائمًا على القراءة اللحظية من بطاقة "نصاب اليوم" أعلاه.
              </p>
            </div>
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
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-[10px]">الدولة المرجعية للعرض</Label>
                <Select value={chartCountryCode} onValueChange={setChartCountryCode}>
                  <SelectTrigger className="h-8 min-w-[160px] text-xs">
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
                بعملة {chartCountry.name}
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
