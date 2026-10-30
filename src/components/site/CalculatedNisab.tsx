import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNisab, priceStrings } from "@/components/site/Prices";
import { useI18n } from "@/lib/i18n";
import { goldWeightFor } from "@/lib/nisab-valuation";
import { isCurrentUtcDay } from "@/lib/daily-nisab";
import { useEffect, useState } from "react";

export function CalculatedNisab({ onRefresh, refreshing = false }: { onRefresh?: () => void; refreshing?: boolean } = {}) {
  const { t, lang } = useI18n();
  const { values, money, silverWeight, priceSource, data, quote, refetch, isFetching, localError } = useNisab();
  const [day, setDay] = useState("");
  useEffect(() => {
    const tick = () => setDay(new Date().toISOString().slice(0, 10));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const ar = lang === "ar";
  const labels = priceStrings(lang);
  const busy = isFetching || refreshing;
  return (
    <section className="mb-6 border-y border-border py-5" aria-labelledby="calculated-nisab-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="calculated-nisab-title" className="text-xl">{ar ? "نصاب الزكاة المحسوب" : "Calculated zakat threshold"}</h2>
        <Button size="icon" variant="outline" disabled={busy} aria-label={ar ? "تحديث أسعار النصاب" : "Refresh nisab prices"} title={ar ? "تحديث أسعار النصاب" : "Refresh nisab prices"} onClick={() => { if (onRefresh) onRefresh(); else void refetch(); }}><RefreshCw className={`size-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} /></Button>
      </div>
      {!values && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>}
      {localError && <p role="alert" className="mt-3 text-sm text-destructive">{ar ? "تعذّر التحقق من السعر المحلي؛ راجع المصدر المعروض قبل الحساب." : "Local price check failed; verify the displayed source before calculation."}</p>}
      {values && <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {(["gold", "silver"] as const).map(metal => {
          const grams = metal === "gold" ? goldWeightFor(silverWeight) : silverWeight;
          const gram = metal === "gold" ? values.goldGram : values.silverGram;
          const origin = priceSource?.[metal];
          const at = origin === "manual" ? data?.manualUpdatedAt : origin === "local" ? quote?.at : data?.metalsUpdatedAt;
          const source = origin === "manual" ? labels.manual : origin === "local" ? `${labels.local} · ${quote?.source ?? ""}` : `${labels.global} · ${data?.metalsSource ?? ""}`;
          return <div key={metal} className="min-w-0">
            <h3 className="text-sm text-muted-foreground">{t(`nisab.${metal}`)} · <span className="num">{grams}</span> {t("grams")}</h3>
            <p className="num mt-2 text-2xl font-semibold" aria-live="polite" data-testid={`calculator-nisab-${metal}`}>{money(values[metal])}</p>
            <p className="num mt-1 text-xs text-muted-foreground">{grams} × {money(gram)} = {money(values[metal])}</p>
            <p className="mt-2 break-words text-xs text-muted-foreground">{source}</p>
            <p className="mt-1 text-xs text-muted-foreground">{at ? `${new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(at))} UTC` : "—"} · {origin === "manual" ? labels.manual : at && day && isCurrentUtcDay(at, day) ? (ar ? "محدّث اليوم" : "Updated today") : (ar ? "ليس من اليوم" : "Not from today")}</p>
          </div>;
        })}
      </div>}
    </section>
  );
}