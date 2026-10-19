import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, LineChart, Scale, TrendingUp } from "lucide-react";

import { Page } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { ANNUAL_METALS } from "@/lib/long-history";
import { formatNumber } from "@/lib/nisab";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/outlook")({
  head: () => ({
    meta: [
      { title: "تقييم اقتصادي لسعر الذهب والفضة · نِصاب" },
      {
        name: "description",
        content:
          "قراءة اقتصادية لأسعار الذهب والفضة من ١٩٢٥ حتى اليوم: النمو السنوي المركب، التقلب، نسبة الذهب إلى الفضة، وسيناريوهات مستقبلية استرشادية.",
      },
      { property: "og:title", content: "تقييم اقتصادي لسعر الذهب والفضة" },
      {
        property: "og:description",
        content:
          "النمو المركب والتقلب ونسبة الذهب/الفضة عبر قرن كامل، مع سيناريوهات متحفظة وأساسية ومتفائلة.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OutlookPage,
});

type Metal = "gold" | "silver";

const SERIES = [...ANNUAL_METALS].sort((a, b) => a.year - b.year);
const LATEST = SERIES[SERIES.length - 1]!;

function valueAt(yearsAgo: number, metal: Metal): number | null {
  const target = LATEST.year - yearsAgo;
  const point = SERIES.find((p) => p.year === target);
  return point ? point[metal] : null;
}

function cagr(yearsAgo: number, metal: Metal): number | null {
  const start = valueAt(yearsAgo, metal);
  if (!start || start <= 0) return null;
  return (Math.pow(LATEST[metal] / start, 1 / yearsAgo) - 1) * 100;
}

/** Standard deviation of annual percentage moves over the last `span` years. */
function volatility(span: number, metal: Metal): number {
  const window = SERIES.slice(-(span + 1));
  const moves: number[] = [];
  for (let i = 1; i < window.length; i += 1) {
    const prev = window[i - 1]?.[metal];
    const now = window[i]?.[metal];
    if (prev && now) moves.push(((now - prev) / prev) * 100);
  }
  if (moves.length === 0) return 0;
  const mean = moves.reduce((a, b) => a + b, 0) / moves.length;
  // Sample (n-1) standard deviation.
  const variance = moves.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, moves.length - 1);
  return Math.sqrt(variance);
}

/** Deepest peak-to-trough fall in the annual series over `span` years. */
function drawdown(span: number, metal: Metal): number {
  const window = SERIES.slice(-(span + 1));
  let peak = 0;
  let worst = 0;
  for (const point of window) {
    peak = Math.max(peak, point[metal]);
    if (peak > 0) worst = Math.min(worst, ((point[metal] - peak) / peak) * 100);
  }
  return worst;
}

const HORIZONS = [10, 20, 30, 50, 100];
/** Gold was officially fixed (not a market price) up to and including 1971. */
const OFFICIAL_UNTIL = 1971;

function OutlookPage() {
  const { t } = useI18n();
  const [metal, setMetal] = useState<Metal>("gold");

  const stats = useMemo(() => {
    const ratio = LATEST.gold / LATEST.silver;
    const ratios = SERIES.slice(-50).map((p) => p.gold / p.silver);
    const ratioAvg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return {
      ratio,
      ratioAvg,
      vol20: volatility(20, metal),
      vol50: volatility(50, metal),
      dd50: drawdown(50, metal),
      cagr20: cagr(20, metal) ?? 0,
      cagr50: cagr(50, metal) ?? 0,
    };
  }, [metal]);

  return (
    <Page eyebrow={t("o.eyebrow")} title={t("o.title")} sub={t("o.sub")}>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "gold", label: t("o.gold") },
            { key: "silver", label: t("o.silver") },
          ] as const
        ).map((option) => (
          <Button
            key={option.key}
            size="sm"
            variant={metal === option.key ? "default" : "outline"}
            onClick={() => setMetal(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <section className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: TrendingUp,
            title: `${t("o.price")} · ${LATEST.year}`,
            value: `${formatNumber(LATEST[metal], 2)} USD/oz`,
          },
          {
            icon: LineChart,
            title: t("o.cagr20"),
            value: `${formatNumber(stats.cagr20, 2)}%`,
          },
          {
            icon: Activity,
            title: t("o.vol20"),
            value: `${formatNumber(stats.vol20, 1)}%`,
          },
          {
            icon: Scale,
            title: t("o.ratio"),
            value: `${formatNumber(stats.ratio, 1)} : 1`,
          },
        ].map((item) => (
          <div key={item.title} className="bg-card p-5">
            <item.icon aria-hidden="true" className="size-5 text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">{item.title}</p>
            <p className="num mt-1 text-xl text-foreground">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl text-foreground">{t("o.cagrTable")}</h2>
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-3 text-start font-medium">{t("o.period")}</th>
                <th className="p-3 text-start font-medium">{t("o.start")}</th>
                <th className="p-3 text-start font-medium">{t("o.today")}</th>
                <th className="p-3 text-start font-medium">{t("o.multiple")}</th>
                <th className="p-3 text-start font-medium">{t("o.cagr")}</th>
              </tr>
            </thead>
            <tbody>
              {HORIZONS.map((years) => {
                const start = valueAt(years, metal);
                const growth = cagr(years, metal);
                return (
                  <tr key={years} className="border-b border-border last:border-0">
                    <td className="p-3 text-foreground">
                      {years} {t("o.years")}
                    </td>
                    <td className="num p-3 text-muted-foreground">
                      {start ? formatNumber(start, 2) : "—"}
                      {start && metal === "gold" && LATEST.year - years <= OFFICIAL_UNTIL
                        ? " †"
                        : ""}
                    </td>
                    <td className="num p-3 text-muted-foreground">
                      {formatNumber(LATEST[metal], 2)}
                    </td>
                    <td className="num p-3 text-muted-foreground">
                      {start ? `${formatNumber(LATEST[metal] / start, 1)}×` : "—"}
                    </td>
                    <td className="num p-3 text-foreground">
                      {growth === null ? "—" : `${formatNumber(growth, 2)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="card-surface p-6">
          <h3 className="text-lg text-foreground">{t("o.trend")}</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("o.trendBody")}</p>
        </article>
        <article className="card-surface p-6">
          <h3 className="text-lg text-foreground">{t("o.volTitle")}</h3>
          <p className="num mt-2 text-sm leading-7 text-muted-foreground">
            σ 20y: {formatNumber(stats.vol20, 1)}% · σ 50y: {formatNumber(stats.vol50, 1)}% · max
            drawdown: {formatNumber(Math.abs(stats.dd50), 0)}%
          </p>
        </article>
        <article className="card-surface p-6">
          <h3 className="text-lg text-foreground">{t("o.ratioTitle")}</h3>
          <p className="num mt-2 text-sm leading-7 text-muted-foreground">
            {formatNumber(stats.ratio, 1)} : 1 (50y avg {formatNumber(stats.ratioAvg, 1)}).
            {t("o.ratioBody")}
          </p>
        </article>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg text-foreground">{t("o.up")}</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted-foreground">
            <li>{t("o.up1")}</li>
            <li>{t("o.up2")}</li>
            <li>{t("o.up3")}</li>
            <li>{t("o.up4")}</li>
          </ul>
        </article>
        <article className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg text-foreground">{t("o.down")}</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted-foreground">
            <li>{t("o.down1")}</li>
            <li>{t("o.down2")}</li>
            <li>{t("o.down3")}</li>
            <li>{t("o.down4")}</li>
          </ul>
        </article>
      </section>

      <section className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg text-foreground">{t("o.dataTitle")}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
          {t("o.dataBody").replace("{year}", String(LATEST.year))}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t("o.officialNote")}</p>
      </section>

      <section className="mt-10 border-s-2 border-accent bg-card p-6">
        <h2 className="text-xl text-foreground">{t("o.impact")}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-8 text-muted-foreground">
          {t("o.impactBody")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/history">{t("nav.history")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/methodology">{t("nav.methodology")}</Link>
          </Button>
        </div>
      </section>

      <p className="mt-8 rounded-lg border border-border bg-secondary p-5 text-sm leading-7 text-secondary-foreground">
        {t("o.disclaimer")}
      </p>
    </Page>
  );
}
