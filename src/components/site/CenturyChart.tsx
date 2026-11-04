import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { COUNTRIES, DEFAULT_COUNTRY, findCountry } from "@/lib/countries";
import { buildCenturySeries } from "@/lib/century-series";
import { useI18n } from "@/lib/i18n";
import { formatMoney, formatNumber } from "@/lib/nisab";
import { usePrices } from "@/lib/use-prices";

const GOLD = "oklch(0.72 0.145 78)";
const SILVER = "oklch(0.55 0.02 250)";
const RATIO = "oklch(0.32 0.092 162)";
const RATIO_NAME = "نسبة الذهب/الفضة";

/** Century view: gold and silver price per gram plus the gold/silver ratio, by country currency. */
export function CenturyChart() {
  const { country: siteCountry } = useI18n();
  const { data } = usePrices();
  const [code, setCode] = useState(() => findCountry(siteCountry || DEFAULT_COUNTRY).code);
  const [log, setLog] = useState(true);
  const country = findCountry(code);
  const rate = data?.rates[country.currency] ?? 0;

  const series = useMemo(
    () =>
      buildCenturySeries(rate, {
        live: data ? { goldUsdOz: data.goldUsdOz, silverUsdOz: data.silverUsdOz } : undefined,
      }),
    [rate, data],
  );

  /** Recharts cannot fit a log axis to the data itself, so snap to whole powers of ten. */
  const logDomain = useMemo<[number, number]>(() => {
    const values = series.flatMap((p) => [p.gold, p.silver]).filter((v) => v > 0);
    if (values.length === 0) return [0.01, 1000];
    return [
      10 ** Math.floor(Math.log10(Math.min(...values))),
      10 ** Math.ceil(Math.log10(Math.max(...values))),
    ];
  }, [series]);

  const sorted = useMemo(() => [...COUNTRIES].sort((a, b) => a.ar.localeCompare(b.ar, "ar")), []);
  const money = (v: number) => formatMoney(v, country.currency, "en");

  return (
    <section
      aria-labelledby="century-title"
      className="card-surface overflow-hidden"
      dir="rtl"
      lang="ar"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-secondary/40 p-6">
        <div>
          <h2 id="century-title" className="flex items-center gap-2 text-xl text-foreground">
            <CalendarClock aria-hidden="true" className="size-5 text-accent" />
            النصاب خلال آخر 100 عام — مخطط بياني
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            تطور سعر جرام الذهب والفضة ونسبة الذهب/الفضة (Gold-Silver Ratio) سنويًا.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            الدولة المرجعية للعرض
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-10 min-w-44 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {sorted.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.ar} ({c.currency})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={log}
              onChange={(e) => setLog(e.target.checked)}
              className="size-4"
            />
            مقياس لوغاريتمي
          </label>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {series.length === 0 ? (
          <p role="status" className="py-16 text-center text-sm text-muted-foreground">
            جارٍ تحميل أسعار الصرف…
          </p>
        ) : (
          <div
            role="img"
            aria-label={`رسم بياني لسعر جرام الذهب والفضة ونسبتهما بعملة ${country.currency} على مدى مئة عام`}
            className="h-80 w-full sm:h-96"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  yAxisId="price"
                  scale={log ? "log" : "linear"}
                  domain={log ? logDomain : [0, "auto"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => formatNumber(v, v < 0.1 ? 2 : v < 10 ? 1 : 0)}
                  width={56}
                  label={{
                    value: `سعر الجرام (${country.currency})`,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11 },
                  }}
                />
                <YAxis
                  yAxisId="ratio"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={40}
                  label={{
                    value: "النسبة (Ratio)",
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 11 },
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === RATIO_NAME
                      ? [`${formatNumber(value, 1)} : 1`, name]
                      : [money(value), name]
                  }
                  labelFormatter={(year: number) => `عام ${year}`}
                />
                <Legend />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="gold"
                  name="الذهب"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="silver"
                  name="الفضة"
                  stroke={SILVER}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="ratio"
                  type="monotone"
                  dataKey="ratio"
                  name={RATIO_NAME}
                  stroke={RATIO}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm">
            <h3 className="text-foreground">الذهب</h3>
            <p className="mt-1 leading-7 text-muted-foreground">
              تطور سعر جرام الذهب الخالص — خط ذهبي متصل (المحور الأيسر).
            </p>
          </article>
          <article className="rounded-xl border border-border bg-secondary p-4 text-sm">
            <h3 className="text-foreground">الفضة</h3>
            <p className="mt-1 leading-7 text-muted-foreground">
              تطور سعر جرام الفضة — خط رمادي متصل (المحور الأيسر نفسه). المقياس اللوغاريتمي يُظهر
              الفضة والذهب معًا رغم الفارق الكبير بين سعريهما.
            </p>
          </article>
          <article className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
            <h3 className="text-foreground">نسبة الذهب/الفضة</h3>
            <p className="mt-1 leading-7 text-muted-foreground">
              كم جرام فضة يساوي جرام ذهب — خط أخضر متقطع (المحور الأيمن). كلما ارتفعت النسبة اتسعت
              الفجوة بين نصاب الذهب ونصاب الفضة.
            </p>
          </article>
        </div>

        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          متوسطات سنوية تقريبية بالدولار للأونصة تُحوَّل بسعر صرف اليوم، فهي تقارن سعر المعدن نفسه
          ولا تعكس القيمة المحلية في ذلك الزمن. الذهب حتى عام 1971 سعر رسمي ثابت وليس سعر سوق،
          والنقطة الأخيرة هي السعر الحي.
        </p>
      </div>
    </section>
  );
}
