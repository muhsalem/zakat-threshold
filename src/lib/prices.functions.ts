import { createServerFn } from "@tanstack/react-start";
import { COUNTRIES } from "./countries";
import { annualSince } from "./long-history";
import { PRICE_REFRESH_MS, HISTORY_CACHE_MS } from "./daily-nisab";
import { reachConsensus, type Consensus, type SpotQuote } from "./spot-consensus";
import {
  FETCH_TIMEOUT_MS,
  collectQuotes,
  fetchJson,
  quoteFromGoldApi,
  quoteFromGoldApiIoCached,
  quoteFromYahooFutures,
} from "./spot-providers";

/** How trustworthy a figure on screen is right now. */
export type Quality = "live" | "delayed" | "stale";

export type FeedMeta = {
  source: string;
  url: string;
  market: string;
  frequency: string;
  quality: Quality;
  /** 0 = primary source answered, 1+ = a fallback answered. */
  fallbackDepth: number;
};

export type LivePrices = {
  goldUsdOz: number;
  silverUsdOz: number;
  rates: Record<string, number>;
  metalsUpdatedAt: string;
  ratesUpdatedAt: string;
  fetchedAt: string;
  metalsSource: string;
  ratesSource: string;
  metals: FeedMeta;
  fx: FeedMeta;
  /** How the independent metal quotes compare; absent on payloads from older servers. */
  consensus?: PriceConsensus;
};

export type PriceConsensus = {
  status: Consensus["status"];
  deviationPct: number;
  sources: Pick<SpotQuote, "source" | "kind" | "goldUsdOz" | "silverUsdOz" | "at">[];
  rejected: Consensus["rejected"];
};

type Cache = { data: LivePrices; at: number } | null;
let cache: Cache = null;
/** Last successful payload, kept so an outage shows real stale data instead of nothing. */
let lastGood: Cache = null;
/** Price checks are minute-based; the historical series keeps its own hourly cache. */
const TTL_MS = PRICE_REFRESH_MS;

/** Runs sources in order and reports which one answered. */
async function firstOk<T>(
  sources: { run: () => Promise<T> }[],
): Promise<{ value: T; depth: number }> {
  let lastError: unknown;
  for (let i = 0; i < sources.length; i += 1) {
    const source = sources[i];
    if (!source) continue;
    try {
      return { value: await source.run(), depth: i };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All sources failed");
}

function ageQuality(iso: string): Quality {
  const age = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(age) || age < 0) return "delayed";
  if (age < 2 * 60 * 60 * 1000) return "live";
  if (age < 36 * 60 * 60 * 1000) return "delayed";
  return "stale";
}

type Fx = { rates: Record<string, number>; updatedAt: string; label: string; url: string };

async function fxFromErApi(): Promise<Fx> {
  const fx = await fetchJson("https://open.er-api.com/v6/latest/USD");
  const rates = fx?.rates as Record<string, number> | undefined;
  if (!rates || !Number.isFinite(Number(rates["EUR"]))) throw new Error("er-api: bad payload");
  return {
    rates,
    updatedAt: String(fx.time_last_update_utc ?? new Date().toISOString()),
    label: "exchangerate-api.com — daily reference rates",
    url: "https://open.er-api.com/v6/latest/USD",
  };
}

async function fxFromFrankfurter(): Promise<Fx> {
  const fx = await fetchJson("https://api.frankfurter.app/latest?from=USD");
  const rates = fx?.rates as Record<string, number> | undefined;
  if (!rates || !Number.isFinite(Number(rates["EUR"]))) throw new Error("frankfurter: bad payload");
  return {
    rates,
    updatedAt: fx?.date ? `${fx.date}T00:00:00Z` : new Date().toISOString(),
    label: "Frankfurter / ECB — official daily reference rates",
    url: "https://api.frankfurter.app/latest?from=USD",
  };
}

/** Concurrent callers share one upstream round trip instead of stampeding the providers. */
let inflight: Promise<LivePrices> | null = null;

export const getLivePrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<LivePrices> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    inflight ??= loadLivePrices().finally(() => {
      inflight = null;
    });
    return inflight;
  },
);

