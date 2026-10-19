/// <reference types="node" />
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reachConsensus, type SpotKind, type SpotQuote } from "./spot-consensus.ts";

const quote = (source: string, kind: SpotKind, gold: number, silver: number): SpotQuote => ({
  source,
  url: `https://example.com/${source}`,
  kind,
  goldUsdOz: gold,
  silverUsdOz: silver,
  at: "2026-10-19T00:00:00Z",
});

describe("reachConsensus", () => {
  it("returns null when nothing usable arrives", () => {
    assert.equal(reachConsensus([]), null);
    assert.equal(reachConsensus([quote("a", "spot", Number.NaN, 50)]), null);
    assert.equal(reachConsensus([quote("a", "spot", 4000, 0)]), null);
  });

  it("reports a single source honestly", () => {
    const c = reachConsensus([quote("a", "spot", 4000, 50)]);
    assert.equal(c?.status, "single");
    assert.equal(c?.goldUsdOz, 4000);
  });

  it("agrees when sources are close and keeps the spot quote as the headline", () => {
    const c = reachConsensus([
      quote("fut", "futures", 4010, 50.1),
      quote("spot", "spot", 4000, 50),
    ]);
    assert.equal(c?.status, "agree");
    assert.equal(c?.primary.source, "spot");
    assert.equal(c?.goldUsdOz, 4000);
    assert.equal(c?.used.length, 2);
  });

  it("warns when the gap is above the warning threshold but within the limit", () => {
    const c = reachConsensus([quote("spot", "spot", 4000, 50), quote("fut", "futures", 4080, 50)]);
    assert.equal(c?.status, "warn");
    assert.ok((c?.deviationPct ?? 0) > 1.5);
  });

  it("flags divergence between two sources instead of hiding it", () => {
    const c = reachConsensus([quote("spot", "spot", 4000, 50), quote("fut", "futures", 4300, 50)]);
    assert.equal(c?.status, "diverged");
    assert.equal(c?.primary.source, "spot");
    assert.equal(c?.rejected[0]?.source, "fut");
  });

  it("drops an outlier when a majority agrees", () => {
    const c = reachConsensus([
      quote("spot", "spot", 4600, 50),
      quote("b", "benchmark", 4000, 50),
      quote("fut", "futures", 4010, 50),
    ]);
    assert.equal(c?.status, "agree");
    assert.equal(c?.primary.source, "b");
    assert.ok(c?.rejected.some((r) => r.source === "spot" && r.reason.startsWith("outlier")));
  });

  it("ignores invalid quotes but records them", () => {
    const c = reachConsensus([quote("bad", "spot", -1, 50), quote("ok", "spot", 4000, 50)]);
    assert.equal(c?.status, "single");
    assert.deepEqual(c?.rejected, [{ source: "bad", reason: "invalid" }]);
  });
});
