/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createLimiter } from "./rate-limit.ts";

describe("createLimiter", () => {
  it("allows up to max hits per window, then blocks", () => {
    const hit = createLimiter();
    assert.equal(hit("a", 2, 1000, 0), true);
    assert.equal(hit("a", 2, 1000, 1), true);
    assert.equal(hit("a", 2, 1000, 2), false);
  });
  it("tracks keys independently and resets after the window", () => {
    const hit = createLimiter();
    assert.equal(hit("a", 1, 1000, 0), true);
    assert.equal(hit("a", 1, 1000, 10), false);
    assert.equal(hit("b", 1, 1000, 10), true);
    assert.equal(hit("a", 1, 1000, 1000), true);
  });
});
