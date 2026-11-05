import { describe, expect, it } from "vitest";
import { parseNagmadin } from "./jeweler-feed.server";

describe("parseNagmadin", () => {
  it("reads 24K gold and silver gram prices in EGP", () => {
    const p = parseNagmadin({
      data: {
        gold_latest: { metal_prices: { XAU: { price_24k: 7260.12 } } },
        market_data: { rates_per_gram: { XAG: { current: 92.87 } } },
      },
    });
    expect(p).toEqual({ gold: 7260.12, silver: 92.87 });
  });
  it("returns null for missing prices", () => {
    expect(parseNagmadin({ data: {} })).toEqual({ gold: null, silver: null });
  });
});
