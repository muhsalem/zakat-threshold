import { test } from "node:test";
import { strict as assert } from "node:assert";
import { confirmAccountWrite, safeAuthNext } from "./account-actions";

test("failed preference or price writes never run success or clear input", async () => {
  let completed = 0;
  await assert.rejects(confirmAccountWrite(async () => ({ error: { message: "write denied" } }), () => { completed++; }), /write denied/);
  assert.equal(completed, 0);
});
test("confirmed writes complete exactly once", async () => {
  let completed = 0;
  await confirmAccountWrite(async () => ({ error: null }), () => { completed++; });
  assert.equal(completed, 1);
});
test("network failure preserves input and does not claim success", async () => {
  let completed = false;
  await assert.rejects(confirmAccountWrite(async () => { throw new Error("offline"); }, () => { completed = true; }), /offline/);
  assert.equal(completed, false);
});
test("login destinations cannot escape the app origin", () => {
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/\n/evil.test"]) assert.equal(safeAuthNext(value), "/partners");
  assert.equal(safeAuthNext("/alerts"), "/alerts");
  assert.equal(safeAuthNext("/control?tab=users"), "/control?tab=users");
});