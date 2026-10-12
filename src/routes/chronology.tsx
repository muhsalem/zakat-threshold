import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  History,
  Coins,
  Scale,
  Calendar,
  Globe,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Landmark,
  Calculator,
  Compass,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  ListFilter,
  Eye,
} from "lucide-react";
import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useNisab } from "@/components/site/Prices";
import { COUNTRIES, findCountry } from "@/lib/countries";
import {
  getAnyHijriYearDetails,
  ISLAMIC_CHRONOLOGY,
  type AnyHijriYearDetails,
} from "@/lib/islamic-chronology";

export const Route = createFileRoute("/chronology")({
  head: () => ({
    meta: [
      {
        title: "سجل كافة سنوات الهجرة (2 هـ - 1448 هـ) لأنصبة الزكاة · نِصاب",
      },
      {
        name: "description",
        content:
          "الموسوعة والتدقيق التاريخي الشامل لكافة سنوات الهجرة من عام 2 هـ (تاريخ فرض الزكاة شرعاً) وحتى عام 1448 هـ الحالي؛ مقادير أنصبة الذهب والفضة والدنانير والدراهم والعملات الإقليمية.",
      },
      {
        property: "og:title",
        content: "سجل كافة سنوات الهجرة (2 هـ - 1448 هـ) لأنصبة الزكاة",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChronologyPage,
});

const CENTURIES = [
  {
    century: 1,
    from: 2,
    to: 100,
    labelAr: "القرن الأول (2 - 100 هـ)",
    era: "بدء فرض الزكاة بالمدينة وعصر الراشدين والأموي",
  },
  {
    century: 2,
    from: 101,
    to: 200,
    labelAr: "القرن الثاني (101 - 200 هـ)",
    era: "الأموي وبداية العباسي",
  },
  {
    century: 3,
    from: 201,
    to: 300,
    labelAr: "القرن الثالث (201 - 300 هـ)",
    era: "أوج العصر العباسي",
  },
  {
    century: 4,
    from: 301,
    to: 400,
    labelAr: "القرن الرابع (301 - 400 هـ)",
    era: "الدويلات والحمدانيين والبويهيين",
  },
  {
    century: 5,
    from: 401,
    to: 500,
    labelAr: "القرن الخامس (401 - 500 هـ)",
    era: "العصر السلجوقي والفاطمي",
  },
  {
    century: 6,
    from: 501,
    to: 600,
    labelAr: "القرن السادس (501 - 600 هـ)",
    era: "الحروب الصليبية والأيوبيون",
  },
  {
    century: 7,
    from: 601,
    to: 700,
    labelAr: "القرن السابع (601 - 700 هـ)",
    era: "سقوط بغداد وقيام المماليك",
  },
  {
    century: 8,
    from: 701,
    to: 800,
    labelAr: "القرن الثامن (701 - 800 هـ)",
    era: "المماليك وابن خلدون والمقريزي",
  },
  {
    century: 9,
    from: 801,
    to: 900,
    labelAr: "القرن التاسع (801 - 900 هـ)",
    era: "فتح القسطنطينية وأواخر المماليك",
  },
  {
    century: 10,
    from: 901,
    to: 1000,
    labelAr: "القرن العاشر (901 - 1000 هـ)",
    era: "بداية العثمانيين وثورة الفضة",
  },
  {
    century: 11,
    from: 1001,
    to: 1100,
    labelAr: "القرن الحادي عشر (1001 - 1100 هـ)",
    era: "أوج الدولة العثمانية",
  },
  {
    century: 12,
    from: 1101,
    to: 1200,
    labelAr: "القرن الثاني عشر (1101 - 1200 هـ)",
    era: "العصر العثماني المتأخر",
  },
  {
    century: 13,
    from: 1201,
    to: 1300,
    labelAr: "القرن الثالث عشر (1201 - 1300 هـ)",
    era: "قاعدة الذهب والعملات الحديثة",
  },
  {
    century: 14,
    from: 1301,
    to: 1400,
    labelAr: "القرن الرابع عشر (1301 - 1400 هـ)",
    era: "سقوط الخلافة والنقود الورقية",
  },
  {
    century: 15,
    from: 1401,
    to: 1448,
    labelAr: "القرن الخامس عشر (1401 - 1448 هـ)",
    era: "العصر المعاصر الرقمي (السنة الحالية)",
  },
];

export function ChronologyPage() {
  const { currency, country } = useI18n();
  const { data, money } = useNisab();

  // Selected year state (default: Year 2 AH - year Zakat was decreed)
  const [selectedYear, setSelectedYear] = useState<number>(2);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(country || "SA");

  // Century selection and Search
  const [activeCentury, setActiveCentury] = useState<number>(1);
  const [searchYearQuery, setSearchYearQuery] = useState<string>("");

  // Interactive quick calculator for that chosen year
  const [testWealth, setTestWealth] = useState<string>("50000");

  const exchangeRate = data?.rates?.[currency] ?? 1;

  // Compute full historical details for the selected year and country
  const yearDetails = useMemo(() => {
    return getAnyHijriYearDetails(selectedYear, selectedCountryCode, exchangeRate);
  }, [selectedYear, selectedCountryCode, exchangeRate]);

  // Quick jump milestone buttons (starting from 2 AH when Zakat was instituted)
  const quickJumpYears = [2, 3, 4, 5, 11, 18, 77, 99, 132, 160, 450, 800, 1000, 1300, 1391, 1448];

  const countryObj = findCountry(selectedCountryCode);
  const countryNameStr = countryObj ? countryObj.nameAr : selectedCountryCode;

  // Zakat calculation for that specific year
  const wealthNum = parseFloat(testWealth) || 0;
  const isReachedSilver = wealthNum >= yearDetails.silverNisabLocal;
  const isReachedGold = wealthNum >= yearDetails.goldNisabLocal;
  const zakatDue = isReachedSilver ? wealthNum * 0.025 : 0;

  // Generate list of years for display (starts from 2 AH)
  const displayedYears = useMemo(() => {
    if (searchYearQuery.trim()) {
      const q = searchYearQuery.trim().toLowerCase();
      const numQuery = parseInt(q);
      const list: number[] = [];
      for (let y = 2; y <= 1448; y++) {
        if (!isNaN(numQuery) && (y === numQuery || String(y).includes(q))) {
          list.push(y);
        }
      }
      return list.length > 0 ? list : [2];
    }

    const currentCenturyMeta = CENTURIES.find((c) => c.century === activeCentury) ?? CENTURIES[0]!;
    const list: number[] = [];
    for (let y = currentCenturyMeta.from; y <= currentCenturyMeta.to; y++) {
      list.push(y);
    }
    return list;
  }, [activeCentury, searchYearQuery]);

  return (
    <Page
      eyebrow="ENCYCLOPEDIA · 2 AH TO 1448 AH"
      title="سجل كافة سنوات الهجرة (2 هـ - 1448 هـ)"
      sub="الموسوعة والتدقيق التاريخي الكامل لأنصبة الزكاة بدءاً من السنة الثانية للهجرة النبوية (تاريخ تشريع وفرض الزكاة) وحتى السنة الحالية (1448 هـ)، مع تفصيل النقد والقوة الشرائية بحسب الدول."
    >
      {/* Historical Jurisprudence Clarification Callout */}
      <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:p-5 text-xs text-foreground flex items-start gap-3.5 shadow-sm">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block font-bold text-primary text-sm sm:text-base">
            تدقيق شرعي وتاريخي: بدء توثيق وحساب النصاب من السنة الثانية للهجرة (2 هـ)
          </strong>
          <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
            شُرعت وفُرضت الزكاة في الإسلام في السنة الثانية من الهجرة النبوية بالمدينة المنورة (في
            شهر شعبان)، حيث نزل فرض ربع العشر (٢٫٥٪) وحدد النبي ﷺ مقادير النصاب الشرعي بالأثمان:
            «ليس في أقل من عشرين مثقالاً من الذهب صدقة» (٨٥ جم) و«ليس في أقل من مائتي درهم صدقة»
            (٥٩٥ جم). ولذا يبدأ التدقيق المحاسبي والتوثيقي لأنصبة الزكاة من عام ٢ هـ حصراً وليس
            السنة الأولى.
          </p>
        </div>
      </div>

      {/* Top Controller Bar: Year Selector & Country Selector */}
      <section className="card-surface p-6 sm:p-8 border border-accent/40 bg-gradient-to-br from-card via-card to-secondary/30">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="eyebrow text-xs text-accent">المحدد الزمني والجغرافي المباشر</span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              اختر أي سنة من 2 هـ إلى 1448 هـ لاستعراض نصابها فوراً
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Globe className="size-4 text-muted-foreground" />
            <select
              aria-label="اختر الدولة"
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring font-medium"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameAr} ({c.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Year Slider and Number Input */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="year-input" className="text-sm font-semibold text-foreground">
                السنة الهجرية:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedYear((prev) => Math.max(2, prev - 1))}
                  className="rounded-lg border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
                  title="السنة السابقة"
                >
                  <ChevronRight className="size-4" />
                </button>
                <input
                  id="year-input"
                  type="number"
                  min="2"
                  max="1448"
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(Math.max(2, Math.min(1448, parseInt(e.target.value) || 2)))
                  }
                  className="w-24 rounded-xl border border-input bg-background p-2 text-center text-lg font-bold text-foreground num outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setSelectedYear((prev) => Math.min(1448, prev + 1))}
                  className="rounded-lg border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
                  title="السنة التالية"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-bold text-foreground">هـ</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedYear(2)}
                className="text-xs"
              >
                عام 2 هـ (بدء فرض الزكاة)
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedYear(1448)}
                className="text-xs bg-primary text-primary-foreground"
              >
                عام 1448 هـ (السنة الحالية)
              </Button>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="pt-2">
            <input
              type="range"
              min="2"
              max="1448"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
            <div className="mt-1.5 flex justify-between text-[0.65rem] text-muted-foreground font-mono">
              <span>عام 2 هـ (فرض الزكاة)</span>
              <span>100 هـ</span>
              <span>500 هـ</span>
              <span>1000 هـ</span>
              <span>1448 هـ (الوقت الحالي)</span>
            </div>
          </div>

          {/* Quick Year Jump Chips */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground me-2">سنوات مفصلية:</span>
            {quickJumpYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {y} هـ
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Historical Year Spotlight Card */}
      <section className="mt-8 card-surface p-6 sm:p-8 border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground font-[family-name:var(--font-display)] font-bold text-2xl shadow-md">
              {selectedYear}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  {yearDetails.eraNameAr}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  (نحو عام {yearDetails.gregorianYear} ميلادية)
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                نصاب الزكاة في عام {selectedYear} هجرية في سياق {countryNameStr}
              </h3>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/50 p-3 text-center sm:text-start">
            <span className="text-xs text-muted-foreground block">نسبة الذهب إلى الفضة حينها</span>
            <span className="num text-xl sm:text-2xl font-bold text-foreground">
              1 : {yearDetails.goldToSilverRatio}
            </span>
            <span className="text-[0.65rem] text-muted-foreground block mt-0.5">
              {yearDetails.goldToSilverRatio === 10.0
                ? "تطابق تام في القوة الشرائية"
                : `كل دينار ذهب = ${yearDetails.goldToSilverRatio} درهم فضة`}
            </span>
          </div>
        </div>

        {/* Nisab Values & Standards Grid */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-xs text-muted-foreground">نصاب الذهب الشرعي</span>
              <Coins className="size-4 text-accent" />
            </div>
            <p className="num mt-2 text-2xl font-bold text-foreground">20 ديناراً</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              يعادل <strong className="num text-foreground">85 غراماً</strong> ذهب خالص 24K
            </p>
            <div className="mt-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
              القيمة المقدرة اليوم:{" "}
              <strong className="num text-foreground">{money(yearDetails.goldNisabLocal)}</strong>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-xs text-muted-foreground">نصاب الفضة الشرعي</span>
              <Scale className="size-4 text-accent" />
            </div>
            <p className="num mt-2 text-2xl font-bold text-foreground">200 درهم</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              يعادل <strong className="num text-foreground">595 غراماً</strong> فضة خالصة
            </p>
            <div className="mt-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
              القيمة المقدرة اليوم:{" "}
              <strong className="num text-foreground">{money(yearDetails.silverNisabLocal)}</strong>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 shadow-sm sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-xs text-muted-foreground">
                النقد والعملة السائدة في {countryNameStr}
              </span>
              <Landmark className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-base font-bold text-foreground leading-snug">
              {yearDetails.regionalCurrencyAr}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              الحاكم / السلطة في ذلك العصر:{" "}
              <strong className="text-foreground">{yearDetails.rulerOrContextAr}</strong>
            </div>
          </div>
        </div>

        {/* Detailed Insights & Historical Narratives */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3 text-sm">
          <div className="rounded-2xl border border-border bg-secondary/30 p-5">
            <strong className="block text-xs font-bold text-accent mb-2">
              📜 الحدث التاريخي البارز في عام {selectedYear} هـ
            </strong>
            <p className="text-xs leading-6 text-foreground">{yearDetails.historicalEventAr}</p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-5">
            <strong className="block text-xs font-bold text-accent mb-2">
              ⚖️ الحكم الفقهي ومذهب الزكاة السائد
            </strong>
            <p className="text-xs leading-6 text-foreground">{yearDetails.fiqhiStatusAr}</p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-5">
            <strong className="block text-xs font-bold text-accent mb-2">
              🛒 القوة الشرائية والكفاية المعيشية للنصاب
            </strong>
            <p className="text-xs leading-6 text-foreground">
              {yearDetails.purchasingPowerEstimateAr}
            </p>
          </div>
        </div>

        {/* Interactive Past Year Calculator for the Selected Year */}
        <div className="mt-8 rounded-2xl border border-accent/40 bg-accent/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-accent" />
              <h4 className="text-sm font-bold text-foreground">
                تجربة حاسبة الزكاة لعام {selectedYear} هـ ({countryNameStr})
              </h4>
            </div>
            <span className="text-xs text-muted-foreground">
              اختبر هل كان مالك سيبلغ النصاب في عام {selectedYear} هـ؟
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <label className="text-xs font-medium text-foreground">
                أدخل مالك المقدر ({currency})
              </label>
              <input
                type="number"
                value={testWealth}
                onChange={(e) => setTestWealth(e.target.value)}
                placeholder="50000"
                className="mt-1.5 w-full rounded-xl border border-input bg-card p-2.5 text-sm text-foreground num outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="rounded-xl bg-card p-2.5 border border-border text-xs">
              <span className="text-muted-foreground block">مقارنة بالنصاب:</span>
              <span className="font-bold text-foreground block mt-0.5">
                {isReachedSilver ? "✓ بلغ نصاب الفضة" : "✗ دون نصاب الفضة"} ·{" "}
                {isReachedGold ? "✓ بلغ نصاب الذهب" : "✗ دون نصاب الذهب"}
              </span>
            </div>

            <div className="rounded-xl bg-primary text-primary-foreground p-2.5 shadow-sm">
              <span className="text-[0.7rem] opacity-80 block">الزكاة الواجبة (٢٫٥٪):</span>
              <span className="num text-lg font-bold block mt-0.5">{money(zakatDue)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: ALL HIJRI YEARS DIRECTORY (2 AH TO 1448 AH) */}
      <section className="mt-12 card-surface p-6 sm:p-8 border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ListFilter className="size-4" />
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                فهرس كافة سنوات الهجرة (من عام 2 هـ إلى 1448 هـ)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              تصفح كل سنة سنة بالقرون الهجرية الخمسة عشر أو ابحث برقم أي سنة لعرض مقاديرها كاملة.
            </p>
          </div>

          {/* Search Input for Any Year */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchYearQuery}
              onChange={(e) => setSearchYearQuery(e.target.value)}
              placeholder="ابحث برقم السنة (مثلاً 5، 77، 1448)..."
              className="w-full rounded-xl border border-border bg-background ps-9 pe-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Century Selection Tabs (15 Centuries) */}
        {!searchYearQuery && (
          <div className="mb-6 flex flex-wrap gap-1.5 pb-2 border-b border-border">
            {CENTURIES.map((c) => (
              <button
                key={c.century}
                type="button"
                onClick={() => setActiveCentury(c.century)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCentury === c.century
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                القرن {c.century} ({c.from}-{c.to}هـ)
              </button>
            ))}
          </div>
        )}

        {/* Active Century Header Note */}
        {!searchYearQuery && (
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border/60">
            <span>
              عرض سنوات{" "}
              <strong className="text-foreground">
                {CENTURIES.find((c) => c.century === activeCentury)?.labelAr}
              </strong>{" "}
              · {CENTURIES.find((c) => c.century === activeCentury)?.era}
            </span>
            <span className="font-mono">إجمالي {displayedYears.length} سنة هجرية</span>
          </div>
        )}

        {/* Master Table of All Hijri Years */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-xs">
              <tr className="border-b border-border">
                <th className="py-3 px-4 text-start font-medium">السنة الهجرية</th>
                <th className="py-3 px-4 text-start font-medium">الموافق ميلادياً</th>
                <th className="py-3 px-4 text-start font-medium">نصاب الذهب (85 جم)</th>
                <th className="py-3 px-4 text-start font-medium">نصاب الفضة (595 جم)</th>
                <th className="py-3 px-4 text-start font-medium">النسبة التبادلية</th>
                <th className="py-3 px-4 text-start font-medium">العملة في {countryNameStr}</th>
                <th className="py-3 px-4 text-center font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedYears.map((yr) => {
                const info = getAnyHijriYearDetails(yr, selectedCountryCode, exchangeRate);
                const isSelected = selectedYear === yr;

                return (
                  <tr
                    key={yr}
                    onClick={() => {
                      setSelectedYear(yr);
                      window.scrollTo({ top: 120, behavior: "smooth" });
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-accent/15 font-semibold" : "hover:bg-secondary/30"
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="grid size-7 place-items-center rounded bg-primary/10 text-primary text-xs font-bold">
                          {yr}
                        </span>
                        <span>عام {yr} هـ</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 num text-muted-foreground">
                      نحو {info.gregorianYear} م
                    </td>

                    <td className="py-3 px-4 num text-foreground">
                      {money(info.goldNisabLocal)}
                      <span className="block text-[0.65rem] text-muted-foreground">
                        20 ديناراً (85 جم)
                      </span>
                    </td>

                    <td className="py-3 px-4 num text-foreground">
                      {money(info.silverNisabLocal)}
                      <span className="block text-[0.65rem] text-muted-foreground">
                        200 درهم (595 جم)
                      </span>
                    </td>

                    <td className="py-3 px-4 num text-muted-foreground">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">
                        1 : {info.goldToSilverRatio}
                      </span>
                    </td>

                    <td
                      className="py-3 px-4 text-xs text-muted-foreground max-w-[180px] truncate"
                      title={info.regionalCurrencyAr}
                    >
                      {info.regionalCurrencyAr}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "ghost"}
                        className="text-xs h-7 px-2.5"
                      >
                        <Eye className="size-3.5 me-1" />
                        استعراض
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historical Milestones Master Timeline */}
      <section className="mt-10 card-surface p-6 sm:p-8 border border-border">
        <h3 className="text-lg font-bold text-foreground mb-4">
          المحطات الكبرى لتطور أسعار النقدين عبر العصور (2 هـ - 1448 هـ)
        </h3>
        <div className="divide-y divide-border">
          {ISLAMIC_CHRONOLOGY.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setSelectedYear(m.hijriYear);
                window.scrollTo({ top: 120, behavior: "smooth" });
              }}
              className="py-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-secondary/30 px-3 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-secondary text-foreground font-bold text-sm">
                  {m.hijriYear} هـ
                </span>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{m.titleAr}</h4>
                  <p className="text-xs text-muted-foreground">
                    {m.eraNameAr} · نحو {m.gregorianYear} م
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="text-end">
                  <span className="text-muted-foreground block text-[0.7rem]">
                    نسبة الذهب للفضة
                  </span>
                  <span className="num font-bold text-foreground">1 : {m.goldToSilverRatio}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-xs">
                  عرض السنة ←
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
