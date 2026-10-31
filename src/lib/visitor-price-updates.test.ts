import { describe, it, expect } from "vitest";
import { createPriceUpdateTracker } from "./visitor-price-updates";

const row = { id: "quote-1", country: "EG", currency: "EGP", gold_gram: 5000, silver_gram: 60, buyback_gram: 4900 };
describe("visitor jeweler price alerts", () => {
  it("alerts when a public jeweler price changes", () => {
    const tracker = createPriceUpdateTracker("EG");
    tracker.seed("jeweler_feed", [row]);
    expect(tracker.accept("jeweler_feed", { ...row, gold_gram: 5100 })).toBe(true);
  });
  it("does not alert for initial rows, duplicate delivery or timestamp-only refresh", () => {
    const tracker = createPriceUpdateTracker("EG");
    tracker.seed("jeweler_feed", [row]);
    expect(tracker.accept("jeweler_feed", row)).toBe(false);
    expect(tracker.accept("jeweler_feed", { ...row, silver_gram: 61 })).toBe(true);
    expect(tracker.accept("jeweler_feed", { ...row, silver_gram: 61 })).toBe(false);
  });
  it("only alerts for the visitor's selected country", () => {
    expect(createPriceUpdateTracker("SA").accept("public_price_quotes", row)).toBe(false);
  });
});