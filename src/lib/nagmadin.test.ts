import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNagmadin } from "./jeweler-feed.server";

test("parseNagmadin reads 24K gold and silver gram prices in EGP", () => {
  const p = parseNagmadin({
    data: {
      gold_latest: { metal_prices: { XAU: { price_24k: 7260.12 } } },
      market_data: { rates_per_gram: { XAG: { current: 92.87 } } },
    },
  });
  assert.deepEqual(p, { gold: 7260.12, silver: 92.87 });
});

test("parseNagmadin returns null for missing prices", () => {
  assert.deepEqual(parseNagmadin({ data: {} }), { gold: null, silver: null });
});
