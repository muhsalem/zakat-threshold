import { describe, it, expect } from "vitest";
import { deriveSubscriptionRow } from "./subscriptionRow.ts";

const NOW = Date.parse("2026-08-13T00:00:00.000Z");

describe("deriveSubscriptionRow", () => {
  it("اشتراك شهري: الدورية شهرية وتاريخ التجديد من current_period_end بالثواني", () => {
    const periodEnd = Math.floor(Date.parse("2026-09-13T00:00:00.000Z") / 1000);
    const r = deriveSubscriptionRow({
      mode: "subscription",
      amountTotalMinor: 14900,
      currency: "usd",
      recurringInterval: "month",
      currentPeriodEndSec: periodEnd,
      now: NOW,
    });
    expect(r).toEqual({
      amount: 149,
      currency: "USD",
      billingPeriod: "monthly",
      renewsAt: "2026-09-13T00:00:00.000Z",
    });
  });

  it("اشتراك سنوي", () => {
    const r = deriveSubscriptionRow({
      mode: "subscription",
      amountTotalMinor: 9900,
      currency: "usd",
      recurringInterval: "year",
      currentPeriodEndSec: Math.floor(Date.parse("2027-08-13T00:00:00.000Z") / 1000),
      now: NOW,
    });
    expect(r.billingPeriod).toBe("yearly");
    expect(r.amount).toBe(99);
    expect(r.renewsAt).toBe("2027-08-13T00:00:00.000Z");
  });

  it("دفعة واحدة: one_time بلا تجديد", () => {
    const r = deriveSubscriptionRow({
      mode: "payment",
      amountTotalMinor: 1900,
      currency: "usd",
      now: NOW,
    });
    expect(r).toEqual({
      amount: 19,
      currency: "USD",
      billingPeriod: "one_time",
      renewsAt: null,
    });
  });

  it("دفع مسبق 3 سنوات: one_time لكن بتجديد بعد 3 سنوات", () => {
    const r = deriveSubscriptionRow({
      mode: "payment",
      amountTotalMinor: 39900,
      currency: "usd",
      prepayYears: "3",
      now: NOW,
    });
    expect(r.billingPeriod).toBe("one_time");
    expect(r.renewsAt).toBe(new Date(NOW + 3 * 365 * 86_400_000).toISOString());
  });

  it("يحوّل الوحدات الصغرى إلى وحدات كاملة ولا يفقد الكسور", () => {
    expect(deriveSubscriptionRow({ mode: "payment", amountTotalMinor: 4999, now: NOW }).amount).toBe(
      49.99,
    );
    expect(deriveSubscriptionRow({ mode: "payment", amountTotalMinor: 1, now: NOW }).amount).toBe(
      0.01,
    );
  });

  it("العملة تُرفع دائماً — العمود يخزّن USD لا usd", () => {
    expect(deriveSubscriptionRow({ mode: "payment", currency: "eur", now: NOW }).currency).toBe(
      "EUR",
    );
    expect(deriveSubscriptionRow({ mode: "payment", currency: null, now: NOW }).currency).toBe(
      "USD",
    );
  });

  it("قيم غياب آمنة: مبلغ صفر بدل NaN", () => {
    const r = deriveSubscriptionRow({ mode: "payment", now: NOW });
    expect(r.amount).toBe(0);
    expect(r.renewsAt).toBeNull();
  });

  it("اشتراك بلا current_period_end: لا يُختلق تاريخ تجديد", () => {
    const r = deriveSubscriptionRow({
      mode: "subscription",
      recurringInterval: "month",
      currentPeriodEndSec: null,
      now: NOW,
    });
    expect(r.renewsAt).toBeNull();
  });

  it("prepayYears غير رقمي لا يُنتج تاريخاً فاسداً", () => {
    for (const bad of ["", "abc", "0", null, "-2"]) {
      const r = deriveSubscriptionRow({
        mode: "payment",
        prepayYears: bad,
        now: NOW,
      });
      expect(r.renewsAt).toBeNull();
    }
  });

  it("كل الدوريات المُنتَجة ضمن قيم CHECK constraint", () => {
    const allowed = ["monthly", "yearly", "lifetime", "one_time"];
    for (const interval of ["day", "week", "month", "year", "fortnight", null]) {
      const r = deriveSubscriptionRow({ mode: "subscription", recurringInterval: interval, now: NOW });
      expect(allowed).toContain(r.billingPeriod);
    }
    expect(allowed).toContain(deriveSubscriptionRow({ mode: "payment", now: NOW }).billingPeriod);
  });

  it("دورية أسبوعية لا تُوصَف بأنها سنوية", () => {
    expect(
      deriveSubscriptionRow({ mode: "subscription", recurringInterval: "week", now: NOW })
        .billingPeriod,
    ).toBe("monthly");
  });
});
