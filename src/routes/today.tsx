import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleCheck, Database, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { CityPicker, CountryPicker } from "@/components/site/Shell";
import {
  AsOf,
  Disclaimer,
  LocalMarket,
  ManualNotice,
  SourceQuality,
  StateNote,
  UpdateMeta,
  priceStrings,
  useNisab,
  type PricePreference,
} from "@/components/site/Prices";
import { HawlReminder } from "@/components/site/Reminders";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { SILVER_NISAB_G, TROY_OUNCE_G, formatNumber } from "@/lib/nisab";
import { goldWeightFor } from "@/lib/nisab-valuation";
import { useOfficialThreshold } from "@/lib/use-official-threshold";
import { resolveCalculatorThreshold } from "@/lib/calculator-threshold";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "نصاب الزكاة اليوم عالميًا · نِصاب" },
      {
        name: "description",
        content:
          "قيمة نصاب الذهب والفضة اليوم بعملة بلدك، مع سعر الجرام والمعادلة والمصدر ووقت التحديث.",
      },
      { property: "og:title", content: "نصاب الزكاة اليوم عالميًا · نِصاب" },
      {
        property: "og:description",
        content: "نصاب الذهب ٨٥غ والفضة ٥٩٥غ يوميًا بعملتك المحلية وبمصدر قابل للتتبع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { t, country, currency, lang } = useI18n();
  const [prefer, setPrefer] = useState<PricePreference>("local");
  const ps = priceStrings(lang);
  const { values, data, rate, money, isLoading, isError, refetch, silverWeight } = useNisab(prefer);
  const [utcDay, setUtcDay] = useState("");
  useEffect(() => {
    const tick = () => setUtcDay(new Date().toISOString().slice(0, 10));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const officialQuery = useOfficialThreshold(country, currency, utcDay);
  const thresholds = {
    gold: resolveCalculatorThreshold({ official: officialQuery.data, country, currency, day: utcDay, metal: "gold", calculated: values?.gold }),
    silver: resolveCalculatorThreshold({ official: officialQuery.data, country, currency, day: utcDay, metal: "silver", calculated: values?.silver }),
  };
  const announcement = thresholds.gold.official ?? thresholds.silver.official;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <ManualNotice />
      <header className="grid items-end gap-7 border-b border-border pb-8 lg:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <p className="eyebrow text-accent">{t("today.eyebrow")}</p>
          <h1 className="mt-3 text-4xl leading-tight text-foreground sm:text-5xl">
            {t("today.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("today.sub")}</p>
          <div
            role="group"
            className="mt-4 inline-flex rounded-lg border border-border bg-card p-1 text-sm"
          >
            {(["local", "global"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                aria-pressed={prefer === p}
                onClick={() => setPrefer(p)}
                className={`rounded-md px-3 py-1.5 ${prefer === p ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
              >
                {p === "local" ? ps.toggleLocal : ps.toggleGlobal}
              </Button>
            ))}
          </div>
          <AsOf className="mt-4" prefer={prefer} />
        </div>
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <CountryPicker compact />
          <CityPicker />
        </div>
      </header>

      {announcement && (
        <section className="mt-6 border-y border-primary py-5" aria-live="polite" data-testid="today-official-announcement">
          <h2 className="text-lg font-semibold text-primary">{lang === "ar" ? "إعلان النصاب الرسمي" : "Official nisab announcement"}</h2>
          <p className="mt-2 text-sm">{announcement.authority} · <time dateTime={announcement.announced_on} className="num">{announcement.announced_on} UTC</time></p>
          <dl className="mt-3 flex flex-wrap gap-6">
            {(["gold", "silver"] as const).map((metal) => thresholds[metal].origin === "official" && (
              <div key={metal}><dt className="text-sm text-muted-foreground">{t(`nisab.${metal}`)}</dt><dd className="num text-2xl" data-testid={`today-official-${metal}`}>{money(thresholds[metal].value ?? 0)}</dd></div>
            ))}
          </dl>
          {announcement.source_url?.startsWith("https://") && <a className="mt-3 inline-block text-sm text-primary underline" href={announcement.source_url} target="_blank" rel="noopener noreferrer">{lang === "ar" ? "مصدر الإعلان الرسمي" : "Official announcement source"}</a>}
        </section>
      )}
      {officialQuery.isError && <p role="alert" className="mt-4 text-sm text-destructive">{lang === "ar" ? "تعذّر التحقق من الإعلان الرسمي؛ القيم المحسوبة مبنية على أسعار المعادن." : "Official announcement unavailable; calculated values use metal prices."}</p>}

      {(isLoading || isError) && (
        <div className="mt-8">
          <StateNote isLoading={isLoading} isError={isError} refetch={refetch} />
        </div>
      )}

      {values && data && (
        <>
          <section className="mt-8 grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-2">
            {[
              {
                key: "gold",
                title: t("nisab.gold"),
                grams: goldWeightFor(silverWeight),
                gram: values.goldGram,
                total: thresholds.gold.value ?? values.gold,
                official: thresholds.gold.official,
                oz: data.goldUsdOz,
              },
              {
                key: "silver",
                title: t("nisab.silver"),
                grams: silverWeight,
                gram: values.silverGram,
                total: thresholds.silver.value ?? values.silver,
                official: thresholds.silver.official,
                oz: data.silverUsdOz,
              },
            ].map((item, index) => (
              <article
                key={item.key}
                className={`p-6 sm:p-8 ${index === 1 ? "border-t border-border lg:border-s lg:border-t-0" : ""}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="eyebrow text-muted-foreground">{item.title}</p>
                  <span className="num rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    {item.grams}g
                  </span>
                </div>
                <p className="num mt-8 text-4xl text-foreground sm:text-5xl">{money(item.total)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.official ? (lang === "ar" ? "النصاب الرسمي المعلن" : "Official announced threshold") : (lang === "ar" ? "نصاب محسوب من سعر المعدن" : "Calculated from metal price")}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("perGram")}</p>
                    <p className="num mt-1 text-foreground">{money(item.gram)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("today.weight")}</p>
                    <p className="num mt-1 text-foreground">{item.grams} g</p>
                  </div>
                </div>
                <details className="mt-5 border-t border-border pt-4 text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">
                    {t("country.how")}
                  </summary>
                  <p className="num mt-3 leading-7 text-muted-foreground">
                    {item.official ? `${item.official.authority} · ${item.official.announced_on} UTC` : `${money(item.gram)} / g × ${item.grams}g = ${money(item.total)}`}
                  </p>
                </details>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {[
              { icon: Database, title: t("today.trace.source"), body: data.metalsSource },
              {
                icon: CircleCheck,
                title: t("today.trace.status"),
                body: data.manual ? t("update.manual") : t("update.auto"),
              },
              {
                icon: ShieldCheck,
                title: t("today.trace.method"),
                body: t("today.trace.methodBody"),
              },
            ].map((item) => (
              <div key={item.title} className="bg-card p-5">
                <item.icon aria-hidden="true" className="size-5 text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </section>
          <LocalMarket />
          <SourceQuality />
          <HawlReminder />
          <UpdateMeta />
        </>
      )}

      <section className="brand-panel mt-8 flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex gap-4">
          <Scale aria-hidden="true" className="mt-1 size-6 shrink-0 text-goldlight" />
          <div>
            <h2 className="text-xl">{t("today.notZakat")}</h2>
            <p className="mt-1 max-w-2xl text-sm opacity-80">{t("today.notZakatBody")}</p>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/methodology">
            {t("nav.methodology")}
            <ArrowLeft />
          </Link>
        </Button>
      </section>
      <Disclaimer className="mt-5" />
    </div>
  );
}
