/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeZakat, toAmount, type ZakatInputs } from "./zakat-calc.ts";

const empty: ZakatInputs = {
  cash: 0,
  business: 0,
  investments: 0,
  longTerm: 0,
  longTermPct: 100,
  receivables: 0,
  debts: 0,
  goldG: 0,
  karat: 24,
  jewelryG: 0,
  jewelryRule: "",
  silverG: 0,
  standard: "silver",
  solarYear: false,
};
const prices = { goldGram: 100, silverGram: 1, nisabGold: 8500, nisabSilver: 595 };

describe("toAmount", () => {
  it("treats blanks, junk and negatives as zero", () => {
    assert.equal(toAmount(""), 0);
    assert.equal(toAmount("abc"), 0);
    assert.equal(toAmount("-5"), 0);
    assert.equal(toAmount("12.5"), 12.5);
  });
});

describe("computeZakat", () => {
  it("charges 2.5% once net wealth reaches the chosen nisab", () => {
    const r = computeZakat({ ...empty, cash: 1000 }, prices);
    assert.equal(r.above, true);
    assert.equal(r.due, 25);
  });
  it("subtracts debts before comparing with the nisab", () => {
    const r = computeZakat({ ...empty, cash: 1000, debts: 600 }, prices);
    assert.equal(r.net, 400);
    assert.equal(r.above, false);
    assert.equal(r.due, 0);
  });
  it("gives no verdict without prices", () => {
    const r = computeZakat({ ...empty, cash: 1_000_000 }, null);
    assert.equal(r.above, false);
    assert.equal(r.due, 0);
  });
  it("leaves worn jewellery out until a ruling is chosen", () => {
    const base = { ...empty, jewelryG: 10, karat: 24 };
    const undecided = computeZakat(base, prices);
    assert.equal(undecided.metals, 0);
    assert.equal(undecided.jewelryUndecided, true);
    assert.equal(computeZakat({ ...base, jewelryRule: "include" }, prices).metals, 999);
    assert.equal(computeZakat({ ...base, jewelryRule: "exclude" }, prices).metals, 0);
  });
  it("scales gold by karat purity", () => {
    const r = computeZakat({ ...empty, goldG: 10, karat: 18 }, prices);
    assert.ok(Math.abs(r.metals - 750) < 1e-9);
  });
  it("counts only the zakatable share of long-term holdings and clamps it to 0–100", () => {
    assert.equal(computeZakat({ ...empty, longTerm: 1000, longTermPct: 30 }, prices).net, 300);
    assert.equal(computeZakat({ ...empty, longTerm: 1000, longTermPct: 250 }, prices).net, 1000);
  });
  it("uses the larger solar-year rate when asked", () => {
    const r = computeZakat({ ...empty, cash: 1000, solarYear: true }, prices);
    assert.ok(r.due > 25 && r.due < 26);
  });
});
