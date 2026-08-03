import { describe, it, expect } from "vitest";
import { computeContentHash } from "./engine";

describe("computeContentHash() — بصمة محتوى التقرير (SHA-256)", () => {
  it("حتمية: نفس المدخل يُنتج نفس البصمة دائماً", async () => {
    const payload = { title: "تقرير زكاة", amount: 12500, kind: "declaration" };
    const h1 = await computeContentHash(payload);
    const h2 = await computeContentHash(payload);
    expect(h1).toBe(h2);
  });

  it("حساسة: أي فرق في المدخل يُغيّر البصمة", async () => {
    const h1 = await computeContentHash({ amount: 12500 });
    const h2 = await computeContentHash({ amount: 12501 });
    expect(h1).not.toBe(h2);
  });

  it("تطابق قيمة SHA-256 معروفة (اختبار صحة الخوارزمية نفسها)", async () => {
    const h = await computeContentHash({ a: 1, b: "test" });
    expect(h).toBe("1e5d5cdc877a04ceb3d86ec5d57f088a03eef89a4d0669556f3feebfbd59868b");
  });

  it("كائن فارغ يُنتج بصمة صحيحة الطول (64 حرف hex)", async () => {
    const h = await computeContentHash({});
    expect(h).toHaveLength(64);
    expect(h).toBe("44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
  });

  it("ترتيب مفاتيح مختلف في JSON.stringify ينتج بصمة مختلفة (تحذير تصميمي معروف)", async () => {
    // ملاحظة: computeContentHash يعتمد على JSON.stringify مباشرة، وترتيب
    // المفاتيح في الكائن الأصلي يُغيّر الناتج — لذا يجب بناء الـsnapshot
    // بترتيب حقول ثابت قبل الحساب (كما يفعل ProfessionalPdfButton.tsx
    // بإنشاء snapshotForHash بترتيب صريح واحد لا يتغيّر).
    const h1 = await computeContentHash({ a: 1, b: 2 });
    const h2 = await computeContentHash({ b: 2, a: 1 });
    expect(h1).not.toBe(h2);
  });

  it("لا يعتمد على نوع القيم غير القابلة للتسلسل (undefined يُسقَط كـJSON.stringify القياسي)", async () => {
    const h1 = await computeContentHash({ a: 1, b: undefined });
    const h2 = await computeContentHash({ a: 1 });
    expect(h1).toBe(h2);
  });
});
