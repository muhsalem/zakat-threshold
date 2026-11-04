import type { SupabaseClient } from "@supabase/supabase-js";

import { COUNTRIES } from "@/lib/countries";
import {
  BIG_CHANGE_PCT,
  MAX_SPOT_DEVIATION_PCT,
  collectFeed,
  type FeedRow,
} from "@/lib/jeweler-feed.server";
import type { ScheduledFeedRun } from "@/lib/scheduled-feed-run";

const OZ = 31.1034768;

/** Snapshot today's nisab (gold 85g, silver 595g) per country into nisab_history. */
export async function recordNisabHistory(
  supabaseAdmin: SupabaseClient,
  feedRows: FeedRow[],
  today: string,
  only?: ReadonlySet<string>,
): Promise<{ recorded: number; source: string; countries: string[] }> {
  // 1) Local jeweller feed rows win for their country.
  const byCountry = new Map<string, FeedRow>();
  for (const r of feedRows) byCountry.set(r.country, r);

  // 2) Global spot fallback for every other country.
  let goldOz: number | null = null;
  let silverOz: number | null = null;
  let rates: Record<string, number> = {};
  try {
    const [g, s, fx] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      }).then((r) => r.json()),
      fetch("https://api.gold-api.com/price/XAG", {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      }).then((r) => r.json()),
      fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(10_000) }).then(
        (r) => r.json(),
      ),
    ]);
    goldOz = Number(g?.price) > 0 ? Number(g.price) : null;
    silverOz = Number(s?.price) > 0 ? Number(s.price) : null;
    rates = (fx?.rates ?? {}) as Record<string, number>;
  } catch {
    /* spot unavailable; only feed rows are recorded */
  }

  const rows: Record<string, unknown>[] = [];
  for (const c of COUNTRIES) {
    if (only && !only.has(c.code)) continue;
    const feed = byCountry.get(c.code);
    const rate0 = c.currency === "USD" ? 1 : rates[c.currency];
    if (feed && !feed.gold_gram && feed.silver_gram) {
      // Silver-only local board: gold from spot, silver from the local dealer.
      if (goldOz && rate0)
        rows.push({
          country: c.code,
          currency: c.currency,
          day: today,
          gold_gram: (goldOz / OZ) * rate0,
          silver_gram: feed.silver_gram,
          source: `spot + ${feed.source}`,
        });
      continue;
    }
    if (feed?.gold_gram) {
      rows.push({
        country: c.code,
        currency: c.currency,
        day: today,
        gold_gram: feed.gold_gram,
        // Local board without silver: fall back to converted global spot.
        silver_gram: feed.silver_gram ?? (silverOz && rate0 ? (silverOz / OZ) * rate0 : null),
        source: feed.silver_gram ? feed.source : `${feed.source} + spot silver`,
      });
      continue;
    }
    const rate = c.currency === "USD" ? 1 : rates[c.currency];
    if (!goldOz || !rate) continue;
    rows.push({
      country: c.code,
      currency: c.currency,
      day: today,
      gold_gram: (goldOz / OZ) * rate,
      silver_gram: silverOz ? (silverOz / OZ) * rate : null,
      source: "gold-api.com — spot XAU/XAG",
    });
  }

  if (!rows.length) return { recorded: 0, source: "none", countries: [] };
  const { error } = await supabaseAdmin
    .from("nisab_history")
    .upsert(rows, { onConflict: "country,day" });
  if (error) throw new Error(`nisab_history: ${error.message}`);
  return {
    recorded: rows.length,
    source: goldOz ? "spot+feed" : "feed",
    countries: rows.map((r) => String(r["country"])),
  };
}

