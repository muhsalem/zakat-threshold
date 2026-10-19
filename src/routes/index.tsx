import { ShareDailyNisab } from "@/components/site/ShareDailyNisab";
import { NisabHistoryChart } from "@/components/site/NisabHistoryChart";
import { InvitationCard } from "@/components/site/InvitationCard";
import {
  DailyComparison,
  DailyNisabStatus,
  useDailyNisab,
} from "@/components/site/DailyNisabStatus";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calculator, ChartNoAxesCombined, Coins, Gem, ShieldCheck, Clock3 } from "lucide-react";

import { CityPicker, CountryPicker } from "@/components/site/Shell";
import {
  AsOf,
  CityPriceCheck,
  Disclaimer,
  ManualNotice,
  NisabAlert,
  LocalMarket,
  SourceQuality,
  StateNote,
  UpdateMeta,
  useNisab,
} from "@/components/site/Prices";
import { HawlReminder } from "@/components/site/Reminders";
import { formatHijri, today } from "@/lib/hijri";
import { useI18n } from "@/lib/i18n";
import { KARATS, SILVER_NISAB_G, formatNumber } from "@/lib/nisab";
import { goldWeightFor } from "@/lib/nisab-valuation";
import { usePrices } from "@/lib/use-prices";
import { homeCopy } from "@/lib/home-copy";
import { countryName, findCountry, flagOf } from "@/lib/countries";
import { isCurrentUtcDay } from "@/lib/daily-nisab";
import { useSilverStandard } from "@/lib/use-silver-standard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نِصاب · قيمة نصاب الذهب والفضّة اليوم" },
      {
        name: "description",
        content:
          "احسب نصاب الزكاة اليوم بأسعار الذهب والفضّة الحيّة، بعملة بلدك، مع جدول العيارات.",
      },
      { property: "og:title", content: "نِصاب · قيمة نصاب الذهب والفضّة اليوم" },
      {
        property: "og:description",
        content: "نصاب الذهب ٨٥ جراماً والفضّة ٥٩٥ جراماً، محسوباً يومياً بعملة بلدك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const TYPES = ["cash", "gold", "trade", "crops", "livestock", "fitr"] as const;

function Home() {
  const { t, lang, country } = useI18n();
  // Client-only: the visitor's local day, not the server's.
  const [hijri, setHijri] = useState("");
  useEffect(() => setHijri(formatHijri(today(), lang)), [lang]);
  const s = homeCopy(lang);
  const countryTitle = countryName(findCountry(country), lang);
  const { weight, setWeight } = useSilverStandard();
  const {
    values,
    money,
    isLoading,
    isError,
    refetch,
    currency,
    data,
    priceSource,
    quote,
    silverWeight,
    localFetching,
    localError,
    localCheckedAt,
  } = useNisab();
  const daily = useDailyNisab();
  const { isFetching } = usePrices();
  const sourceAt =
    priceSource?.gold === "local" || priceSource?.silver === "local"
      ? priceSource.at
      : data?.metalsUpdatedAt;

  return (
    <div className="nisab-home mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <ManualNotice />
      <NisabAlert value={values?.lower} />

      <section className="rise home-intro">
        <p className="home-eyebrow flex items-center gap-3 text-sm font-medium text-primary">
          <span className="h-px w-8 bg-accent" aria-hidden="true" />
          {t("hero.eyebrow")}
          {hijri && <span className="num"> · {hijri}</span>}
        </p>
        <h1 className="home-title mt-3 max-w-4xl text-3xl font-semibold text-foreground sm:text-4xl">
          {s.now} <span className="text-primary">· {countryTitle}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-8 text-muted-foreground">{t("hero.sub")}</p>
        <div className="home-controls mt-5 grid max-w-2xl gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <CountryPicker />
          </div>
          <div className="min-w-0">
            <CityPicker />
          </div>
        </div>
      </section>

      <div className="mt-5">
        <DailyNisabStatus
          daily={daily}
          at={sourceAt}
          fetchedAt={localCheckedAt ?? data?.fetchedAt}
          manual={Boolean(data?.manual)}
          fetching={isFetching || localFetching}
        />
      </div>
      {localError && (
        <p role="alert" className="mt-2 text-sm text-negative">
          {s.unavailable}
        </p>
      )}

      {(isLoading || isError) && (
        <div className="mt-8">
          <StateNote isLoading={isLoading} isError={isError} refetch={refetch} />
        </div>
      )}

      {values && (
        <>
          <section className="mt-7 grid gap-4 md:grid-cols-2">
            {[
              {
                label: t("nisab.gold"),
                metal: t("gold"),
                grams: goldWeightFor(silverWeight),
                total: values.gold,
                gram: values.goldGram,
                lower: values.gold <= values.silver,
                kind: "gold" as const,
                Icon: Coins,
              },
              {
                label: t("nisab.silver"),
                metal: t("silver"),
                grams: silverWeight,
                total: values.silver,
                gram: values.silverGram,
                lower: values.silver < values.gold,
                kind: "silver" as const,
                Icon: Gem,
              },
            ].map((c) => (
              <article
                key={c.label}
                className={`nisab-summary nisab-summary-${c.kind} rise min-w-0 rounded-lg border border-border p-5 sm:p-7`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="metal-symbol grid size-11 shrink-0 place-items-center rounded-lg">
                      <c.Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-foreground">{c.label}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="num">{c.grams}</span> {t("grams")} · {c.metal}
                      </p>
                    </div>
                  </div>
                  {c.lower && (
                    <span className="max-w-28 rounded-md border border-border bg-card/70 px-2 py-1 text-center text-xs leading-5 text-primary">
                      {t("home.lower")}
                    </span>
                  )}
                </div>
                <p
                  className="num nisab-total mt-6 text-3xl font-medium text-foreground sm:text-4xl"
                  aria-live="polite"
                  data-testid={`nisab-total-${c.kind}`}
                >
                  {money(c.total)}
                </p>
                <p className="mt-2 text-xs text-primary">
                  {flagOf(country)} {countryTitle} · {currency}
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {priceSource?.[c.kind] === "manual"
                    ? s.manual
                    : priceSource?.[c.kind] === "local"
                      ? `${s.local} · ${quote?.source ?? ""}`
                      : s.global}
                </p>
                {(() => {
                  const at =
                    priceSource?.[c.kind] === "local"
                      ? quote?.at
                      : priceSource?.[c.kind] === "manual"
                        ? data?.manualUpdatedAt
                        : data?.metalsUpdatedAt;
                  const ar = lang === "ar" || lang === "ur";
                  const fresh = at && daily.window && isCurrentUtcDay(at, daily.window.today);
                  const st = !at
                    ? { cls: "bg-negative", l: ar ? "غير متوفر" : "Unavailable" }
                    : fresh
                      ? { cls: "bg-primary", l: ar ? "متوفر · محدّث اليوم" : "Available · today" }
                      : { cls: "bg-accent", l: ar ? "متوفر · قديم" : "Available · stale" };
                  const src =
                    priceSource?.[c.kind] === "manual"
                      ? s.manual
                      : priceSource?.[c.kind] === "local"
                        ? s.local
                        : s.global;
                  return (
                    <p
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-card/70 px-2 py-1 text-xs text-foreground"
                      data-testid={`status-${c.kind}`}
                    >
                      <span className={`size-2 rounded-full ${st.cls}`} aria-hidden="true" />
                      {st.l} · {src}
                    </p>
                  );
                })()}
                <p className="text-xs leading-6 text-muted-foreground">
                  {s.updated}:{" "}
                  {(() => {
                    const at =
                      priceSource?.[c.kind] === "local"
                        ? quote?.at
                        : priceSource?.[c.kind] === "manual"
                          ? data?.manualUpdatedAt
                          : data?.metalsUpdatedAt;
                    return at
                      ? `${new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(at))} UTC · ${daily.window && isCurrentUtcDay(at, daily.window.today) ? s.today : s.older}`
                      : "—";
                  })()}
                </p>
                <p className="mt-5 border-t border-border pt-3 text-sm text-muted-foreground">
                  {t("perGram")}: <span className="num">{money(c.gram)}</span>
                </p>
                {c.kind === "silver" && silverWeight !== SILVER_NISAB_G ? (
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    {s.history}
                  </p>
                ) : (
                  <DailyComparison current={c.total} metal={c.kind} money={money} daily={daily} />
                )}
              </article>
            ))}
          </section>

          <NisabHistoryChart money={money} />
          <div className="mt-5">
            <ShareDailyNisab
              values={values}
              money={money}
              silverWeight={silverWeight}
              day={daily.window?.today}
              sources={(["gold", "silver"] as const)
                .map((metal) => {
                  const origin = priceSource?.[metal];
                  const label =
                    origin === "manual"
                      ? s.manual
                      : origin === "local"
                        ? `${s.local}: ${quote?.source ?? "—"}`
                        : `${s.global}: ${data?.metalsSource ?? "—"}`;
                  const at =
                    origin === "manual"
                      ? data?.manualUpdatedAt
                      : origin === "local"
                        ? quote?.at
                        : data?.metalsUpdatedAt;
                  return `${t(metal)} · ${label} · ${s.updated}: ${at ?? "—"}`;
                })
                .join("\n")}
            />
          </div>
          <section className="mt-5 border-b border-border pb-5">
            <label className="flex flex-wrap items-center gap-3 text-sm text-foreground">
              <span>{s.standard}</span>
              <select
                aria-label={s.standard}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="rounded-lg border border-input bg-card px-3 py-2"
              >
                <option value={595}>595 g</option>
                <option value={612.36}>612.36 g · {s.alternative}</option>
              </select>
            </label>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">{s.basis}</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {s.note}{" "}
              <Link to="/methodology" className="text-primary underline underline-offset-4">
                {t("nav.fiqh")}
              </Link>
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-start font-normal">{t("karat.title")}</th>
                    <th className="py-2 text-start font-normal">{s.bid}</th>
                    <th className="py-2 text-start font-normal">{s.ask}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: `${t("gold")} 24K`, bid: quote?.buybackGram, ask: quote?.goldGram },
                    {
                      label: `${t("silver")} 999`,
                      bid: quote?.silverBuybackGram,
                      ask: quote?.silverGram,
                    },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border">
                      <td className="py-3">{row.label}</td>
                      <td className="num py-3">{row.bid == null ? s.unknown : money(row.bid)}</td>
                      <td className="num py-3">{row.ask == null ? s.unknown : money(row.ask)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-5 border-y border-border py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t("ratio.label")}</p>
              <p className="num text-xl text-foreground">{formatNumber(values.ratio, 1)}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("ratio.note")}</p>
            {values.gold > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("ratio.gap")
                  .replace("{pct}", formatNumber((values.silver / values.gold) * 100, 0))
                  .replace("{ratio}", formatNumber(values.ratio, 0))}
              </p>
            )}
          </section>

          <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
            <Clock3 className="mt-0.5 size-4 text-primary" aria-hidden="true" />
            <AsOf className="home-update min-w-0" />
          </div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
            <ShieldCheck className="mt-1 size-4 text-muted-foreground" aria-hidden="true" />
            <Disclaimer className="leading-6" />
          </div>
          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button asChild className="h-auto min-h-16 justify-start whitespace-normal px-5 py-4">
              <Link to="/calculator">
                <Calculator aria-hidden="true" />
                <span className="min-w-0">
                  <strong className="block font-medium">{t("home.cta.calc")}</strong>
                  <small className="mt-1 block opacity-75">{t("home.cta.calcSub")}</small>
                </span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-16 justify-start whitespace-normal px-5 py-4"
            >
              <Link to="/history">
                <ChartNoAxesCombined aria-hidden="true" />
                <span className="min-w-0">
                  <strong className="block font-medium">{t("home.cta.history")}</strong>
                  <small className="mt-1 block text-muted-foreground">
                    {t("home.cta.historySub")}
                  </small>
                </span>
              </Link>
            </Button>
          </section>

          <section className="scroll-x mt-8 border-y border-border py-6">
            <h2 className="text-xl text-foreground">{t("karat.title")}</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="text-start">
                  <th className="py-2 text-start font-normal">{t("karat.title")}</th>
                  <th className="py-2 text-start font-normal">{t("karat.purity")}</th>
                  <th className="py-2 text-start font-normal">{t("karat.price")}</th>
                </tr>
              </thead>
              <tbody>
                {KARATS.map((k) => (
                  <tr key={k.k} className="border-t border-border">
                    <td className="num py-2.5 text-foreground">{k.k}K</td>
                    <td className="num py-2.5 text-muted-foreground">
                      {(k.purity * 100).toFixed(1)}%
                    </td>
                    <td className="num py-2.5 text-foreground">
                      {money(values.goldGram * k.purity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("common.source")} · {currency}
            </p>
          </section>

          <CityPriceCheck />
          <LocalMarket />
          <SourceQuality />
          <HawlReminder />
          <UpdateMeta />
        </>
      )}

      <div className="mt-8">
        <InvitationCard />
      </div>

      <section className="mt-12">
        <h2 className="text-2xl text-foreground">{t("types.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("home.types.sub")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TYPES.map((k) => (
            <article key={k} className="card-surface p-5">
              <h3 className="text-lg text-foreground">{t(`types.${k}.t`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`types.${k}.d`)}</p>
            </article>
          ))}
        </div>
        <Link
          to="/types"
          className="mt-5 inline-block text-sm text-foreground underline underline-offset-4"
        >
          {t("types.all")}
        </Link>
      </section>
    </div>
  );
}
