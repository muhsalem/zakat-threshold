import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import { GOLD_NISAB_G, SILVER_NISAB_G, perGram } from "@/lib/nisab";
import { usePrices } from "@/lib/use-prices";

const ISAGHA = [
  {
    country: "EG",
    url: "https://market.isagha.com/prices/silver",
    note: "لوحة iSagha للفضة 999 في مصر — مصدر الفضة المستخدم في التحديث اليومي.",
  },
  {
    country: "KW",
    url: "https://market.isagha.com/prices/silver",
    note: "لا توجد لدى iSagha صفحة أسعار للكويت؛ رابط الكويت يُحوَّل إلى لوحة مصر، لذا لا نعرض أرقامه كسعر كويتي. فضة الكويت حاليًا من السعر العالمي المحوَّل إلى الدينار.",
  },
];

const fmt = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d });
const diff = (a?: number | null, b?: number | null) =>
  a && b ? `${(((a - b) / b) * 100).toFixed(1)}%` : "—";

export function PriceSourcesTable() {
  const { data: prices } = usePrices();
  const { data } = useQuery({
    queryKey: ["price-sources-page"],
    queryFn: async () => {
      const [feed, official] = await Promise.all([
        supabase
          .from("jeweler_feed")
          .select(
            "country,currency,source,source_url,day,gold_gram,silver_gram,buyback_gram,silver_buyback_gram,fetched_at",
          )
          .order("fetched_at", { ascending: false })
          .limit(60),
        supabase
          .from("official_nisab")
          .select("country,currency,gold_nisab,silver_nisab,authority,source_url,announced_on")
          .order("announced_on", { ascending: false }),
      ]);
      const latest = new Map<string, NonNullable<typeof feed.data>[number]>();
      for (const r of feed.data ?? []) if (!latest.has(r.country)) latest.set(r.country, r);
      const off = new Map<string, NonNullable<typeof official.data>[number]>();
      for (const r of official.data ?? []) if (!off.has(r.country)) off.set(r.country, r);
      return { latest, off };
    },
  });

  const codes = [...new Set([...(data?.latest.keys() ?? []), ...(data?.off.keys() ?? []), "KW"])];

  return (
    <section className="mt-8" aria-labelledby="price-src">
      <h2 id="price-src" className="text-xl text-foreground">
        مصدر كل سعر وكل نصاب
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        آخر سعر محلي مسجَّل لكل دولة مع رابطه، والنصاب المحسوب منه (ذهب {GOLD_NISAB_G}غ · فضة{" "}
        {SILVER_NISAB_G}غ)، ومقارنته بالسعر العالمي المحوَّل وبالنصاب الرسمي المعلن إن وُجد.
      </p>
      <div className="scroll-x mt-4">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="text-muted-foreground">
            <tr>
              {[
                "الدولة",
                "المصدر المحلي",
                "ذهب 24/غ",
                "فرق عن العالمي",
                "فضة 999/غ",
                "فرق عن العالمي",
                "نصاب الذهب",
                "نصاب الفضة",
                "النصاب الرسمي",
              ].map((h) => (
                <th key={h} className="p-2 text-start font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => {
              const c = COUNTRIES.find((x) => x.code === code);
              const f = data?.latest.get(code);
              const o = data?.off.get(code);
              const cur = f?.currency ?? o?.currency ?? c?.currency ?? "";
              const rate = prices?.rates[cur];
              const gSpot = rate ? perGram(prices!.goldUsdOz, rate) : null;
              const sSpot = rate ? perGram(prices!.silverUsdOz, rate) : null;
              const g = f?.buyback_gram ?? f?.gold_gram;
              const s = f?.silver_buyback_gram ?? f?.silver_gram;
              return (
                <tr key={code} className="border-t border-border align-top">
                  <td className="p-2">
                    {c?.ar ?? code} <span className="text-muted-foreground">{cur}</span>
                  </td>
                  <td className="p-2">
                    {f ? (
                      <a
                        href={f.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                      >
                        {f.source} <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        لا يوجد مصدر محلي — سعر عالمي محوَّل
                      </span>
                    )}
                    {f && <p className="num text-xs text-muted-foreground">{f.day}</p>}
                  </td>
                  <td className="num p-2">
                    {fmt(g ?? gSpot)}
                    {!g && gSpot ? " *" : ""}
                  </td>
                  <td className="num p-2">{diff(g, gSpot)}</td>
                  <td className="num p-2">
                    {fmt(s ?? sSpot, 3)}
                    {!s && sSpot ? " *" : ""}
                  </td>
                  <td className="num p-2">{diff(s, sSpot)}</td>
                  <td className="num p-2">{fmt((g ?? gSpot ?? NaN) * GOLD_NISAB_G, 0)}</td>
                  <td className="num p-2">{fmt((s ?? sSpot ?? NaN) * SILVER_NISAB_G, 0)}</td>
                  <td className="p-2">
                    {o ? (
                      <a
                        href={o.source_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        <span className="num">
                          {fmt(Number(o.gold_nisab ?? o.silver_nisab), 0)}
                        </span>{" "}
                        · {o.authority}{" "}
                        <span className="num text-xs text-muted-foreground">
                          ({o.announced_on})
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">لا إعلان مسجّل</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        * سعر عالمي محوَّل لعدم توفر سعر محلي. يُفضَّل سعر الشراء من العميل عند توفره.
      </p>

      <h3 className="mt-8 text-lg text-foreground">المقارنة مع iSagha</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {ISAGHA.map((i) => {
          const f = data?.latest.get(i.country);
          const rate = prices?.rates[i.country === "KW" ? "KWD" : "EGP"];
          const sSpot = rate ? perGram(prices!.silverUsdOz, rate) : null;
          const s = f?.silver_buyback_gram ?? f?.silver_gram;
          return (
            <li key={i.country} className="card-surface p-4 text-sm">
              <p className="text-foreground">{i.country === "KW" ? "فضة الكويت" : "فضة مصر"}</p>
              <p className="mt-1 text-muted-foreground">{i.note}</p>
              <p className="num mt-2">
                المسجَّل اليوم: {fmt(s, 3)} · العالمي المحوَّل: {fmt(sSpot, 3)} · الفرق:{" "}
                {diff(s, sSpot)}
              </p>
              <a
                href={i.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-primary underline underline-offset-4"
              >
                iSagha <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
