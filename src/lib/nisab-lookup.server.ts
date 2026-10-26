import { findCountry } from "./countries";
import {
  deriveNisab,
  gapMinutes,
  silverWeightFor,
  type DerivedNisab,
  type NisabStandard,
} from "./nisab-at";
import { goldWeightFor } from "./nisab-valuation";
import { publicDb } from "./public-api.server";

export type NisabLookup =
  | {
      found: true;
      country: string;
      currency: string;
      standard: NisabStandard;
      requestedAt: string;
      /** The recorded instant the figures come from. */
      recordedAt: string;
      gapMinutes: number;
      /** minute tick = exact minute record; daily = that day's snapshot; history = stored per-country day row. */
      basis: "tick" | "daily" | "history";
      goldUsdOz: number | null;
      silverUsdOz: number | null;
      fxDay: string | null;
      source: string;
      status: string | null;
      nisab: DerivedNisab;
    }
  | { found: false; reason: "invalid" | "no-data" | "unavailable" };

/** Never trust a stale match as exact: beyond this many minutes the answer is marked daily. */
const TICK_MAX_GAP_MIN = 6 * 60;

/**
 * Finds the nisab of a country at a past instant. Prefers the per-minute record, then the
 * day's raw snapshot, then the per-country daily row that predates minute recording.
 */
export async function lookupNisabAt(
  countryCode: string,
  atIso: string,
  standard: NisabStandard = "default",
  db: ReturnType<typeof publicDb> = publicDb(),
): Promise<NisabLookup> {
  const at = new Date(atIso);
  if (!Number.isFinite(at.getTime()) || at.getTime() > Date.now() + 60_000) {
    return { found: false, reason: "invalid" };
  }
  const country = findCountry(countryCode.toUpperCase());
  if (country.code !== countryCode.toUpperCase()) return { found: false, reason: "invalid" };
  const requestedAt = at.toISOString();
  const day = requestedAt.slice(0, 10);

  const [tickRes, snapRes] = await Promise.all([
    db
      .from("market_ticks")
      .select("*")
      .lte("ts", requestedAt)
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("price_snapshots")
      .select("*")
      .lte("day", day)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // A database that cannot be reached at all (no error code) is "unavailable": do not wait
  // on a third query. A missing table (migration pending) still falls through to history.
  const unreachable = (e: { code?: string } | null) => e != null && !e.code;
  if (unreachable(tickRes.error) && unreachable(snapRes.error)) {
    return { found: false, reason: "unavailable" };
  }

  const rateOf = (fx: unknown) => {
    const rates = (fx ?? {}) as Record<string, number>;
    return country.currency === "USD" ? 1 : Number(rates[country.currency]);
  };
  const snap = snapRes.data;
  const tick = tickRes.data;

  if (tick && snap) {
    const gap = gapMinutes(requestedAt, tick.ts);
    const rate = rateOf(snap.fx_rates);
    const nisab =
      gap <= TICK_MAX_GAP_MIN
        ? deriveNisab({
            goldUsdOz: Number(tick.gold_usd_oz),
            silverUsdOz: Number(tick.silver_usd_oz),
            rate,
            standard,
          })
        : null;
    if (nisab) {
      return {
        found: true,
        country: country.code,
        currency: country.currency,
        standard,
        requestedAt,
        recordedAt: tick.ts,
        gapMinutes: gap,
        basis: "tick",
        goldUsdOz: Number(tick.gold_usd_oz),
        silverUsdOz: Number(tick.silver_usd_oz),
        fxDay: snap.day,
        source: tick.source,
        status: tick.status,
        nisab,
      };
    }
  }

  if (snap) {
    const nisab = deriveNisab({
      goldUsdOz: Number(snap.gold_usd_oz),
      silverUsdOz: Number(snap.silver_usd_oz),
      rate: rateOf(snap.fx_rates),
      standard,
    });
    if (nisab) {
      return {
        found: true,
        country: country.code,
        currency: country.currency,
        standard,
        requestedAt,
        recordedAt: snap.taken_at,
        gapMinutes: gapMinutes(requestedAt, snap.taken_at),
        basis: "daily",
        goldUsdOz: Number(snap.gold_usd_oz),
        silverUsdOz: Number(snap.silver_usd_oz),
        fxDay: snap.day,
        source: snap.metals_source,
        status: snap.consensus_status,
        nisab,
      };
    }
  }

  // Before minute recording began: the per-country row stored for that day.
  const { data: row, error } = await db
    .from("nisab_history")
    .select("*")
    .eq("country", country.code)
    .lte("day", day)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && !tick && !snap) return { found: false, reason: "unavailable" };
  if (row && row.gold_gram && row.silver_gram) {
    const goldGram = Number(row.gold_gram);
    const silverGram = Number(row.silver_gram);
    const silverWeight = silverWeightFor(standard);
    return {
      found: true,
      country: country.code,
      currency: row.currency,
      standard,
      requestedAt,
      recordedAt: `${row.day}T00:00:00.000Z`,
      gapMinutes: gapMinutes(requestedAt, `${row.day}T00:00:00.000Z`),
      basis: "history",
      goldUsdOz: null,
      silverUsdOz: null,
      fxDay: null,
      source: row.source,
      status: null,
      nisab: {
        goldGram,
        silverGram,
        gold: goldGram * goldWeightFor(silverWeight),
        silver: silverGram * silverWeight,
      },
    };
  }
  return { found: false, reason: "no-data" };
}
