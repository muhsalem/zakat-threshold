import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import {
  BULLETIN_SCHEMA,
  buildBulletinPayload,
  signBulletin,
  verifyBulletin,
  type SnapshotRow,
} from "./bulletin";

const row: SnapshotRow = {
  day: "2026-10-31",
  taken_at: "2026-10-31T06:00:00Z",
  gold_usd_oz: 4000,
  silver_usd_oz: 50,
  consensus_status: "agree",
  deviation_pct: 0.4,
  fx_rates: { EGP: 48.5, SAR: 3.75 },
  fx_source: "open.er-api.com",
  metals_source: "gold-api.com",
  sources: [],
};

async function keyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  return {
    pkcs8: b64(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
    spki: b64(await crypto.subtle.exportKey("spki", pair.publicKey)),
  };
}

describe("signed bulletin", () => {
  test("derives per-gram prices from the ounce price and states the weights", () => {
    const payload = buildBulletinPayload(row, new Date("2026-11-01T00:00:00Z"));
    assert.equal(payload.schema, BULLETIN_SCHEMA);
    assert.ok(Math.abs(payload.goldUsdPerGram - 4000 / 31.1034768) < 1e-9);
    assert.deepEqual(payload.weights, { goldG: 85, silverG: 595 });
    assert.equal(payload.takenAt, "2026-10-31T06:00:00.000Z");
  });

  test("a signature verifies, and any change to the payload or the key is rejected", async () => {
    const { pkcs8, spki } = await keyPair();
    const other = await keyPair();
    const signed = await signBulletin(buildBulletinPayload(row, new Date()), pkcs8, "k1");
    assert.equal(signed.alg, "ES256");
    assert.equal(await verifyBulletin(signed, spki), true);
    const tampered = { ...signed, payload: signed.payload.replace("4000", "5000") };
    assert.equal(await verifyBulletin(tampered, spki), false);
    assert.equal(await verifyBulletin(signed, other.spki), false);
  });
});
