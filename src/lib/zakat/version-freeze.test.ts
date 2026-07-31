import { describe, it, expect } from "vitest";
import {
  createVersionStamp,
  checkReproducibility,
  derivePriceVersion,
  formatVersionFooter,
  CALCULATION_ENGINE_VERSION,
  type PriceSnapshot,
} from "./version-freeze";
import { RULES_CATALOG_VERSION } from "./rules-catalog";

const snapshots: PriceSnapshot[] = [
  {
    symbol: "XAU",
    price: 300,
    currency: "EGP",
    provider: "metals-api",
    capturedAt: "2026-03-01T10:00:00Z",
  },
  {
    symbol: "XAG",
    price: 4,
    currency: "EGP",
    provider: "metals-api",
    capturedAt: "2026-03-01T10:00:00Z",
  },
];

describe("Version Freeze", () => {
  it("يختم الحساب بإصدارات القواعد والمحرك", () => {
    const stamp = createVersionStamp({ methodologyVersion: "1.0.0", priceSnapshots: snapshots });
    expect(stamp.rulesVersion).toBe(RULES_CATALOG_VERSION);
    expect(stamp.engineVersion).toBe(CALCULATION_ENGINE_VERSION);
    expect(stamp.priceSnapshots).toHaveLength(2);
    expect(stamp.frozenAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("يشتق إصدار سعر مستقراً من نفس اللقطات", () => {
    expect(derivePriceVersion(snapshots)).toBe(derivePriceVersion([...snapshots].reverse()));
  });

  it("يستخدم أحدث طابع زمني في إصدار السعر", () => {
    const v = derivePriceVersion([
      ...snapshots,
      {
        symbol: "USD",
        price: 48,
        currency: "EGP",
        provider: "metals-api",
        capturedAt: "2026-03-02T09:00:00Z",
      },
    ]);
    expect(v).toContain("2026-03-02T09:00:00Z");
  });

  it("يتعامل مع غياب الأسعار", () => {
    expect(derivePriceVersion([])).toBe("no-prices");
  });

  it("يعتبر النتيجة قابلة لإعادة الإنتاج عند تطابق الإصدارات", () => {
    const stamp = createVersionStamp({ methodologyVersion: "1.0.0" });
    const check = checkReproducibility(stamp);
    expect(check.reproducible).toBe(true);
    expect(check.drift).toEqual([]);
  });

  it("يكشف انحراف الإصدارات ولا يعيد الحساب", () => {
    const stamp = createVersionStamp({ methodologyVersion: "1.0.0" });
    const old = { ...stamp, rulesVersion: "2025.0.0", engineVersion: "2025.0.0" };
    const check = checkReproducibility(old);
    expect(check.reproducible).toBe(false);
    expect(check.drift.map((d) => d.field)).toEqual(["rulesVersion", "engineVersion"]);
    expect(check.message).toContain("جُمّدت");
  });

  it("ينتج تذييلاً يحتوي كل الإصدارات", () => {
    const footer = formatVersionFooter(
      createVersionStamp({ methodologyVersion: "1.0.0", priceSnapshots: snapshots }),
    );
    expect(footer).toContain("القواعد:");
    expect(footer).toContain("المحرك:");
    expect(footer).toContain("المنهجية:");
    expect(footer).toContain("الأسعار:");
  });
});
