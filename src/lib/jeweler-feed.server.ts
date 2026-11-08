/**
 * Daily local jeweller price feed. Reads public price boards of local jeweller
 * platforms and stores the bare 24K gram price (and buy-back where published).
 */
const OZ = 31.1034768;
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
};

export type FeedRow = {
  country: string;
  currency: string;
  source: string;
  source_url: string;
  gold_gram: number | null;
  buyback_gram: number | null;
  silver_gram: number | null;
  /** Dealer buy-back price for pure silver, where the source publishes it. */
  silver_buyback_gram?: number | null;
  /** Karat the source quotes; every current source quotes 24K (verified Oct 2026). */
  karat?: number;
};

async function text(url: string) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.text())
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

const num = (s: string | undefined) => {
  const v = Number((s ?? "").replace(/,/g, ""));
  return Number.isFinite(v) && v > 0 ? v : null;
};

/** iSagha silver board: pure 999 silver, sell (dealer to customer) and buy (dealer from customer). */
async function iSaghaSilver(path = ""): Promise<{ sell: number | null; buy: number | null }> {
  const t = await text(`https://market.isagha.com/prices/silver${path}`);
  const m = /عيار 999\s*[▼▲]?\s*شراء\s*([\d.,]+)\s*\S+\s*بيع\s*([\d.,]+)/.exec(t);
  if (!m) throw new Error(`iSagha silver${path}: pattern not found`);
  return { buy: num(m[1]), sell: num(m[2]) };
}
const egyptSilver = () => iSaghaSilver();

/** Nagmadin public live-price JSON (EGP per gram, 24K gold and pure silver). */
export function parseNagmadin(json: unknown): { gold: number | null; silver: number | null } {
  const d = (json as { data?: any })?.data;
  const pos = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  return {
    gold: pos(d?.gold_latest?.metal_prices?.XAU?.price_24k),
    silver: pos(d?.market_data?.rates_per_gram?.XAG?.current),
  };
}