/** Reads local jeweller boards and stores today's row, limited to `only` when given. */
export async function saveJewelerFeed(
  db: SupabaseClient,
  today: string,
  only?: ReadonlySet<string>,
): Promise<{ rows: FeedRow[]; alerts: string[]; errors: string[] }> {
  const collected = await collectFeed(only);
  const errors = collected.errors;
  if (!collected.rows.length) return { rows: [], alerts: [], errors };

  // Sanity check: skip rows that deviate > 15% from the spot conversion.
  let spotGoldOz = 0;
  let fx: Record<string, number> = {};
  try {
    const [g, r] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", {
        signal: AbortSignal.timeout(10_000),
      }).then((x) => x.json()),
      fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(10_000),
      }).then((x) => x.json()),
    ]);
    spotGoldOz = Number(g?.price) || 0;
    fx = (r?.rates ?? {}) as Record<string, number>;
  } catch {
    /* no spot: rows pass unchecked */
  }
  const rows: FeedRow[] = [];
  for (const row of collected.rows) {
    const rate = row.currency === "USD" ? 1 : fx[row.currency];
    const spot = spotGoldOz && rate ? (spotGoldOz / OZ) * rate : 0;
    const dev = spot && row.gold_gram ? ((row.gold_gram - spot) / spot) * 100 : 0;
    if (Math.abs(dev) > MAX_SPOT_DEVIATION_PCT) {
      errors.push(`${row.country}: انحراف ${dev.toFixed(1)}% عن السعر العالمي — تم التجاهل`);
      await db.from("audit_log").insert({
        action: "feed_row_skipped",
        entity: "jeweler_feed",
        entity_id: null,
        reason: `deviation ${dev.toFixed(1)}% > ${MAX_SPOT_DEVIATION_PCT}%`,
        meta: {
          country: row.country,
          source: row.source,
          gold_gram: row.gold_gram,
          spot_gram: spot,
        },
      });
      continue;
    }
    rows.push(row);
  }
  const alerts: string[] = [];

  for (const row of rows) {
    const { data: prev } = await db
      .from("jeweler_feed")
      .select("gold_gram")
      .eq("country", row.country)
      .lt("day", today)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();
    const before = prev?.gold_gram ? Number(prev.gold_gram) : null;
    const change = before && row.gold_gram ? ((row.gold_gram - before) / before) * 100 : null;
    const { error: feedError } = await db.from("jeweler_feed").upsert(
      {
        country: row.country,
        currency: row.currency,
        source: row.source,
        source_url: row.source_url,
        gold_gram: row.gold_gram,
        buyback_gram: row.buyback_gram,
        silver_gram: row.silver_gram,
        silver_buyback_gram: row.silver_buyback_gram ?? null,
        day: today,
        change_pct: change,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "country,day" },
    );
    if (feedError) throw new Error("Could not persist jeweler prices");
    if (change != null && Math.abs(change) >= BIG_CHANGE_PCT) {
      alerts.push(`${row.country}: ${change > 0 ? "+" : ""}${change.toFixed(1)}% (${row.source})`);
    }
  }

  return { rows, alerts, errors };
}

export async function notifyFeedAdmins(db: SupabaseClient, alerts: string[], errors: string[]) {
  if (alerts.length || errors.length) {
    const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
    const body = [
      alerts.length ? `تغيّر كبير في سعر الصاغة: ${alerts.join(" · ")}` : "",
      errors.length ? `مصادر تعذّرت قراءتها: ${errors.join(" · ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    if (admins?.length) {
      await db.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          kind: alerts.length ? "jeweler_big_change" : "jeweler_feed_error",
          title: alerts.length
            ? "تنبيه: تغيّر كبير في أسعار الصاغة"
            : "تنبيه: تعذّر تحديث بعض مصادر الصاغة",
          body,
        })),
      );
    }
  }
}

/** Durable admin-only status for one scheduled run; the first call creates the row. */
export function scheduledRunSaver(db: SupabaseClient, reason: string) {
  const runId = crypto.randomUUID();
  return async (run: ScheduledFeedRun, first: boolean) => {
    const meta = { ...run };
    const { error } = first
      ? await db.from("audit_log").insert({
          id: runId,
          action: "scheduled_feed_run",
          entity: "jeweler_feed",
          reason,
          meta,
        })
      : await db.from("audit_log").update({ meta }).eq("id", runId);
    if (error) throw new Error("Could not save scheduled update status");
  };
}
