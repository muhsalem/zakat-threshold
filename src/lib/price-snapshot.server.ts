import type { SupabaseClient } from "@supabase/supabase-js";

import { COUNTRIES } from "./countries";
import { reachConsensus, type ConsensusStatus } from "./spot-consensus";
import {
  collectQuotes,
  fetchJson,
  quoteFromGoldApi,
  quoteFromGoldApiIo,
  quoteFromYahooFutures,
} from "./spot-providers";

export type SnapshotResult = {
  recorded: boolean;
  status?: ConsensusStatus;
  deviationPct?: number;
  /** Why nothing was written, or a note about what was. */
  reason?: string;
  errors: string[];
};

const CURRENCIES = new Set(["USD", ...COUNTRIES.map((c) => c.currency)]);

async function readRates(): Promise<{ rates: Record<string, number>; source: string }> {
  const attempts = [
    { source: "open.er-api.com", url: "https://open.er-api.com/v6/latest/USD" },
    { source: "frankfurter.app (ECB)", url: "https://api.frankfurter.app/latest?from=USD" },
  ];
  for (const { source, url } of attempts) {
    try {
      const json = await fetchJson(url);
      const all = (json?.rates ?? {}) as Record<string, number>;
      if (!Number.isFinite(Number(all["EUR"]))) continue;
      const rates: Record<string, number> = { USD: 1 };
      for (const [code, value] of Object.entries(all)) {
        if (CURRENCIES.has(code) && Number.isFinite(Number(value))) rates[code] = Number(value);
      }
      return { rates, source };
    } catch {
      /* try the next source */
    }
  }
  return { rates: {}, source: "" };
}

/**
 * Writes the day's raw price snapshot. The first successful snapshot of a UTC day is the
 * record (the table rejects edits), so a later run never overwrites it. Returns instead of
 * throwing when the table has not been migrated yet, so the daily job keeps working.
 */
export async function recordPriceSnapshot(
  db: SupabaseClient,
  day: string,
): Promise<SnapshotResult> {
  // The keyed provider is rate-limited, so it only runs here, once a day.
  const { quotes, errors } = await collectQuotes([
    { name: "gold-api", run: quoteFromGoldApi },
    { name: "yahoo-futures", run: quoteFromYahooFutures },
    { name: "goldapi.io", run: quoteFromGoldApiIo },
  ]);
  const consensus = reachConsensus(quotes);
  if (!consensus) return { recorded: false, reason: "no usable metal quote", errors };

  const fx = await readRates();
  const { error } = await db.from("price_snapshots").insert({
    day,
    gold_usd_oz: consensus.goldUsdOz,
    silver_usd_oz: consensus.silverUsdOz,
    metals_source: consensus.primary.source,
    consensus_status: consensus.status,
    deviation_pct: consensus.deviationPct,
    sources: quotes,
    rejected: consensus.rejected,
    fx_source: fx.source,
    fx_rates: fx.rates,
  });

  const base = { status: consensus.status, deviationPct: consensus.deviationPct, errors };
  if (!error) return { recorded: true, ...base };
  if (error.code === "23505") return { recorded: false, reason: "already recorded today", ...base };
  if (error.code === "42P01" || error.code === "PGRST205") {
    return { recorded: false, reason: "price_snapshots table not migrated yet", ...base };
  }
  throw new Error(`price_snapshots: ${error.message}`);
}
