import { describe, it, expect } from "vitest";
import { findFatwas, resolveRuling, FATWA_REGISTRY } from "./fatwaEngine";
import { getJurisdiction, listJurisdictions, JURISDICTIONS } from "./jurisdictions";

describe("Fatwa Engine", () => {
  it("سجل الفتاوى غير فارغ", () => {
    expect(FATWA_REGISTRY.length).toBeGreaterThan(0);
  });

  it("findFatwas يُرجع فقط الفتاوى المطابقة للموضوع", () => {
    const r = findFatwas({ topic: "crypto.bitcoin" });
    expect(r.every((x) => x.topic === "crypto.bitcoin")).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });

  it("resolveRuling يُقدّم الفتوى الوطنية لمصر على AAOIFI في البتكوين", () => {
    const r = resolveRuling({ topic: "crypto.bitcoin", jurisdiction: "EG" });
    expect(r?.authority).toBe("dar-al-ifta-eg");
  });

  it("resolveRuling يقع على AAOIFI إذا لم توجد فتوى وطنية", () => {
    const r = resolveRuling({ topic: "crypto.bitcoin", jurisdiction: "AE" });
    expect(r?.authority).toBe("aaoifi");
  });

  it("null لموضوع غير موجود", () => {
    expect(resolveRuling({ topic: "unknown.topic" })).toBeNull();
  });
});

describe("Jurisdictions", () => {
  it("12 ولاية على الأقل", () => {
    expect(listJurisdictions().length).toBeGreaterThanOrEqual(12);
  });

  it("كل ولاية لها عملة رسمية وهيئة", () => {
    for (const j of listJurisdictions()) {
      expect(j.currency).toMatch(/^[A-Z]{3}$/);
      expect(j.official_body.length).toBeGreaterThan(3);
    }
  });

  it("معدل الميلادي أعلى من الهجري (بسبب فارق الأيام)", () => {
    for (const j of listJurisdictions()) {
      expect(j.zakat_rate_gregorian).toBeGreaterThan(j.zakat_rate_hijri);
    }
  });

  it("السعودية تستخدم SAR", () => {
    expect(getJurisdiction("SA").currency).toBe("SAR");
    expect(JURISDICTIONS.SA.report_format).toBe("ZAT-01");
  });
});
