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
  gold_price: number;
  silver_price: number;
  event: string | null;
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

  const onCountryChange = (code: string) => {
    const c = COUNTRY_PRICES.find((x) => x.code === code);
    if (!c) return;
    setCountryCode(code);
    setGoldPrice(String(c.gold24));
    setSilverPrice(String(c.silver));
  };

  const goldNisabValue = num(goldPrice) * GOLD_NISAB_GRAMS;
  const silverNisabValue = num(silverPrice) * SILVER_NISAB_GRAMS;
  const lowerNisab = Math.min(
    goldNisabValue || Infinity,
    silverNisabValue || Infinity,
  );

  const years = useMemo(() => [...NISAB_LAST_100_YEARS].reverse(), []);


  return (
    <div className="space-y-6">
      {/* نصاب اليوم */}
      <Card className="border-gold/30 shadow-soft">
        <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe2 className="h-5 w-5 text-gold" />
            نصاب اليوم — حسب الدولة
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            اختر دولتك لعرض السعر التقريبي لجرام الذهب والفضة، ويمكنك تعديل القيم لتطابق
            السعر الحالي في السوق.
          </p>
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


      {/* آخر 100 عام */}
      <Card className="border-gold/30 shadow-soft">
        <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarClock className="h-5 w-5 text-gold" />
            النصاب خلال آخر 100 عام (هجري / ميلادي)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            متوسط سعر جرام الذهب عيار 24 والفضة بالدولار الأمريكي عبر العقود الماضية،
            مع قيمة النصاب المقابلة بالدولار.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">هجري</TableHead>
                  <TableHead className="text-right">ميلادي</TableHead>
                  <TableHead className="text-right">جرام الذهب ($)</TableHead>
                  <TableHead className="text-right">نصاب الذهب ($)</TableHead>
                  <TableHead className="text-right">جرام الفضة ($)</TableHead>
                  <TableHead className="text-right">نصاب الفضة ($)</TableHead>
                  <TableHead className="text-right">حدث</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.gregorian}>
                    <TableCell className="font-semibold text-primary">{y.hijri}هـ</TableCell>
                    <TableCell>{y.gregorian}م</TableCell>
                    <TableCell>{fmt(y.goldUsd, 2)}</TableCell>
                    <TableCell className="font-semibold text-gold-foreground">
                      {fmt(y.goldUsd * GOLD_NISAB_GRAMS, 0)}
                    </TableCell>
                    <TableCell>{fmt(y.silverUsd, 3)}</TableCell>
                    <TableCell className="font-semibold">
                      {fmt(y.silverUsd * SILVER_NISAB_GRAMS, 0)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {y.event ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            * البيانات تقديرية مبنية على متوسط الأسعار العالمية السنوية، والمرجع الشرعي
            هو الوزن (85 جم ذهبًا و595 جم فضة) لا قيمة العملة.
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