async function loadLivePrices(): Promise<LivePrices> {
  {
    try {
      const [metalQuotes, fx] = await Promise.all([
        collectQuotes([
          { name: "gold-api", run: quoteFromGoldApi },
          { name: "yahoo-futures", run: quoteFromYahooFutures },
          { name: "goldapi.io", run: quoteFromGoldApiIoCached },
        ]),
        firstOk<Fx>([{ run: fxFromErApi }, { run: fxFromFrankfurter }]),
      ]);
      const consensus = reachConsensus(metalQuotes.quotes);
      if (!consensus) throw new Error(`All metal sources failed: ${metalQuotes.errors.join("; ")}`);
      const primary = consensus.primary;
      const primaryIsSpot = primary.kind !== "futures";
      const depth = metalQuotes.quotes.indexOf(primary);

      const data: LivePrices = {
        goldUsdOz: consensus.goldUsdOz,
        silverUsdOz: consensus.silverUsdOz,
        rates: { USD: 1, ...fx.value.rates },
        metalsUpdatedAt: primary.at,
        ratesUpdatedAt: fx.value.updatedAt,
        fetchedAt: new Date().toISOString(),
        metalsSource: primary.source,
        ratesSource: fx.value.label,
        metals: {
          source: primary.source,
          url: primary.url,
          market: "International spot / futures (USD per troy ounce)",
          frequency: primaryIsSpot
            ? "Checked every minute; source timestamps apply"
            : "Daily close",
          // Futures closes and unresolved disagreement are never presented as live.
          quality:
            primaryIsSpot && consensus.status !== "diverged" ? ageQuality(primary.at) : "delayed",
          fallbackDepth: Math.max(0, depth),
        },
        fx: {
          source: fx.value.label,
          url: fx.value.url,
          market: "Official / reference interbank rates",
          frequency: "Daily",
          quality: fx.depth === 0 ? ageQuality(fx.value.updatedAt) : "delayed",
          fallbackDepth: fx.depth,
        },
        consensus: {
          status: consensus.status,
          deviationPct: consensus.deviationPct,
          sources: metalQuotes.quotes.map(({ source, kind, goldUsdOz, silverUsdOz, at }) => ({
            source,
            kind,
            goldUsdOz,
            silverUsdOz,
            at,
          })),
          rejected: consensus.rejected,
        },
      };

      cache = { data, at: Date.now() };
      lastGood = cache;
      // Minute-level history: best effort, never blocks or breaks serving prices.
      if (typeof window === "undefined") {
        const { recordTickOpportunistically } = await import("./market-tick.server");
        await recordTickOpportunistically(data);
      }
      return data;
    } catch (error) {
      if (lastGood) {
        return {
          ...lastGood.data,
          metals: { ...lastGood.data.metals, quality: "stale" },
          fx: { ...lastGood.data.fx, quality: "stale" },
        };
      }
      throw error instanceof Error ? error : new Error("Price sources unavailable");
    }
  }
}

export type HistoryRange =
  | "1mo"
  | "6mo"
  | "1y"
  | "5y"
  | "10y"
  | "1448"
  | "20y"
  | "30y"
  | "40y"
  | "50y"
  | "75y"
  | "100y"
  | "1000y";
export type HistoryPoint = { t: number; gold: number; silver: number; rate: number };
export type HistoryResponse = {
  points: HistoryPoint[];
  currency: string;
  fxAvailable: boolean;
  metalsSource: string;
  ratesSource: string;
  /** Long ranges use annual averages converted with today's exchange rate. */
  approx?: boolean;
};

export const LONG_RANGES: Record<string, number> = {
  "20y": 20,
  "30y": 30,
  "40y": 40,
  "50y": 50,
  "75y": 75,
  "100y": 100,
  "1000y": 1000,
};

/** 1 Muharram 1448 AH (16 June 2026), start of the "1448" history range. */
export const HIJRI_1448_START_MS = Date.UTC(2026, 5, 16);

/** Only currencies the site offers — keeps arbitrary codes from fanning out upstream requests. */
const KNOWN_CURRENCIES = new Set(["USD", ...COUNTRIES.map((c) => c.currency)]);

const histCache = new Map<string, { data: HistoryPoint[]; at: number }>();

