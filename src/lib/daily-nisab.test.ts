import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { dailyWindow, isCurrentUtcDay, nisabChange, PRICE_REFRESH_MS } from "./daily-nisab";

describe("daily nisab", () => {
  test("refreshes available prices every minute", () => {
    assert.equal(PRICE_REFRESH_MS, 60_000);
  });
  test("today ends exactly at UTC midnight", () => {
    assert.deepEqual(dailyWindow(new Date("2026-10-10T23:59:59Z")), { today: "2026-10-10", yesterday: "2026-10-09", remainingMs: 1000 });
    assert.deepEqual(dailyWindow(new Date("2026-10-11T00:00:00Z")), { today: "2026-10-11", yesterday: "2026-10-10", remainingMs: 86_400_000 });
  });
  test("compares gold nisab with yesterday's recorded gold value", () => {
    assert.deepEqual(nisabChange(85 * 110, 85 * 100), { difference: 850, percent: 10 });
  });
  test("compares silver nisab with yesterday's recorded silver value", () => {
    assert.deepEqual(nisabChange(595 * 9, 595 * 10), { difference: -595, percent: -10 });
  });
  test("does not fabricate changes when yesterday is unavailable", () => {
    assert.equal(nisabChange(100, null), null);
    assert.equal(nisabChange(100, 0), null);
  });
  test("a previous-day quote does not become a current-day quote after midnight", () => {
    assert.equal(isCurrentUtcDay("2026-10-10T23:59:00Z", "2026-10-11"), false);
    assert.equal(isCurrentUtcDay("2026-10-11T00:00:00Z", "2026-10-11"), true);
  });
});