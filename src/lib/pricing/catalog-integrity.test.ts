import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PLANS } from "@/lib/geo/plans";

/**
 * حارس ضد عودة تعدّد كتالوجات الأسعار.
 *
 * كان المشروع يحمل كتالوجين: geo/plans.ts (المعروض للمستخدم) و payments.ts
 * الذي عرّف نفس المعرّفين startup وbusiness بسعر ودورية مختلفين — $149 شهرياً
 * مقابل $99 سنوياً. لم يكن أحدهما مستورداً فلم يظهر التعارض في أي شاشة، لكنه
 * كان قنبلة موقوتة: أول من يستورده يعرض سعراً مخالفاً لما تشحنه Stripe.
 *
 * هذه الاختبارات تقرأ المصدر نصّياً عمداً — لأن الغرض منع *وجود* تعريف ثانٍ،
 * لا التحقق من قيمه بعد استيراده.
 */
describe("سلامة كتالوج الأسعار", () => {
  it("لا يوجد كتالوج أسعار ثانٍ في payments.ts", () => {
    const src = readFileSync("src/lib/payments.ts", "utf8");
    // أي مصفوفة تحمل أسعاراً = كتالوج منافس
    expect(src).not.toMatch(/export\s+const\s+PLANS/);
    expect(src).not.toMatch(/priceUSD\s*:/);
  });

  it("كل معرّف في كتالوج العرض فريد", () => {
    const ids = PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("لا خطة مدفوعة بلا سعر ولا دورية", () => {
    for (const p of PLANS) {
      if (p.usdPrice === null) {
        // خطط "حسب الطلب" — يجب أن تُعلَن custom لا أن تُترك بسعر مفقود
        expect(p.billing).toBe("custom");
        continue;
      }
      expect(typeof p.usdPrice).toBe("number");
      expect(p.usdPrice).toBeGreaterThanOrEqual(0);
      expect(p.billing).toBeTruthy();
    }
  });

  it("معرّفات Stripe القابلة للشراء معرَّفة في create-checkout بنفس الأسماء", () => {
    // PlanId في payments.ts نوعٌ فقط، فنقرأه نصّياً ونطابقه بمفاتيح الدالة الطرفية
    const pay = readFileSync("src/lib/payments.ts", "utf8");
    const typeLine = pay.match(/export type PlanId\s*=\s*([^;]+);/);
    expect(typeLine).toBeTruthy();
    const declared = [...typeLine![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();

    const fn = readFileSync("supabase/functions/create-checkout/index.ts", "utf8");
    const block = fn.match(/const PLANS:\s*Record<PlanId,[^>]+>\s*=\s*\{([\s\S]*?)\n\};/);
    expect(block).toBeTruthy();
    const supported = [...block![1].matchAll(/^\s*([a-z_]+)\s*:/gm)].map((m) => m[1]).sort();

    expect(supported).toEqual(declared);
  });
});
