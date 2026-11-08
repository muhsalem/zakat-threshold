import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  safeSourceUrl,
  validateZakatAnswer,
  zakatQuestionSchema,
  type ZakatSource,
} from "./zakat-questions";

const sources: ZakatSource[] = [
  {
    id: "official-1",
    title: "بيت الزكاة",
    url: "https://www.zakathouse.org.kw",
    kind: "official",
    text: "نص موثق",
  },
];
describe("zakat question grounding", () => {
  it("rejects invented references", () => {
    assert.throws(
      () =>
        validateZakatAnswer(JSON.stringify({ answer: "جواب", sourceIds: ["invented"] }), sources),
      /UNKNOWN_SOURCE/,
    );
  });
  it("returns only cited server-owned references", () => {
    const result = validateZakatAnswer(
      JSON.stringify({ answer: "جواب", sourceIds: ["official-1", "official-1"] }),
      sources,
    );
    assert.deepEqual(result.sources, sources);
  });
  it("does not attach references to an unsupported answer", () => {
    assert.deepEqual(
      validateZakatAnswer(JSON.stringify({ answer: "لا تتوفر معلومات", sourceIds: [] }), sources)
        .sources,
      [],
    );
  });
  it("rejects unsafe source links", () => {
    assert.equal(safeSourceUrl("javascript:alert(1)"), false);
    assert.equal(safeSourceUrl("https://user:pass@example.com"), false);
    assert.equal(safeSourceUrl(sources[0]?.url ?? ""), true);
  });
  it("validates question input before inference", () => {
    assert.equal(
      zakatQuestionSchema.safeParse({ question: "", country: "EG", lang: "ar" }).success,
      false,
    );
    assert.equal(
      zakatQuestionSchema.safeParse({ question: "ما زكاة التجارة؟", country: "EG", lang: "ar" })
        .success,
      true,
    );
  });
});
