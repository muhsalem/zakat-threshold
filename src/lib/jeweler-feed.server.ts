/**
 * Daily local jeweller price feed. Reads public price boards of local jeweller
 * platforms and stores the bare 24K gram price (and buy-back where published).
 */
const OZ = 31.1034768;
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };

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
  const res = await fetch(url, { headers: UA });
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

/** Nagmadin live board (EGP): 24K gram and pure silver gram. */
export function parseNagmadin(json: unknown): { gold: number | null; silver: number | null } {
  const d = (json as { data?: Record<string, any> })?.data;
  const gold = Number(d?.gold_latest?.metal_prices?.XAU?.price_24k);
  const silver = Number(d?.market_data?.rates_per_gram?.XAG?.current);
  return { gold: gold > 0 ? gold : null, silver: silver > 0 ? silver : null };
}

async function egypt(): Promise<FeedRow> {
  try {
    const res = await fetch("https://api2.nagmadin.com/api/live-prices", { headers: { ...UA, accept: "application/json" } });
    if (!res.ok) throw new Error(`Nagmadin ${res.status}`);
    const n = parseNagmadin(await res.json());
    if (n.gold) {
      return { country: "EG", currency: "EGP", source: "نجم الدين Nagmadin (مصر)", source_url: "https://nagmadin.com/home", gold_gram: n.gold, buyback_gram: null, silver_gram: n.silver };
    }
  } catch {
    /* fall back to eDahab */
  }
  return egyptEdahab();
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
  return { country: "EG", currency: "EGP", source, source_url: url, gold_gram: num(m[1]), buyback_gram: num(m[2]), silver_gram: silver.sell, silver_buyback_gram: silver.buy };
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
  return { country: "SA", currency: "SAR", source: "Saudi Gold Price (السعودية)", source_url: url, gold_gram: num(m[1]), buyback_gram: null, silver_gram: silver.sell, silver_buyback_gram: silver.buy };
}

async function uae(): Promise<FeedRow> {
  const url = "https://www.dubaicityofgold.com/";
  const t = await text(url);
  const m = /24K Gold\s*AED\s*([\d.,]+)/.exec(t);
  if (!m) throw new Error("Dubai City of Gold: pattern not found");
  return { country: "AE", currency: "AED", source: "Dubai City of Gold (DGJG)", source_url: url, gold_gram: num(m[1]), buyback_gram: null, silver_gram: null };
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
    { country: "US", currency: "USD", source: "Kitco (dealer bid)", source_url: url, gold_gram: usd, buyback_gram: usd, silver_gram: null },
  ];
  try {
    const fx = (await (await fetch("https://open.er-api.com/v6/latest/USD")).json()) as { rates?: Record<string, number> };
    const cad = Number(fx.rates?.["CAD"]);
    if (cad > 0) rows.push({ country: "CA", currency: "CAD", source: "Kitco Montreal (dealer bid)", source_url: url, gold_gram: usd * cad, buyback_gram: usd * cad, silver_gram: null });
  } catch {
    /* CAD skipped when the rate is unavailable */
  }
  return rows;
}

/** IANA zone used for each country's 11:00/23:00 local update slots. */
export const FEED_TIME_ZONES: Record<string, string> = {
  EG: "Africa/Cairo", SA: "Asia/Riyadh", AE: "Asia/Dubai", US: "America/New_York", CA: "America/Toronto",
};

/** Countries whose local hour is 11 or 23 at `now`. */
export function dueFeedCountries(now: Date): Set<string> {
  const due = new Set<string>();
  for (const [c, tz] of Object.entries(FEED_TIME_ZONES)) {
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now));
    if (h === 11 || h === 23) due.add(c);
  }
  return due;
}

export async function collectFeed(only?: Set<string>): Promise<{ rows: FeedRow[]; errors: string[] }> {
  const want = (...cs: string[]) => !only || cs.some((c) => only.has(c));
  const jobs: Promise<FeedRow | FeedRow[]>[] = [];
  if (want("EG")) jobs.push(egypt());
  if (want("SA")) jobs.push(saudi());
  if (want("AE")) jobs.push(uae());
  if (want("US", "CA")) jobs.push(northAmerica());
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
  return { rows: rows.filter((r) => (r.gold_gram || r.silver_gram) && (!only || only.has(r.country))), errors };
}

export const BIG_CHANGE_PCT = 3;
/** Feed rows deviating more than this from the spot conversion are skipped. */
export const MAX_SPOT_DEVIATION_PCT = 15;
