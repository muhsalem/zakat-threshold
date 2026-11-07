import { test } from "node:test";
import { strict as assert } from "node:assert";
import { countryPriceRequestSchema, requestedPriceCountries } from "./country-price-request";

test("temporary hourly Egypt mode updates Egypt only", () => {
  assert.deepEqual([...requestedPriceCountries("egypt-hourly") ?? []], ["EG"]);
});
test("final schedule retains twice-daily country slot selection", () => {
  assert.equal(requestedPriceCountries("hourly"), null);
  assert.equal(requestedPriceCountries("local-slots"), null);
});
test("caller cannot supply arbitrary countries or override execution time", () => {
  assert.equal(countryPriceRequestSchema.safeParse({ kind: "egypt-hourly", countries: ["SA"] }).success, false);
  assert.equal(countryPriceRequestSchema.safeParse({ kind: "force" }).success, false);
});