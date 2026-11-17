/// <reference types="node" />
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";

import { buildOpenApi, HISTORY_RANGES } from "./openapi.ts";

const dir = new URL("../routes/api/public/v1/nisab/", import.meta.url);

describe("openapi description", () => {
  const spec = buildOpenApi("https://example.com");

  it("describes every public nisab route and nothing else", () => {
    const routes = readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => `/api/public/v1/nisab${f === "index.ts" ? "" : `/${f.replace(/\.ts$/, "")}`}`)
      .sort();
    assert.deepEqual(Object.keys(spec.paths).sort(), routes);
  });

  it("uses exactly the history ranges the handler accepts", () => {
    const source = readFileSync(new URL("history.ts", dir), "utf8");
    const accepted = [
      ...source.match(/const RANGES = \[([^\]]+)\]/)![1]!.matchAll(/"([^"]+)"/g),
    ].map((m) => m[1]);
    assert.deepEqual([...HISTORY_RANGES], accepted);
  });

  it("points at the requesting origin", () => {
    assert.equal(spec.servers[0].url, "https://example.com");
  });
});
