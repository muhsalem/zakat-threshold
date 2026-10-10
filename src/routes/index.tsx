import { ShareDailyNisab } from "@/components/site/ShareDailyNisab";
import { InvitationCard } from "@/components/site/InvitationCard";
import { DailyComparison, DailyNisabStatus, useDailyNisab } from "@/components/site/DailyNisabStatus";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useI18n } from "@/lib/i18n";
import { GOLD_NISAB_G, KARATS, SILVER_NISAB_G, formatNumber } from "@/lib/nisab";
import { usePrices } from "@/lib/use-prices";

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
  const { t } = useI18n();
  const { values, money, isLoading, isError, refetch, currency, data, priceSource } = useNisab();
  const daily = useDailyNisab();
  const { isFetching } = usePrices();
  const sourceAt = priceSource?.gold === "local" || priceSource?.silver === "local" ? priceSource.at : data?.metalsUpdatedAt;

  return (
    <div className="nisab-home mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <ManualNotice />
      <NisabAlert value={values?.lower} />

      <section className="rise home-intro">
        <p className="home-eyebrow flex items-center gap-3 text-sm font-medium text-primary"><span className="h-px w-8 bg-accent" aria-hidden="true" />{t("hero.eyebrow")}</p>
        <h1 className="home-title mt-3 max-w-4xl text-3xl font-semibold text-foreground sm:text-4xl">
          {t("hero.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-8 text-muted-foreground">{t("hero.sub")}</p>
        <div className="home-controls mt-5 grid max-w-2xl gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0"><CountryPicker /></div>
          <div className="min-w-0"><CityPicker /></div>
        </div>
      </section>

      <div className="mt-5"><DailyNisabStatus daily={daily} at={sourceAt} fetchedAt={data?.fetchedAt} manual={Boolean(data?.manual)} fetching={isFetching} /></div>

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
                grams: GOLD_NISAB_G,
                total: values.gold,
                gram: values.goldGram,
                lower: values.gold <= values.silver,
                  kind: "gold" as const,
                 Icon: Coins,
              },
              {
                label: t("nisab.silver"),
                metal: t("silver"),
                grams: SILVER_NISAB_G,
                total: values.silver,
                gram: values.silverGram,
                lower: values.silver < values.gold,
                  kind: "silver" as const,
                 Icon: Gem,
              },
            ].map((c) => (
              <article key={c.label} className={`nisab-summary nisab-summary-${c.kind} rise min-w-0 rounded-lg border border-border p-5 sm:p-7`}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="metal-symbol grid size-11 shrink-0 place-items-center rounded-lg"><c.Icon className="size-5" aria-hidden="true" /></span>
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
                <p className="num nisab-total mt-6 text-3xl font-medium text-foreground sm:text-4xl">{money(c.total)}</p>
                <p className="mt-5 border-t border-border pt-3 text-sm text-muted-foreground">
                  {t("perGram")}: <span className="num">{money(c.gram)}</span>
                </p>
                <DailyComparison current={c.total} metal={c.kind} money={money} daily={daily} />
              </article>
            ))}
          </section>

          <section className="mt-5 border-y border-border py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t("ratio.label")}</p>
              <p className="num text-xl text-foreground">{formatNumber(values.ratio, 1)}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("ratio.note")}</p>
          </section>

          <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
            <Clock3 className="mt-0.5 size-4 text-primary" aria-hidden="true" /><AsOf className="home-update min-w-0" />
          </div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5"><ShieldCheck className="mt-1 size-4 text-muted-foreground" aria-hidden="true" /><Disclaimer className="leading-6" /></div>
          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button asChild className="h-auto min-h-16 justify-start whitespace-normal px-5 py-4"><Link to="/calculator"><Calculator aria-hidden="true" /><span className="min-w-0"><strong className="block font-medium">{t("home.cta.calc")}</strong><small className="mt-1 block opacity-75">{t("home.cta.calcSub")}</small></span></Link></Button>
            <Button asChild variant="outline" className="h-auto min-h-16 justify-start whitespace-normal px-5 py-4"><Link to="/history"><ChartNoAxesCombined aria-hidden="true" /><span className="min-w-0"><strong className="block font-medium">{t("home.cta.history")}</strong><small className="mt-1 block text-muted-foreground">{t("home.cta.historySub")}</small></span></Link></Button>
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
          <div className="mt-4"><ShareDailyNisab values={values} money={money} /></div>
        </>
      )}

      <div className="mt-8"><InvitationCard /></div>

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
