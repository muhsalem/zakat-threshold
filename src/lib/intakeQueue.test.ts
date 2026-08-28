import { describe, it, expect } from "vitest";
import { intakeInput } from "./intakeQueue.functions";

/**
 * التحقق الخادمي لطلبات الزوّار. المصيدة وفحص التوقيت في client-intake.tsx
 * يعملان في المتصفح وحده، ومن يرسل إلى الدالة مباشرة يتجاوزهما — فهذه
 * الاختبارات تغطّي الطبقة التي لا يستطيع المُرسِل تخطّيها.
 */
describe("intakeInput — المصيدة", () => {
  const valid = { name: "محمد", email: "a@b.com" };

  it("يقبل الطلب حين تكون المصيدة فارغة", () => {
    expect(intakeInput.safeParse(valid).success).toBe(true);
    expect(intakeInput.safeParse({ ...valid, hp: "" }).success).toBe(true);
  });

  it("يرفض الطلب حين تُملأ المصيدة", () => {
    expect(intakeInput.safeParse({ ...valid, hp: "bot" }).success).toBe(false);
  });
});

describe("intakeInput — حدود الحقول", () => {
  const valid = { name: "محمد", email: "a@b.com" };

  it("يرفض الاسم القصير والطويل", () => {
    expect(intakeInput.safeParse({ ...valid, name: "م" }).success).toBe(false);
    expect(intakeInput.safeParse({ ...valid, name: "م".repeat(101) }).success).toBe(false);
  });

  it("يرفض البريد غير الصالح", () => {
    expect(intakeInput.safeParse({ ...valid, email: "لا-بريد" }).success).toBe(false);
  });

  it("يرفض نوعاً غير معروف", () => {
    expect(intakeInput.safeParse({ ...valid, kind: "hacker" }).success).toBe(false);
  });

  it("يرفض تاريخ حول بصيغة خاطئة", () => {
    expect(intakeInput.safeParse({ ...valid, hawlDate: "2026/01/01" }).success).toBe(false);
    expect(intakeInput.safeParse({ ...valid, hawlDate: "2026-01-01" }).success).toBe(true);
  });

  it("يرفض ملاحظات تتجاوز الحد", () => {
    expect(intakeInput.safeParse({ ...valid, notes: "x".repeat(2001) }).success).toBe(false);
  });

  it("يرفض رمز دولة بغير حرفين", () => {
    expect(intakeInput.safeParse({ ...valid, country: "SAU" }).success).toBe(false);
  });
});

describe("intakeInput — القيم الافتراضية", () => {
  it("يملأ الافتراضيات حين تُغفَل", () => {
    const r = intakeInput.parse({ name: "محمد", email: "a@b.com" });
    expect(r.kind).toBe("individual");
    expect(r.country).toBe("SA");
    expect(r.madhab).toBe("mixed");
    expect(r.breakdown).toEqual({});
  });

  it("لا يثق بالحالة القادمة من المُرسِل: status وcreated_via ليسا من المدخلات", () => {
    const r = intakeInput.parse({
      name: "محمد",
      email: "a@b.com",
      status: "done",
      created_via: "spoofed",
    } as never);
    expect(r).not.toHaveProperty("status");
    expect(r).not.toHaveProperty("created_via");
  });
});