async function yahooSeries(symbol: string, range: HistoryRange) {
  const interval = range === "1mo" ? "1d" : range === "6mo" || range === "1y" ? "1d" : "1wk";
  const timeQuery =
    range === "1448"
      ? `period1=${Math.floor(HIJRI_1448_START_MS / 1000)}&period2=${Math.floor(Date.now() / 1000)}`
      : `range=${range}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${timeQuery}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`History request failed (${res.status})`);
  type YahooChart = {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
    };
  };
  const json = (await res.json()) as YahooChart | null;
  const result = json?.chart?.result?.[0];
  const stamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const out = new Map<number, number>();
  stamps.forEach((s, i) => {
    const c = closes[i];
    if (typeof c === "number" && Number.isFinite(c)) out.set(s * 1000, c);
  });
  return out;
}

export const getHistory = createServerFn({ method: "GET" })
  .inputValidator((data: { range: HistoryRange; currency: string }) => {
    const allowed: HistoryRange[] = [
      "1mo",
      "6mo",
      "1y",
      "5y",
      "10y",
      "1448",
      "20y",
      "30y",
      "40y",
      "50y",
      "75y",
      "100y",
      "1000y",
    ];
    const range = allowed.includes(data?.range) ? data.range : "1y";
    const currency = KNOWN_CURRENCIES.has(data?.currency) ? data.currency : "USD";
    return { range, currency };
  })
  .handler(async ({ data }): Promise<HistoryResponse> => {
    const longYears = LONG_RANGES[data.range];
    if (longYears) {
      let rate = 1;
      if (data.currency !== "USD") {
        try {
          const fx = await fetchJson("https://open.er-api.com/v6/latest/USD");
          rate = Number(fx?.rates?.[data.currency]) || 0;
        } catch {
          rate = 0;
        }
        if (!rate) {
          return {
            points: [],
            currency: data.currency,
            fxAvailable: false,
            metalsSource: "متوسطات سنوية تاريخية (USD/oz)",
            ratesSource: `سعر صرف غير متاح لـ ${data.currency}`,
            approx: true,
          };
        }
      }
      const points: HistoryPoint[] = annualSince(longYears).map((p) => ({
        t: Date.UTC(p.year, 6, 1),
        gold: p.gold,
        silver: p.silver,
        rate,
      }));
      return {
        points,
        currency: data.currency,
        fxAvailable: true,
        metalsSource: "متوسطات سنوية تاريخية للذهب والفضة (USD/oz)",
        ratesSource:
          data.currency === "USD" ? "USD base rate" : `سعر الصرف الحالي لـ ${data.currency}`,
        approx: true,
      };
    }

    const cacheKey = `${data.range}:${data.currency}`;
    const hit = histCache.get(cacheKey);
    if (hit && Date.now() - hit.at < HISTORY_CACHE_MS) {
      return {
        points: hit.data,
        currency: data.currency,
        fxAvailable: true,
        metalsSource: "Yahoo Finance (GC=F, SI=F)",
        ratesSource:
          data.currency === "USD" ? "USD base rate" : `Yahoo Finance (${data.currency}=X)`,
      };
    }

    const [gold, silver, fx] = await Promise.all([
      yahooSeries("GC=F", data.range),
      yahooSeries("SI=F", data.range),
      data.currency === "USD"
        ? Promise.resolve(new Map<number, number>())
        : yahooSeries(`${data.currency}=X`, data.range).catch(() => new Map<number, number>()),
    ]);

    if (data.currency !== "USD" && fx.size === 0) {
      return {
        points: [],
        currency: data.currency,
        fxAvailable: false,
        metalsSource: "Yahoo Finance (GC=F, SI=F)",
        ratesSource: `Historical exchange rate unavailable for ${data.currency}`,
      };
    }

    const points: HistoryPoint[] = [];
    const fxEntries = [...fx.entries()].sort((a, b) => a[0] - b[0]);
    let fxIndex = 0;
    let lastRate = data.currency === "USD" ? 1 : undefined;
    for (const [t, g] of gold) {
      const s = silver.get(t);
      while (fxIndex < fxEntries.length) {
        const fxEntry = fxEntries[fxIndex];
        if (!fxEntry || fxEntry[0] > t + 36 * 60 * 60 * 1000) break;
        lastRate = fxEntry[1];
        fxIndex += 1;
      }
      if (typeof s === "number" && typeof lastRate === "number") {
        points.push({ t, gold: g, silver: s, rate: lastRate });
      }
    }
    points.sort((a, b) => a.t - b.t);
    histCache.set(cacheKey, { data: points, at: Date.now() });
    return {
      points,
      currency: data.currency,
      fxAvailable: true,
      metalsSource: "Yahoo Finance (GC=F, SI=F)",
      ratesSource: data.currency === "USD" ? "USD base rate" : `Yahoo Finance (${data.currency}=X)`,
    };
  });
