import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { GOLD_NISAB_G, SILVER_NISAB_G, TROY_OUNCE_G } from "@/lib/nisab";
import { getHistory, type HistoryRange, type HistoryResponse } from "@/lib/prices.functions";
import { countryName, findCountry } from "@/lib/countries";

const RANGES: HistoryRange[] = ["1mo", "6mo", "1y", "5y", "10y", "20y", "30y", "50y", "75y", "100y", "1000y"];
const VIEWS = [
  { id: "ng", metal: "gold", grams: GOLD_NISAB_G, label: { ar: "نصاب الذهب (٨٥ جم)", en: "Gold nisab (85 g)" } },
  { id: "ns", metal: "silver", grams: SILVER_NISAB_G, label: { ar: "نصاب الفضة (٥٩٥ جم)", en: "Silver nisab (595 g)" } },
  { id: "g24", metal: "gold", grams: 1, label: { ar: "ذهب 24K / جم", en: "Gold 24K / g" } },
  { id: "g21", metal: "gold", grams: 0.875, label: { ar: "ذهب 21K / جم", en: "Gold 21K / g" } },
  { id: "g18", metal: "gold", grams: 0.75, label: { ar: "ذهب 18K / جم", en: "Gold 18K / g" } },
  { id: "s999", metal: "silver", grams: 1, label: { ar: "فضة 999 / جم", en: "Silver 999 / g" } },
  { id: "s925", metal: "silver", grams: 0.925, label: { ar: "فضة 925 / جم", en: "Silver 925 / g" } },
] as const;

/** Interactive historical chart of nisab and metal prices for the selected country & purity. */
export function NisabHistoryChart({ money }: { money: (v: number) => string }) {
  const { t, lang, currency, country } = useI18n();
  const ar = lang === "ar" || lang === "ur";
  const [range, setRange] = useState<HistoryRange>("1y");
  const [viewId, setViewId] = useState<(typeof VIEWS)[number]["id"]>("ng");
  const view = VIEWS.find((v) => v.id === viewId)!;
  const fetchHistory = useServerFn(getHistory);
  const { data, isLoading, isError, refetch } = useQuery<HistoryResponse>({
    queryKey: ["history", range, currency],
    queryFn: () => fetchHistory({ data: { range, currency } }),
    staleTime: 60 * 60 * 1000,
  });
  const series = useMemo(
    () => (data?.points ?? []).map((p) => ({ t: p.t, value: ((view.metal === "gold" ? p.gold : p.silver) / TROY_OUNCE_G) * p.rate * view.grams })),
    [data, view],
  );
  const change = series.length > 1 ? ((series[series.length - 1]!.value - series[0]!.value) / series[0]!.value) * 100 : null;
  const fmt = (v: number) => new Intl.DateTimeFormat(ar ? "en" : lang, { month: "short", year: "2-digit" }).format(new Date(v));
  const cName = countryName(findCountry(country), lang);
  const viewLabel = ar ? view.label.ar : view.label.en;

  const downloadCsv = () => {
    const rows = [["date", "country", "currency", "series", "range", "value"].join(",")];
    for (const p of series) rows.push([new Date(p.t).toISOString().slice(0, 10), country, currency, `"${view.label.en}"`, range, p.value.toFixed(4)].join(","));
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nisab-${country}-${view.id}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ask = useServerFn(askHistory);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const submitQuestion = async () => {
    if (question.trim().length < 3 || series.length < 2 || asking) return;
    setAsking(true); setAskError(null); setAnswer(null);
    const step = Math.max(1, Math.ceil(series.length / 150));
    const sampled = series.filter((_, i) => i % step === 0 || i === series.length - 1);
    try {
      const res = await ask({ data: { question, country: cName, currency, range, view: view.label.en, lang, points: sampled.map((p) => ({ d: new Date(p.t).toISOString().slice(0, 10), v: p.value })) } });
      setAnswer(res.text);
    } catch (e) {
      setAskError(e instanceof Error ? e.message : String(e));
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ar ? "تغيّر النصاب والأسعار تاريخيًا" : "Historical nisab & prices"}</h2>
          <p className="text-xs text-muted-foreground">{cName} · {currency}{data?.approx ? ` · ${t("history.approx")}` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          {change != null && <p className={`num text-sm ${change >= 0 ? "text-primary" : "text-negative"}`}>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</p>}
          <Button size="sm" variant="outline" disabled={series.length === 0} onClick={downloadCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label={t("karat.purity")} value={viewId} onChange={(e) => setViewId(e.target.value as typeof viewId)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          {VIEWS.map((v) => <option key={v.id} value={v.id}>{ar ? v.label.ar : v.label.en}</option>)}
        </select>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => <Button key={r} size="sm" variant={r === range ? "default" : "outline"} onClick={() => setRange(r)}>{t(`history.range.${r}`)}</Button>)}
        </div>
      </div>
      <div dir="ltr" className="mt-4 h-[240px] w-full sm:h-[320px]">
        {isLoading && <p className="pt-20 text-center text-sm text-muted-foreground">{t("common.loading")}</p>}
        {isError && <div className="pt-20 text-center"><Button size="sm" onClick={() => refetch()}>{t("common.retry")}</Button></div>}
        {data && !data.fxAvailable && <p className="pt-20 text-center text-sm text-muted-foreground">{t("history.fxUnavailable")}</p>}
        {data?.fxAvailable && series.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="homeHistFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="t" tickFormatter={fmt} tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
              <YAxis width={70} tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickFormatter={(v: number) => Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
              <Tooltip labelFormatter={(v) => fmt(Number(v))} formatter={(v: number) => [money(v), ar ? view.label.ar : view.label.en]} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, color: "var(--color-foreground)" }} />
              <Area type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#homeHistFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {data && <p className="mt-3 text-xs text-muted-foreground">{t("update.source")}: {data.metalsSource} · {data.ratesSource}</p>}
    </section>
  );
}
