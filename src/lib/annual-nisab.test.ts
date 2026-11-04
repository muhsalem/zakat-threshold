import assert from "node:assert/strict";
import { it } from "node:test";
import {
  daysOfYear,
  historicalDue,
  historicalValuation,
  personalCalculationSchema,
  yearWindow,
} from "./annual-nisab";
const row = {
  id: "x",
  day: "2024-01-01",
  country: "EG",
  currency: "EGP",
  gold_gram: 4000,
  silver_gram: 50,
  gold_nisab: null,
  silver_nisab: null,
  source: "Saved source",
};
it("includes each UTC day of a leap year", () => {
  const days = daysOfYear(2024, "gregorian");
  assert.equal(days.length, 366);
  assert.equal(days[0], "2024-01-01");
  assert.equal(days.at(-1), "2024-12-31");
  assert.ok(days.includes("2024-02-29"));
});
it("uses contiguous Hijri annual boundaries", () => {
  assert.equal(yearWindow(1448, "hijri").end, yearWindow(1449, "hijri").start);
  assert.ok([354, 355].includes(daysOfYear(1448, "hijri").length));
});
it("does not substitute current prices or another day for missing history", () => {
  assert.equal(historicalValuation(undefined, "gold"), null);
  assert.equal(historicalValuation({ ...row, gold_gram: null, gold_nisab: 340000 }, "gold"), null);
});
it("calculates historical silver using the matching selected standard", () => {
  assert.equal(historicalValuation(row, "silver", 595)?.threshold, 29750);
  assert.equal(historicalValuation(row, "silver", 612.36)?.threshold, 30618);
});
it("pairs the gold weight with the silver standard", () => {
  assert.equal(historicalValuation(row, "gold", 595)?.threshold, 340000);
  assert.equal(historicalValuation(row, "gold", 612.36)?.threshold, 349920);
});
it("retains lunar and solar calculation rates and exact threshold comparison", () => {
  assert.equal(historicalDue(100000, 29750, "hijri").due, 2500);
  assert.equal(historicalDue(100000, 29750, "gregorian").due, 2577);
  assert.equal(historicalDue(29749, 29750, "hijri").due, 0);
  assert.equal(historicalDue(29750, 29750, "hijri").due, 743.75);
});
it("rejects unsupported historical standards and negative personal wealth", () => {
  const v = {
    historyId: "00000000-0000-4000-8000-000000000000",
    metal: "silver",
    silverWeight: 595,
    netWealth: 100000,
    basis: "hijri",
  };
  assert.equal(personalCalculationSchema.safeParse(v).success, true);
  assert.equal(personalCalculationSchema.safeParse({ ...v, silverWeight: 600 }).success, false);
  assert.equal(personalCalculationSchema.safeParse({ ...v, netWealth: -1 }).success, false);
});