async function egypt(): Promise<FeedRow> {
  try {
    const res = await fetch("https://api2.nagmadin.com/api/live-prices", {
      headers: UA,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`nagmadin ${res.status}`);
    const p = parseNagmadin(await res.json());
    if (!p.gold) throw new Error("nagmadin: no 24K price");
    return {
      country: "EG",
      currency: "EGP",
      source: "نجم الدين (مصر)",
      source_url: "https://nagmadin.com/home",
      gold_gram: p.gold,
      buyback_gram: null,
      silver_gram: p.silver,
      silver_buyback_gram: null,
    };
  } catch {
    return egyptEdahab();
  }
}

async function egyptEdahab(): Promise<FeedRow> {
  const url = "https://edahabapp.com/";
  const t = await text(url);
  const m = /عيار 24:\s*بيع:\s*([\d.,]+)\s*جنيه\s*شراء:\s*([\d.,]+)/.exec(t);
  if (!m) throw new Error("eDahab: pattern not found");
  let silver: { sell: number | null; buy: number | null } = { sell: null, buy: null };
  let source = "eDahab (مصر)";
  try {
    silver = await egyptSilver();
    if (silver.sell) source = "eDahab (ذهب) · iSagha (فضة)";
  } catch {
    /* silver falls back to global spot */
  }
  return {
    country: "EG",
    currency: "EGP",
    source,
    source_url: url,
    gold_gram: num(m[1]),
    buyback_gram: num(m[2]),
    silver_gram: silver.sell,
    silver_buyback_gram: silver.buy,
  };
}

/** Saudi Gold Price silver board: raw 999 gram and the 999 bullion resale (buy-back) gram. */
async function saudiSilver(): Promise<{ sell: number | null; buy: number | null }> {
  const t = await text("https://saudigoldprice.com/silverprice/");
  const raw = /عيار\s?999\s*([\d.,]+)/.exec(t);
  const resale = /اعادة بيع\s?999[\s\S]{0,200}?سعر جرام الفضة\s*([\d.,]+)/.exec(t);
  if (!raw) throw new Error("saudigoldprice silver: pattern not found");
  return { sell: num(raw[1]), buy: num(resale?.[1]) };
}

async function saudi(): Promise<FeedRow> {
  const url = "https://saudigoldprice.com/";
  const t = await text(url);
  const m = /سعر جرام الذهب عيار 24\s*([\d.,]+)/.exec(t);
  if (!m) throw new Error("saudigoldprice: pattern not found");
  let silver: { sell: number | null; buy: number | null } = { sell: null, buy: null };
  try {
    silver = await saudiSilver();
  } catch {
    /* silver falls back to global spot */
  }
  return {
    country: "SA",
    currency: "SAR",
    source: "Saudi Gold Price (السعودية)",
    source_url: url,
    gold_gram: num(m[1]),
    buyback_gram: null,
    silver_gram: silver.sell,
    silver_buyback_gram: silver.buy,
  };
}

async function uae(): Promise<FeedRow> {
  const url = "https://www.dubaicityofgold.com/";
  const t = await text(url);
  const m = /24K Gold\s*AED\s*([\d.,]+)/.exec(t);
  if (!m) throw new Error("Dubai City of Gold: pattern not found");
  return {
    country: "AE",
    currency: "AED",
    source: "Dubai City of Gold (DGJG)",
    source_url: url,
    gold_gram: num(m[1]),
    buyback_gram: null,
    silver_gram: null,
  };
}

async function kitcoBidGramUsd(): Promise<number> {
  const t = await text("https://www.kitco.com/charts/gold");
  const m = /24K Gold 99\.99%[^$]*\$([\d,]+\.\d+)/.exec(t);
  const oz = num(m?.[1]);
  if (!oz) throw new Error("Kitco: pattern not found");
  return oz / OZ;
}

async function northAmerica(): Promise<FeedRow[]> {
  const url = "https://www.kitco.com/charts/gold";
  const usd = await kitcoBidGramUsd();
  const rows: FeedRow[] = [
    {
      country: "US",
      currency: "USD",
      source: "Kitco (dealer bid)",
      source_url: url,
      gold_gram: usd,
      buyback_gram: usd,
      silver_gram: null,
    },
  ];
  try {
    const fx = (await (
      await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(10_000) })
    ).json()) as {
      rates?: Record<string, number>;
    };
    const cad = Number(fx.rates?.["CAD"]);
    if (cad > 0)
      rows.push({
        country: "CA",
        currency: "CAD",
        source: "Kitco Montreal (dealer bid)",
        source_url: url,
        gold_gram: usd * cad,
        buyback_gram: usd * cad,
        silver_gram: null,
      });
  } catch {
    /* CAD skipped when the rate is unavailable */
  }
  return rows;
}

/** Reads every board, or only those serving `only` so a slot never fetches unrelated sources. */
export async function collectFeed(
  only?: ReadonlySet<string>,
): Promise<{ rows: FeedRow[]; errors: string[] }> {
  const wanted = (...countries: string[]) => !only || countries.some((c) => only.has(c));
  const jobs: Promise<FeedRow | FeedRow[]>[] = [];
  if (wanted("EG")) jobs.push(egypt());
  if (wanted("SA")) jobs.push(saudi());
  if (wanted("AE")) jobs.push(uae());
  if (wanted("US", "CA")) jobs.push(northAmerica());
  const settled = await Promise.allSettled(jobs);
  const rows: FeedRow[] = [];
  const errors: string[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") rows.push(...(Array.isArray(s.value) ? s.value : [s.value]));
    else errors.push(String(s.reason instanceof Error ? s.reason.message : s.reason));
  }
  // Normalize any non-24K quote to pure 24K (gram / purity) before use.
  for (const r of rows) {
    const k = r.karat ?? 24;
    if (k !== 24 && r.gold_gram) {
      r.gold_gram = r.gold_gram / (k / 24);
      if (r.buyback_gram) r.buyback_gram = r.buyback_gram / (k / 24);
    }
    r.karat = 24;
  }
  return {
    rows: rows.filter((r) => (r.gold_gram || r.silver_gram) && (!only || only.has(r.country))),
    errors,
  };
}

export const BIG_CHANGE_PCT = 3;
/** Feed rows deviating more than this from the spot conversion are skipped. */
export const MAX_SPOT_DEVIATION_PCT = 15;
