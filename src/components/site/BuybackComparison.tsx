import { useNisab } from "./Prices";
import { useI18n } from "@/lib/i18n";
import { comparePublishedBuyback, goldWeightFor } from "@/lib/nisab-valuation";

export function BuybackComparison({ goldThreshold, silverThreshold, officialGold, officialSilver }: { goldThreshold: number | null; silverThreshold: number | null; officialGold: boolean; officialSilver: boolean }) {
  const { lang } = useI18n();
  const { quote, silverWeight, money } = useNisab();
  const ar = lang === "ar";
  const rows = [
    { metal: "gold", name: ar ? "الذهب الخالص · عيار 24" : "Pure gold · 24K", weight: goldWeightFor(silverWeight), bid: quote?.buybackGram, threshold: goldThreshold, official: officialGold },
    { metal: "silver", name: ar ? "الفضة الخالصة · 999" : "Pure silver · 999", weight: silverWeight, bid: quote?.silverBuybackGram, threshold: silverThreshold, official: officialSilver },
  ];
  return (
    <section className="mt-8 border-y border-border py-6" data-testid="buyback-comparison">
      <h2 className="text-xl text-foreground">{ar ? "سعر شراء الصاغة مقارنة بنصاب الزكاة" : "Jeweller purchase prices versus nisab"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{ar ? "ما تدفعه الصاغة لك عند شراء المعدن الخالص، دون المصنعية؛ السعر المنشور ليس ضمانًا لسعر كل محل." : "Published dealer bids for pure metal, excluding making charges; individual shops may differ."}</p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {rows.map((row) => {
          const comparison = comparePublishedBuyback(row.bid, row.weight, row.threshold);
          return <article key={row.metal} className="min-w-0" data-testid={`buyback-${row.metal}`}>
            <h3 className="font-semibold">{row.name}</h3>
            {comparison ? <>
              <p className="num mt-3 text-2xl text-primary">{money(comparison.gram)} <span className="text-sm text-muted-foreground">/ {ar ? "جم" : "g"}</span></p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><dt>{ar ? "حصيلة بيع وزن النصاب" : "Proceeds for nisab weight"} · {row.weight}g</dt><dd className="num">{money(comparison.proceeds)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt>{row.official ? (ar ? "النصاب الرسمي" : "Official nisab") : (ar ? "النصاب المحسوب المعروض" : "Displayed calculated nisab")}</dt><dd className="num">{comparison.threshold == null ? "—" : money(comparison.threshold)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt>{ar ? "الفرق عن النصاب" : "Difference from nisab"}</dt><dd className="num">{comparison.difference == null ? "—" : money(comparison.difference)}</dd></div>
              </dl>
              <p className="mt-3 break-words text-xs text-muted-foreground">{ar ? "مصدر سعر الشراء" : "Bid source"}: {quote?.source} · <time dateTime={quote?.at}>{quote?.at ? new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(quote.at)) : "—"} UTC</time></p>
            </> : <p className="mt-3 text-sm text-muted-foreground">{ar ? "سعر شراء فعلي غير متوفر من المصادر الحالية لهذا البلد؛ لا يُستبدل بسعر البيع أو بتقدير." : "No published purchase price for this country; a sale price or estimate is not substituted."}</p>}
          </article>;
        })}
      </div>
    </section>
  );
}