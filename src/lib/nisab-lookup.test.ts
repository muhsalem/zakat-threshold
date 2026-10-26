/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lookupNisabAt } from "./nisab-lookup.server.ts";

type Row = Record<string, unknown>;
type Result = { data: Row | null; error: { code?: string } | null };

/** A minimal chainable stand-in for the Supabase query builder: one canned result per table. */
function fakeDb(results: Record<string, Result>) {
  return {
    from(table: string) {
      const result = results[table] ?? { data: null, error: null };
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "lte", "eq", "order", "limit"])
        builder[method] = () => builder;
      builder["maybeSingle"] = () => Promise.resolve(result);
      return builder;
    },
  } as never;
}

const snapshot: Row = {
  day: "2026-10-20",
  taken_at: "2026-10-20T06:00:05Z",
  gold_usd_oz: 3110.34768,
  silver_usd_oz: 31.1034768,
  metals_source: "gold-api.com",
  consensus_status: "agree",
  fx_rates: { USD: 1, EGP: 50 },
};
const tick: Row = {
  ts: "2026-10-20T14:30:00Z",
  gold_usd_oz: 3110.34768,
  silver_usd_oz: 31.1034768,
  source: "gold-api.com",
  status: "agree",
};
const at = "2026-10-20T14:45:00Z";

describe("lookupNisabAt", () => {
  it("derives a country's nisab from the nearest minute record and that day's FX", async () => {
    const r = await lookupNisabAt(
      "EG",
      at,
      "default",
      fakeDb({
        market_ticks: { data: tick, error: null },
        price_snapshots: { data: snapshot, error: null },
      }),
    );
    assert.equal(r.found, true);
    if (!r.found) return;
    assert.equal(r.basis, "tick");
    assert.equal(r.gapMinutes, 15);
    assert.equal(r.currency, "EGP");
    assert.ok(Math.abs(r.nisab.goldGram - 5000) < 1e-6); // 100 USD/g × 50
    assert.ok(Math.abs(r.nisab.gold - 5000 * 85) < 1e-3);
  });

  it("falls back to the daily snapshot when no minute record is near", async () => {
    const r = await lookupNisabAt(
      "EG",
      at,
      "default",
      fakeDb({
        market_ticks: { data: null, error: null },
        price_snapshots: { data: snapshot, error: null },
      }),
    );
    assert.equal(r.found && r.basis, "daily");
  });

  it("treats a minute record older than six hours as too stale to call exact", async () => {
    const old = { ...tick, ts: "2026-10-20T01:00:00Z" };
    const r = await lookupNisabAt(
      "EG",
      at,
      "default",
      fakeDb({
        market_ticks: { data: old, error: null },
        price_snapshots: { data: snapshot, error: null },
      }),
    );
    assert.equal(r.found && r.basis, "daily");
  });

  it("falls back to the stored per-country day row before minute recording began", async () => {
    const r = await lookupNisabAt(
      "EG",
      at,
      "tola",
      fakeDb({
        nisab_history: {
          data: {
            day: "2026-10-19",
            currency: "EGP",
            gold_gram: 5000,
            silver_gram: 60,
            source: "history",
          },
          error: null,
        },
      }),
    );
    assert.equal(r.found, true);
    if (!r.found) return;
    assert.equal(r.basis, "history");
    assert.ok(Math.abs(r.nisab.gold - 5000 * 87.48) < 1e-6);
    assert.ok(Math.abs(r.nisab.silver - 60 * 612.36) < 1e-6);
  });

  it("reports no data, invalid input and an unreachable database distinctly", async () => {
    const empty = fakeDb({});
    assert.deepEqual(await lookupNisabAt("EG", at, "default", empty), {
      found: false,
      reason: "no-data",
    });
    assert.deepEqual(await lookupNisabAt("EG", "not a date", "default", empty), {
      found: false,
      reason: "invalid",
    });
    assert.deepEqual(await lookupNisabAt("ZZ", at, "default", empty), {
      found: false,
      reason: "invalid",
    });
    const down = fakeDb({
      market_ticks: { data: null, error: {} },
      price_snapshots: { data: null, error: {} },
    });
    assert.deepEqual(await lookupNisabAt("EG", at, "default", down), {
      found: false,
      reason: "unavailable",
    });
  });
});
