import { test } from "node:test";
import { strict as assert } from "node:assert";
import { COUNTRIES } from "./countries";
import {
  COUNTRY_TIME_ZONES,
  dueCountrySlots,
  pendingCountrySlots,
  type CountryPriceSlot,
} from "./country-price-schedule";

const slotFor = (at: string, country: string): CountryPriceSlot | undefined =>
  dueCountrySlots(new Date(at)).find((s) => s.country === country);

test("every country has a valid zone on a quarter-hour offset", () => {
  for (const { code } of COUNTRIES) {
    const timeZone = COUNTRY_TIME_ZONES[code];
    assert.ok(timeZone, code);
    const minute = new Intl.DateTimeFormat("en-CA", { timeZone, minute: "2-digit" }).format(
      new Date("2026-01-15T00:00:00Z"),
    );
    assert.equal(Number(minute) % 15, 0, code);
  }
});

test("each country gets two slots per local day from 15-minute calls", () => {
  const seen = new Map<string, Set<string>>();
  const start = Date.parse("2026-03-10T00:00:00Z");
  for (let i = 0; i < 96 * 3; i++) {
    for (const s of dueCountrySlots(new Date(start + i * 900_000))) {
      const keys = seen.get(s.country) ?? new Set<string>();
      keys.add(`${s.localDate}|${s.localHour}`);
      seen.set(s.country, keys);
    }
  }
  for (const { code } of COUNTRIES) {
    const count = seen.get(code)?.size ?? 0;
    assert.ok(count >= 6 && count <= 7, `${code}: ${count}`);
  }
});

test("slots follow local time", () => {
  assert.deepEqual(slotFor("2026-01-15T09:00:00Z", "EG"), {
    country: "EG",
    timeZone: "Africa/Cairo",
    localDate: "2026-01-15",
    localHour: 11,
    slotAt: "2026-01-15T09:00:00.000Z",
  });
  assert.equal(slotFor("2026-01-15T08:00:00Z", "SA")?.localHour, 11);
  assert.equal(slotFor("2026-01-15T20:00:00Z", "SA")?.localHour, 23);
  assert.equal(slotFor("2026-01-15T05:30:00Z", "IN")?.localHour, 11);
  assert.equal(slotFor("2026-01-15T05:15:00Z", "NP")?.localHour, 11);
  assert.equal(slotFor("2026-01-15T10:00:00Z", "EG"), undefined);
});

test("daylight saving moves the UTC instant", () => {
  assert.equal(slotFor("2026-01-15T16:00:00Z", "US")?.localHour, 11);
  assert.equal(slotFor("2026-07-15T15:00:00Z", "US")?.localHour, 11);
  assert.equal(slotFor("2026-07-15T15:30:00Z", "US")?.slotAt, "2026-07-15T15:00:00.000Z");
});

test("a late call still reaches its slot until the grace window ends", () => {
  const slot = slotFor("2026-01-15T21:45:00Z", "EG");
  assert.equal(slot?.localDate, "2026-01-15");
  assert.equal(slot?.localHour, 23);
  assert.equal(slot?.slotAt, "2026-01-15T21:00:00.000Z");
  assert.equal(slotFor("2026-01-15T22:00:00Z", "EG"), undefined);
});

test("completed slots are not run again", () => {
  const slot = slotFor("2026-01-15T09:00:00Z", "EG") as CountryPriceSlot;
  const done = { country: "EG", local_date: "2026-01-15", local_hour: 11 };
  assert.deepEqual(pendingCountrySlots([slot], [done]), []);
  assert.deepEqual(pendingCountrySlots([slot], [{ ...done, local_hour: 23 }]), [slot]);
});
