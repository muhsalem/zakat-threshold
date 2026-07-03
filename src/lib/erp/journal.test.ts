import { describe, it, expect } from "vitest";
import {
  buildNormalizedJournal,
  renderJournal,
  SUPPORTED_ERP_FORMATS,
  type ZakatCalcInput,
} from "./journal";

const sample: ZakatCalcInput = {
  entity_name: "Acme Halal Trading",
  reference: "ZKT-2026-0001",
  currency: "SAR",
  zakat_due: 12500.75,
  base_amount: 500030,
  rate: 0.025,
  period_start: "2025-07-04",
  period_end: "2026-07-03",
  jurisdiction: "SA",
  fatwa_authority: "ZATCA",
};

describe("ERP journal builder", () => {
  it("produces a balanced double-entry journal", () => {
    const j = buildNormalizedJournal(sample);
    const debits = j.lines.reduce((s, l) => s + l.debit, 0);
    const credits = j.lines.reduce((s, l) => s + l.credit, 0);
    expect(debits).toBeCloseTo(credits, 2);
    expect(debits).toBeCloseTo(sample.zakat_due, 2);
  });

  it("rejects non-positive zakat", () => {
    expect(() => buildNormalizedJournal({ ...sample, zakat_due: 0 })).toThrow();
  });

  it("renders all supported ERP formats without throwing", () => {
    const j = buildNormalizedJournal(sample);
    for (const fmt of SUPPORTED_ERP_FORMATS) {
      const out = renderJournal(j, fmt);
      expect(out.body.length).toBeGreaterThan(20);
      expect(out.contentType).toMatch(/json|xml|csv/);
    }
  });

  it("QuickBooks output includes DocNumber and posting types", () => {
    const j = buildNormalizedJournal(sample);
    const body = renderJournal(j, "quickbooks").body;
    expect(body).toContain(sample.reference!);
    expect(body).toContain("Debit");
    expect(body).toContain("Credit");
  });

  it("XBRL output includes zakat namespace and rate", () => {
    const j = buildNormalizedJournal(sample);
    const body = renderJournal(j, "xbrl").body;
    expect(body).toContain("zkt:ZakatDue");
    expect(body).toContain("0.025");
  });
});
