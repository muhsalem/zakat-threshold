/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCenturySeries } from "./century-series.ts";

const annual = [
  { year: 1950, gold: 35, silver: 0.7 },
  { year: 1975, gold: 140, silver: 4.4 },
  { year: 2025, gold: 3110.34768, silver: 31.1034768 },
];
const now = new Date(Date.UTC(2026, 5, 1));

describe("buildCenturySeries", () => {
  it("converts USD/oz to per-gram prices at the given rate", () => {
    const [, , last] = buildCenturySeries(2, { annual, now });
    assert.ok(last);
    assert.ok(Math.abs(last.gold - 200) < 1e-9);
    assert.ok(Math.abs(last.silver - 2) < 1e-9);
    assert.ok(Math.abs(last.ratio - 100) < 1e-9);
  });
  it("marks pre-1972 gold as an official fixed price", () => {
    const series = buildCenturySeries(1, { annual, now });
    assert.deepEqual(
      series.map((p) => p.official),
      [true, false, false],
    );
  });
  it("limits the window to the requested number of years", () => {
    const series = buildCenturySeries(1, { annual, now, years: 60 });
    assert.deepEqual(
      series.map((p) => p.year),
      [1975, 2025],
    );
  });
  it("appends the live quote for the current year", () => {
    const series = buildCenturySeries(1, {
      annual,
      now,
      live: { goldUsdOz: 4000, silverUsdOz: 50 },
    });
    const last = series[series.length - 1]!;
    assert.equal(last.year, 2026);
    assert.equal(last.live, true);
    assert.equal(last.ratio, 80);
  });
  it("returns nothing without a usable rate", () => {
    assert.deepEqual(buildCenturySeries(0, { annual, now }), []);
    assert.deepEqual(buildCenturySeries(Number.NaN, { annual, now }), []);
  });
});
