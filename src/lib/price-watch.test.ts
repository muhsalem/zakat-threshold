import { test } from "node:test";
import { strict as assert } from "node:assert";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { priceUpdateKeys, watchUtcDay } from "./price-watch";

test("a published jeweller update re-fetches an already open quote and changes its price", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let price = 7260.12;
  const key = ["local-quote", "EG", "EGP"];
  client.setQueryData(key, price);
  const observer = new QueryObserver(client, { queryKey: key, staleTime: Infinity, queryFn: async () => price });
  const unsubscribe = observer.subscribe(() => {});
  price = 7300;
  await Promise.all(priceUpdateKeys("jeweler_feed").map(key => client.invalidateQueries({ queryKey: [key] })));
  assert.equal(client.getQueryData(key), 7300);
  unsubscribe();
  client.clear();
});

test("both approved public quotes and official announcements trigger their own checks", () => {
  assert.deepEqual(priceUpdateKeys("public_price_quotes"), ["local-quote", "previous-day-nisab"]);
  assert.deepEqual(priceUpdateKeys("official_nisab"), ["official-nisab"]);
  assert.equal(priceUpdateKeys("jeweler_feed").includes("history"), false);
});

test("an open page re-checks exactly at UTC midnight without waiting for a minute or a price event", () => {
  let now = new Date("2026-11-10T23:59:59.500Z");
  let checks = 0;
  let scheduled: (() => void) | undefined;
  let delay = 0;
  const clock = watchUtcDay({ now: () => now, refresh: () => checks++, schedule: (callback, ms) => {
    scheduled = callback; delay = ms; return () => {};
  } });
  assert.equal(delay, 500);
  now = new Date("2026-11-11T00:00:00Z");
  scheduled?.();
  assert.equal(checks, 1);
  assert.equal(delay, 86_400_000);
  clock.check();
  assert.equal(checks, 1);
  clock.stop();
});

test("waking after midnight recovers the new day and stopped watchers cannot refresh", () => {
  let now = new Date("2026-11-10T23:00:00Z");
  let checks = 0;
  const clock = watchUtcDay({ now: () => now, refresh: () => checks++, schedule: () => () => {} });
  now = new Date("2026-11-11T01:00:00Z");
  clock.check();
  assert.equal(checks, 1);
  clock.stop();
  now = new Date("2026-11-12T01:00:00Z");
  clock.check();
  assert.equal(checks, 1);
});