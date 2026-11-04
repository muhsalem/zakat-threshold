/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveNisab, gapMinutes, minuteStart, silverWeightFor } from "./nisab-at.ts";

describe("deriveNisab", () => {
  it("derives per-gram and nisab values from raw USD/oz and the day's rate", () => {
    const n = deriveNisab({ goldUsdOz: 3110.34768, silverUsdOz: 31.1034768, rate: 2 });
    assert.ok(n);
    assert.ok(Math.abs(n.goldGram - 200) < 1e-9);
    assert.ok(Math.abs(n.gold - 17000) < 1e-6); // 200 × 85 g
    assert.ok(Math.abs(n.silver - 1190) < 1e-6); // 2 × 595 g
  });
  it("uses the paired tola weights when asked", () => {
    const n = deriveNisab({
      goldUsdOz: 3110.34768,
      silverUsdOz: 31.1034768,
      rate: 1,
      standard: "tola",
    });
    assert.ok(n);
    assert.ok(Math.abs(n.gold - 100 * 87.48) < 1e-6);
    assert.ok(Math.abs(n.silver - 1 * 612.36) < 1e-6);
  });
  it("refuses unusable inputs", () => {
    assert.equal(deriveNisab({ goldUsdOz: 0, silverUsdOz: 30, rate: 1 }), null);
    assert.equal(deriveNisab({ goldUsdOz: 3000, silverUsdOz: 30, rate: Number.NaN }), null);
  });
  it("maps standards to silver weights", () => {
    assert.equal(silverWeightFor("default"), 595);
    assert.equal(silverWeightFor("tola"), 612.36);
  });
});

describe("time helpers", () => {
  it("truncates to the UTC minute", () => {
    assert.equal(minuteStart(new Date("2026-10-20T14:30:59.999Z")), "2026-10-20T14:30:00.000Z");
  });
  it("measures the gap and never goes negative", () => {
    assert.equal(gapMinutes("2026-10-20T14:30:00Z", "2026-10-20T14:00:00Z"), 30);
    assert.equal(gapMinutes("2026-10-20T14:00:00Z", "2026-10-20T14:30:00Z"), 0);
  });
});
