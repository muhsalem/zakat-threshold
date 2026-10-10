import { test } from "node:test";
import { strict as assert } from "node:assert";
import { nisabShareMessage, nisabSharePath } from "./share-nisab";
test("share links target the selected country rather than ignored query parameters", () => {
  assert.equal(nisabSharePath("EG"), "/country/eg");
  assert.equal(nisabSharePath("SA"), "/country/sa");
});
test("sharing retains the UTC day and selected silver weight", () => {
  const message = nisabShareMessage({ title: "Nisab", location: "Egypt", day: "2026-10-10", goldLabel: "Gold", silverLabel: "Silver", gold: "8500 EGP", silver: "6123.6 EGP", silverWeight: 612.36, sources: "Local", note: "Calculated", url: "https://example.com/country/eg" });
  assert.ok(message.includes("2026-10-10 · UTC"));
  assert.ok(message.includes("612.36g"));
});