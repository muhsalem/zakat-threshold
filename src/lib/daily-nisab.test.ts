import { describe, expect, test } from "bun:test";
import { dailyWindow, isCurrentUtcDay, nisabChange, PRICE_REFRESH_MS } from "./daily-nisab";

describe("daily nisab", () => {
  test("refreshes available prices every minute", () => {
    expect(PRICE_REFRESH_MS).toBe(60_000);
  });
  test("today ends exactly at UTC midnight", () => {
    expect(dailyWindow(new Date("2026-10-10T23:59:59Z"))).toEqual({ today: "2026-10-10", yesterday: "2026-10-09", remainingMs: 1000 });
    expect(dailyWindow(new Date("2026-10-11T00:00:00Z"))).toEqual({ today: "2026-10-11", yesterday: "2026-10-10", remainingMs: 86_400_000 });
  });
  test("compares gold nisab with yesterday's recorded gold value", () => {
    expect(nisabChange(85 * 110, 85 * 100)).toEqual({ difference: 850, percent: 10 });
  });
  test("compares silver nisab with yesterday's recorded silver value", () => {
    expect(nisabChange(595 * 9, 595 * 10)).toEqual({ difference: -595, percent: -10 });
  });
  test("does not fabricate changes when yesterday is unavailable", () => {
    expect(nisabChange(100, null)).toBeNull();
    expect(nisabChange(100, 0)).toBeNull();
  });
  test("a previous-day quote does not become a current-day quote after midnight", () => {
    expect(isCurrentUtcDay("2026-10-10T23:59:00Z", "2026-10-11")).toBe(false);
    expect(isCurrentUtcDay("2026-10-11T00:00:00Z", "2026-10-11")).toBe(true);
  });
});