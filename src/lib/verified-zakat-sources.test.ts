import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verifiedZakatSources } from "./verified-zakat-sources";
const source = { id: "recent", country: "EG", authority: "دار الإفتاء", url: "https://www.dar-alifta.org/ar/fatwa/details/19768", source_kind: "fatwa", verified_excerpt: "خمسة وثمانين جرامًا", published_on: "2023-10-31", verified_at: "2026-10-31T06:00:00Z" };
describe("database verified official excerpts", () => {
  it("retains server-owned reference and actual publication date", () => {
    const result = verifiedZakatSources([source]);
    assert.equal(result[0]?.id, "official-recent");
    assert.equal(result[0]?.url, source.url);
    assert.equal(result[0]?.title, "دار الإفتاء · 2023-10-31");
  });
  it("never uses unchecked scraped snippets as verified authority", () => {
    assert.equal(verifiedZakatSources([{ ...source, verified_at: null }]).length, 0);
    assert.equal(verifiedZakatSources([{ ...source, verified_excerpt: null }]).length, 0);
  });
});