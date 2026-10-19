import type { SpotQuote } from "./spot-consensus";

/** Upstream calls must never hang a request: abort after this long. */
export const FETCH_TIMEOUT_MS = 8_000;

export async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { accept: "application/json", ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  return res.json() as Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const finite = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

/** Free OTC spot feed (primary for the live path). */
export async function quoteFromGoldApi(): Promise<SpotQuote> {
  const [gold, silver] = await Promise.all([
    fetchJson("https://api.gold-api.com/price/XAU"),
    fetchJson("https://api.gold-api.com/price/XAG"),
  ]);
  const g = finite(gold.price);
  const s = finite(silver.price);
  if (g == null || s == null) throw new Error("gold-api: bad payload");
  return {
    source: "gold-api.com — spot XAU/XAG",
    url: "https://api.gold-api.com/price/XAU",
    kind: "spot",
    goldUsdOz: g,
    silverUsdOz: s,
    at: String(gold.updatedAt ?? new Date().toISOString()),
  };
}

async function lastCloseFromYahoo(symbol: string) {
  const json = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
  );
  const result = json?.chart?.result?.[0];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const stamps: number[] = result?.timestamp ?? [];
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const close = closes[i];
    const stamp = stamps[i];
    if (typeof close === "number" && Number.isFinite(close)) {
      return { price: close, at: new Date((stamp ?? Date.now() / 1000) * 1000).toISOString() };
    }
  }
  throw new Error(`yahoo: no close for ${symbol}`);
}

/** Exchange futures: validates the spot feed, carries a basis versus spot. */
export async function quoteFromYahooFutures(): Promise<SpotQuote> {
  const [gold, silver] = await Promise.all([
    lastCloseFromYahoo("GC=F"),
    lastCloseFromYahoo("SI=F"),
  ]);
  return {
    source: "Yahoo Finance — COMEX futures close (GC=F, SI=F)",
    url: "https://finance.yahoo.com/quote/GC=F",
    kind: "futures",
    goldUsdOz: gold.price,
    silverUsdOz: silver.price,
    at: gold.at,
  };
}

/**
 * Optional paid/keyed provider, enabled by setting GOLDAPI_KEY on the server.
 * The free tier is request-limited, so it is only used by the once-a-day snapshot job,
 * never by the per-minute live path. The payload shape is read defensively.
 */
export async function quoteFromGoldApiIo(): Promise<SpotQuote | null> {
  const key = process.env["GOLDAPI_KEY"];
  if (!key) return null;
  const headers = { "x-access-token": key };
  const [gold, silver] = await Promise.all([
    fetchJson("https://www.goldapi.io/api/XAU/USD", headers),
    fetchJson("https://www.goldapi.io/api/XAG/USD", headers),
  ]);
  const g = finite(gold.price);
  const s = finite(silver.price);
  if (g == null || s == null) throw new Error("goldapi.io: bad payload");
  const stamp = finite(gold.timestamp);
  return {
    source: "GoldAPI.io — spot XAU/XAG",
    url: "https://www.goldapi.io/",
    kind: "spot",
    goldUsdOz: g,
    silverUsdOz: s,
    at: stamp ? new Date(stamp * 1000).toISOString() : new Date().toISOString(),
  };
}

/** Runs providers in parallel; failures are returned, never thrown. */
export async function collectQuotes(
  providers: { name: string; run: () => Promise<SpotQuote | null> }[],
): Promise<{ quotes: SpotQuote[]; errors: string[] }> {
  const settled = await Promise.allSettled(providers.map((p) => p.run()));
  const quotes: SpotQuote[] = [];
  const errors: string[] = [];
  settled.forEach((result, i) => {
    const name = providers[i]?.name ?? "unknown";
    if (result.status === "fulfilled") {
      if (result.value) quotes.push(result.value);
    } else {
      errors.push(
        `${name}: ${result.reason instanceof Error ? result.reason.message : result.reason}`,
      );
    }
  });
  return { quotes, errors };
}
