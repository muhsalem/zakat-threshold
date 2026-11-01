import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCalculatorThreshold, type OfficialThreshold } from "./calculator-threshold";

const official: OfficialThreshold = {
  country: "EG",
  currency: "EGP",
  announced_on: "2026-10-30",
  gold_nisab: 420000,
  silver_nisab: 50000,
  authority: "جهة رسمية",
  source_url: null,
};
const input = {
  official,
  country: "EG",
  currency: "EGP",
  day: "2026-10-30",
  metal: "gold" as const,
  calculated: 410000,
};
describe("automatic calculator threshold", () => {
  it("uses today's matching official metal value", () => {
    assert.equal(resolveCalculatorThreshold(input).value, 420000);
    assert.equal(resolveCalculatorThreshold({ ...input, metal: "silver" }).value, 50000);
    assert.equal(resolveCalculatorThreshold(input).origin, "official");
  });
  it("falls back to calculated prices when no official record exists", () => {
    assert.equal(resolveCalculatorThreshold({ ...input, official: null }).value, 410000);
  });
  it("does not treat historical or future announcements as today's threshold", () => {
    for (const day of ["2026-10-29", "2026-10-31"])
      assert.equal(resolveCalculatorThreshold({ ...input, day }).value, 410000);
  });
  it("never applies another country's or currency's official amount", () => {
    assert.equal(resolveCalculatorThreshold({ ...input, country: "SA" }).value, 410000);
    assert.equal(resolveCalculatorThreshold({ ...input, currency: "USD" }).value, 410000);
  });
  it("resolves missing official values per metal without suppressing the other", () => {
    const row = { ...official, silver_nisab: null };
    assert.equal(resolveCalculatorThreshold({ ...input, official: row }).origin, "official");
    assert.equal(
      resolveCalculatorThreshold({ ...input, official: row, metal: "silver" }).origin,
      "calculated",
    );
  });
  it("does not produce a threshold from zero or unavailable data", () => {
    assert.equal(
      resolveCalculatorThreshold({ ...input, official: null, calculated: null }).value,
      null,
    );
    assert.equal(
      resolveCalculatorThreshold({
        ...input,
        official: { ...official, gold_nisab: 0 },
        calculated: 0,
      }).value,
      null,
    );
  });
});
