/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ttlCached } from "./ttl-cache.ts";

describe("ttlCached", () => {
  it("calls upstream once within the TTL and again after it", async () => {
    let clock = 0;
    let calls = 0;
    const get = ttlCached(async () => ++calls, { ttlMs: 1000, now: () => clock });
    assert.equal(await get(), 1);
    clock = 999;
    assert.equal(await get(), 1);
    clock = 1000;
    assert.equal(await get(), 2);
    assert.equal(calls, 2);
  });

  it("shares one request between concurrent callers", async () => {
    let calls = 0;
    const get = ttlCached(
      async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 10));
        return "x";
      },
      { ttlMs: 1000 },
    );
    const results = await Promise.all([get(), get(), get()]);
    assert.deepEqual(results, ["x", "x", "x"]);
    assert.equal(calls, 1);
  });

  it("does not retry a failed call until the backoff has passed", async () => {
    let clock = 0;
    let calls = 0;
    const get = ttlCached(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error("quota");
        return calls;
      },
      { ttlMs: 1000, failBackoffMs: 5000, now: () => clock },
    );
    await assert.rejects(get(), /quota/);
    clock = 4999;
    await assert.rejects(get(), /quota/);
    assert.equal(calls, 1);
    clock = 5000;
    assert.equal(await get(), 2);
  });

  it("never serves a value past its TTL when the refresh fails", async () => {
    let clock = 0;
    let calls = 0;
    const get = ttlCached(
      async () => {
        calls += 1;
        if (calls > 1) throw new Error("down");
        return "fresh";
      },
      { ttlMs: 100, failBackoffMs: 0, now: () => clock },
    );
    assert.equal(await get(), "fresh");
    clock = 200;
    await assert.rejects(get(), /down/);
  });
});
