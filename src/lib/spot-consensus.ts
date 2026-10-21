/**
 * Reconciles gold/silver quotes from independent sources. Pure, no I/O.
 *
 * Nisab figures must not hinge on one free feed: quotes are compared, outliers are
 * dropped when a majority exists, and disagreement the data cannot resolve is
 * reported instead of hidden.
 */

/** benchmark = published fixing, spot = OTC spot feed, futures = exchange futures (carries a basis). */
export type SpotKind = "benchmark" | "spot" | "futures";

export type SpotQuote = {
  source: string;
  url: string;
  kind: SpotKind;
  goldUsdOz: number;
  silverUsdOz: number;
  /** ISO timestamp the source attached to the quote. */
  at: string;
};

export type ConsensusStatus = "agree" | "warn" | "diverged" | "single";

export type Consensus = {
  goldUsdOz: number;
  silverUsdOz: number;
  status: ConsensusStatus;
  /** Largest gap between the accepted quotes, as a percent of their median (0 for one quote). */
  deviationPct: number;
  /** The quote the headline figures come from. */
  primary: SpotQuote;
  used: SpotQuote[];
  rejected: { source: string; reason: string }[];
};

export const SPOT_WARN_PCT = 1.5;
export const SPOT_MAX_PCT = 3;

const PRIORITY: Record<SpotKind, number> = { benchmark: 0, spot: 1, futures: 2 };

const usable = (q: SpotQuote) =>
  Number.isFinite(q.goldUsdOz) &&
  Number.isFinite(q.silverUsdOz) &&
  q.goldUsdOz > 0 &&
  q.silverUsdOz > 0;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Largest (max - min) / median across the two metals, in percent. */
function spreadPct(quotes: SpotQuote[]): number {
  if (quotes.length < 2) return 0;
  const gaps = (["goldUsdOz", "silverUsdOz"] as const).map((key) => {
    const values = quotes.map((q) => q[key]);
    return ((Math.max(...values) - Math.min(...values)) / median(values)) * 100;
  });
  return Math.max(...gaps);
}

export function reachConsensus(
  quotes: SpotQuote[],
  options: { warnPct?: number; maxPct?: number } = {},
): Consensus | null {
  const { warnPct = SPOT_WARN_PCT, maxPct = SPOT_MAX_PCT } = options;
  // Stable sort keeps the caller's order within a kind.
  const valid = quotes
    .filter(usable)
    .map((q, i) => ({ q, i }))
    .sort((a, b) => PRIORITY[a.q.kind] - PRIORITY[b.q.kind] || a.i - b.i)
    .map(({ q }) => q);
  const rejected: Consensus["rejected"] = quotes
    .filter((q) => !usable(q))
    .map((q) => ({ source: q.source, reason: "invalid" }));
  const [first] = valid;
  if (!first) return null;

  let accepted = valid;
  if (valid.length >= 3) {
    const goldMid = median(valid.map((q) => q.goldUsdOz));
    const silverMid = median(valid.map((q) => q.silverUsdOz));
    accepted = valid.filter((q) => {
      const dev = Math.max(
        (Math.abs(q.goldUsdOz - goldMid) / goldMid) * 100,
        (Math.abs(q.silverUsdOz - silverMid) / silverMid) * 100,
      );
      if (dev <= maxPct) return true;
      rejected.push({ source: q.source, reason: `outlier ${dev.toFixed(1)}%` });
      return false;
    });
  }
  const [primary] = accepted;
  if (!primary) return null;

  if (accepted.length === 1) {
    return {
      goldUsdOz: primary.goldUsdOz,
      silverUsdOz: primary.silverUsdOz,
      status: "single",
      deviationPct: 0,
      primary,
      used: accepted,
      rejected,
    };
  }

  const gap = spreadPct(accepted);
  if (gap > maxPct) {
    // Two sources that disagree cannot say which one is wrong: keep the higher-priority
    // quote but flag the divergence so it is never presented as confirmed.
    for (const q of accepted.slice(1)) {
      rejected.push({ source: q.source, reason: `diverges ${gap.toFixed(1)}%` });
    }
    return {
      goldUsdOz: primary.goldUsdOz,
      silverUsdOz: primary.silverUsdOz,
      status: "diverged",
      deviationPct: gap,
      primary,
      used: [primary],
      rejected,
    };
  }

  return {
    goldUsdOz: primary.goldUsdOz,
    silverUsdOz: primary.silverUsdOz,
    status: gap > warnPct ? "warn" : "agree",
    deviationPct: gap,
    primary,
    used: accepted,
    rejected,
  };
}
