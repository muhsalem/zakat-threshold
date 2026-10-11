import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { TROY_OUNCE_G, formatMoney } from "@/lib/nisab";
import { getHistory, type HistoryRange, type HistoryResponse } from "@/lib/prices.functions";
import { compareHistory } from "@/lib/history-ask.functions";
import { aiErrorMessage } from "@/lib/ai-errors";
import { COUNTRIES, countryName, flagOf } from "@/lib/countries";
import { RANGES, VIEWS } from "./NisabHistoryChart";

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)", "var(--color-primary)"];

/** Multi-country historical comparison (indexed to 100) with an AI explanation of the differences. */
export function CompareHistory({ picked }: { picked: string[] }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar" || lang === "ur";
  const [range, setRange] = useState<HistoryRange>("1y");
  const [viewId, setViewId] = useState<(typeof VIEWS)[number]["id"]>("ng");
  const view = VIEWS.find((v) => v.id === viewId)!;
  const countries = picked.slice(0, 6).map((code) => COUNTRIES.find((c) => c.code === code)).filter((c): c is NonNullable<typeof c> => !!c);
  const currencies = Array.from(new Set(countries.map((c) => c.currency)));
  const fetchHistory = useServerFn(getHistory);
  const queries = useQueries({
    queries: currencies.map((currency) => ({
      queryKey: ["history", range, currency],
      queryFn: () => fetchHistory({ data: { range, currency } }) as Promise<HistoryResponse>,
      staleTime: 60 * 60 * 1000,
    })),
  });
  const loading = queries.some((q) => q.isLoading);

  const perCountry = useMemo(() => countries.map((c) => {
    const data = queries[currencies.indexOf(c.currency)]?.data;
    const pts = data?.fxAvailable ? data.points.map((p) => ({ t: p.t, v: ((view.metal === "gold" ? p.gold : p.silver) / TROY_OUNCE_G) * p.rate * view.grams })) : [];
    const first = pts[0]?.v;
    const last = pts[pts.length - 1]?.v;
    return { c, name: `${flagOf(c.code)} ${countryName(c, lang)}`, pts, first, last, change: first && last ? ((last - first) / first) * 100 : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [queries.map((q) => q.dataUpdatedAt).join(), picked.join(), view, lang]);

  const chart = useMemo(() => {
    const map = new Map<number, Record<string, number>>();
    perCountry.forEach(({ c, pts, first }) => {
      if (!first) return;
      pts.forEach((p) => {
        const row = map.get(p.t) ?? { t: p.t };
        row[c.code] = Number(((p.v / first) * 100).toFixed(2));
        map.set(p.t, row);
      });
    });
    return [...map.values()].sort((a, b) => (a["t"] ?? 0) - (b["t"] ?? 0));
  }, [perCountry]);
  const fmt = (v: number) => new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(new Date(v));

  const analyze = useServerFn(compareHistory);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const usable = perCountry.filter((x) => x.pts.length >= 2);
  const run = async () => {
    if (busy) return;
    if (usable.length < 2) { setError(aiErrorMessage("NO_DATA", t)); return; }
    setBusy(true); setError(null); setAnswer(null);
    try {
      const res = await analyze({ data: {
        question, range, view: view.label.en, lang,
        series: usable.map((x) => {
          const step = Math.max(1, Math.ceil(x.pts.length / 50));
          return { country: countryName(x.c, "en"), currency: x.c.currency, points: x.pts.filter((_, i) => i % step === 0 || i === x.pts.length - 1).map((p) => ({ d: new Date(p.t).toISOString().slice(0, 10), v: p.v })) };
        }),
      } });
      setAnswer(res.text);
    } catch (e) {
      setError(aiErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-surface mt-6 p-4 sm:p-6">
      <h2 className="text-lg text-foreground">{t("cmp.h.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("cmp.h.sub")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label={t("karat.purity")} value={viewId} onChange={(e) => setViewId(e.target.value as typeof viewId)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          {VIEWS.map((v) => <option key={v.id} value={v.id}>{t(`view.${v.id}`)}</option>)}
        </select>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => <Button key={r} size="sm" variant={r === range ? "default" : "outline"} onClick={() => setRange(r)}>{t(`history.range.${r}`)}</Button>)}
        </div>
      </div>
      <div dir="ltr" className="mt-4 h-[300px] w-full">
        {loading && <p className="flex items-center justify-center gap-2 pt-24 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("common.loading")}</p>}
        {!loading && chart.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="t" tickFormatter={fmt} tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
              <YAxis width={50} tickLine={false} axisLine={false} domain={["auto", "auto"]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
              <Tooltip labelFormatter={(v) => fmt(Number(v))} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, color: "var(--color-foreground)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {perCountry.map((x, i) => x.first ? <Line key={x.c.code} type="monotone" dataKey={x.c.code} name={x.name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} connectNulls /> : null)}
            </LineChart>
          </ResponsiveContainer>
        )}
        {!loading && chart.length === 0 && <p className="pt-24 text-center text-sm text-muted-foreground">{t("history.empty")}</p>}
      </div>
      <div className="scroll-x mt-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr>
            <th className="p-2 text-start font-normal">{t("compare.country")}</th>
            <th className="p-2 text-start font-normal">{t("cmp.h.start")}</th>
            <th className="p-2 text-start font-normal">{t("cmp.h.end")}</th>
            <th className="p-2 text-start font-normal">{t("cmp.h.change")}</th>
          </tr></thead>
          <tbody>
            {perCountry.map((x) => (
              <tr key={x.c.code} className="border-t border-border">
                <td className="whitespace-nowrap p-2 text-foreground">{x.name}</td>
                <td className="num whitespace-nowrap p-2 text-muted-foreground">{x.first ? formatMoney(x.first, x.c.currency, lang) : "—"}</td>
                <td className="num whitespace-nowrap p-2 text-muted-foreground">{x.last ? formatMoney(x.last, x.c.currency, lang) : "—"}</td>
                <td className={`num whitespace-nowrap p-2 ${x.change == null ? "text-muted-foreground" : x.change >= 0 ? "text-primary" : "text-negative"}`}>{x.change == null ? t("cmp.h.na") : `${x.change >= 0 ? "+" : ""}${x.change.toFixed(1)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">{t("cmp.ai.title")}</h3>
        <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void run(); }}>
          <Textarea value={question} maxLength={500} rows={2} disabled={busy} onChange={(e) => setQuestion(e.target.value)} placeholder={t("cmp.ai.placeholder")} className="flex-1" />
          <Button type="submit" disabled={busy || loading}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t("hc.ask.analyzing")}</> : t("cmp.ai.button")}
          </Button>
        </form>
        {busy && <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{t("cmp.ai.wait")}</p>}
        {error && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-negative/40 bg-negative/10 p-3 text-sm text-negative">
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => void run()}>{t("common.retry")}</Button>
          </div>
        )}
        {answer && <div className="prose prose-sm mt-3 max-w-none text-foreground"><ReactMarkdown>{answer}</ReactMarkdown></div>}
      </div>
    </section>
  );
}
