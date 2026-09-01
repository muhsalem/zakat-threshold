import { describe, it, expect } from "vitest";
import { intakeRowToClientInput, INTAKE_STATUSES, type IntakeQueueRow } from "./intakeQueueMapping";

const base: IntakeQueueRow = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "محمد",
  email: "a@b.com",
  kind: "company",
  country: "EG",
  madhab: "hanafi",
  hawl_date: "2026-12-01",
  breakdown: {
    breakdown: { cash: 1000, gold: 20, junk: "x", nested: { a: 1 } },
    intakeDetails: { mode: "quick", name: "محمد" },
  },
  notes: "ملاحظة",
  created_via: "public_intake",
  status: "pending",
  assigned_to: null,
  created_at: "2026-09-01T00:00:00Z",
};

describe("intakeRowToClientInput — القيم الصالحة تمرّ كما هي", () => {
  it("ينقل الحقول الأساسية", () => {
    const r = intakeRowToClientInput(base);
    expect(r.name).toBe("محمد");
    expect(r.email).toBe("a@b.com");
    expect(r.kind).toBe("company");
    expect(r.country).toBe("EG");
    expect(r.madhab).toBe("hanafi");
    expect(r.hawlDate).toBe("2026-12-01");
    expect(r.notes).toBe("ملاحظة");
    expect(r.createdVia).toBe("intake");
  });

  it("يستخرج المجمَّع الرقمي فقط من breakdown ويُسقط غير الرقمي", () => {
    const r = intakeRowToClientInput(base);
    expect(r.breakdown).toEqual({ cash: 1000, gold: 20 });
  });

  it("يمرّر intakeDetails كما هي", () => {
    expect(intakeRowToClientInput(base).intakeDetails).toEqual({ mode: "quick", name: "محمد" });
  });
});

describe("intakeRowToClientInput — لا ثقة بمصدر مجهول", () => {
  it("نوع غير معروف يعود إلى فرد", () => {
    expect(intakeRowToClientInput({ ...base, kind: "hacker" }).kind).toBe("individual");
  });

  it("مذهب غير معروف يعود إلى مختلط", () => {
    expect(intakeRowToClientInput({ ...base, madhab: "x" }).madhab).toBe("mixed");
  });

  it("تاريخ حول مشوَّه يُسقَط", () => {
    expect(intakeRowToClientInput({ ...base, hawl_date: "01/12/2026" }).hawlDate).toBeUndefined();
    expect(intakeRowToClientInput({ ...base, hawl_date: null }).hawlDate).toBeUndefined();
  });

  it("رمز دولة غير صالح يعود إلى SA", () => {
    expect(intakeRowToClientInput({ ...base, country: "Egypt" }).country).toBe("SA");
    expect(intakeRowToClientInput({ ...base, country: "" }).country).toBe("SA");
  });

  it("breakdown مفقود أو ليس كائناً → {} وintakeDetails → null", () => {
    const r1 = intakeRowToClientInput({ ...base, breakdown: null });
    expect(r1.breakdown).toEqual({});
    expect(r1.intakeDetails).toBeNull();
    const r2 = intakeRowToClientInput({
      ...base,
      breakdown: { breakdown: "str", intakeDetails: [1] },
    });
    expect(r2.breakdown).toEqual({});
    expect(r2.intakeDetails).toBeNull();
  });

  it("NaN وInfinity لا تمرّ إلى الوعاء", () => {
    const r = intakeRowToClientInput({
      ...base,
      breakdown: { breakdown: { cash: NaN, gold: Infinity, silver: 5 } },
    });
    expect(r.breakdown).toEqual({ silver: 5 });
  });

  it("البريد والملاحظات الفارغة تصير undefined لا null", () => {
    const r = intakeRowToClientInput({ ...base, email: null, notes: null });
    expect(r.email).toBeUndefined();
    expect(r.notes).toBeUndefined();
  });
});

describe("INTAKE_STATUSES", () => {
  it("يطابق تعليق الهجرة: pending | assigned | done", () => {
    expect([...INTAKE_STATUSES]).toEqual(["pending", "assigned", "done"]);
  });
});
