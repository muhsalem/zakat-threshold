import { describe, it, expect } from "vitest";
import { NISAB_PRICES_COLUMNS, NISAB_PRICES_ORDER_COLUMN, toPublicNisab } from "./nisabPrices";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["nisab_prices"]["Row"];

const row = {
  currency: "USD",
  country_code: "GLOBAL",
  gold_price: 140.25,
  silver_price: 1.7,
  gold_nisab_value: 11921.25,
  silver_nisab_value: 1011.5,
  created_at: "2026-09-01T00:00:05.000Z",
  updated_at: "2026-09-30T00:00:04.000Z",
  source: "gold-api.com",
  reliability: "direct",
};

describe("nisabPrices", () => {
  it("كل عمود مطلوب موجود فعلاً في جدول nisab_prices", () => {
    // يمنع العودة إلى أعمدة مخترعة كـ gold_price_per_gram أو recorded_at
    const known: Record<keyof Row, true> = {
      country_code: true,
      created_at: true,
      currency: true,
      event: true,
      gold_nisab_value: true,
      gold_price: true,
      hijri_year: true,
      id: true,
      month: true,
      reliability: true,
      reliability_score: true,
      silver_nisab_value: true,
      silver_price: true,
      source: true,
      updated_at: true,
      year: true,
    };
    const cols = NISAB_PRICES_COLUMNS.split(",").map((c) => c.trim());
    for (const c of [...cols, NISAB_PRICES_ORDER_COLUMN]) expect(known).toHaveProperty(c);
  });

  it("يبني الردّ العام من الأعمدة الحقيقية", () => {
    expect(toPublicNisab(row)).toEqual({
      currency: "USD",
      gold_price_per_gram: 140.25,
      silver_price_per_gram: 1.7,
      gold_nisab: 11921.25,
      silver_nisab: 1011.5,
      recorded_at: "2026-09-30T00:00:04.000Z",
      source: "gold-api.com",
      reliability: "direct",
    });
  });

  it("وقت التسجيل هو آخر تحديث لصفّ الشهر لا وقت إنشائه", () => {
    expect(toPublicNisab(row)!.recorded_at).toBe(row.updated_at);
    expect(toPublicNisab({ ...row, updated_at: null })!.recorded_at).toBe(row.created_at);
  });

  it("يحسب النصاب من السعر إن لم يُخزَّن", () => {
    const r = toPublicNisab({ ...row, gold_nisab_value: null, silver_nisab_value: null })!;
    expect(r.gold_nisab).toBe(11921.25);
    expect(r.silver_nisab).toBe(1011.5);
  });

  it("الأرقام المخزّنة نصّاً (numeric) تُقرأ أرقاماً", () => {
    const r = toPublicNisab({ ...row, gold_price: "140.25", silver_price: "1.7" })!;
    expect(r.gold_price_per_gram).toBe(140.25);
  });

  it("لا نصاب من سعر ذهب صفري أو مفقود", () => {
    expect(toPublicNisab(null)).toBeNull();
    expect(toPublicNisab({ ...row, gold_price: 0 })).toBeNull();
    expect(toPublicNisab({ ...row, gold_price: "abc" })).toBeNull();
  });
});

describe("NISAB_PRICES_LIVE_EVENT", () => {
  it("يطابق الحدث الذي تكتبه اللقطة اليومية", async () => {
    const { readFileSync } = await import("node:fs");
    const writer = readFileSync("src/routes/api/public/hooks/snapshot-prices.ts", "utf8");
    const { NISAB_PRICES_LIVE_EVENT } = await import("./nisabPrices");
    expect(writer).toContain(`event: "${NISAB_PRICES_LIVE_EVENT}"`);
  });
});
