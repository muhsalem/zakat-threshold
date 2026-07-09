import { z } from "zod";

/**
 * فحص صارم لمدخلات زكاة الشركات قبل الحساب.
 * جميع المبالغ بالعملة المحلية للشركة، والنسب من 0 إلى 1.
 */

const money = (label: string) =>
  z
    .number({ invalid_type_error: `${label}: أدخل رقماً صحيحاً` })
    .finite(`${label}: القيمة غير صالحة`)
    .min(0, `${label}: لا يمكن أن يكون أقل من صفر`);

const ratio = (label: string) =>
  z
    .number({ invalid_type_error: `${label}: أدخل نسبة بين 0 و 1` })
    .min(0, `${label}: النسبة لا تقل عن 0`)
    .max(1, `${label}: النسبة لا تتجاوز 1 (100%)`);

export const companyInputsSchema = z
  .object({
    totalAssets: money("إجمالي الموجودات"),
    totalEquity: money("حقوق الملكية"),
    currentAssets: money("الموجودات المتداولة").optional().default(0),
    currentLiabilities: money("المطلوبات المتداولة").optional().default(0),
    netIncome: z
      .number({ invalid_type_error: "صافي الدخل: أدخل رقماً" })
      .finite("صافي الدخل: قيمة غير صالحة")
      .optional()
      .default(0),
    exemptShareForeign: ratio("حصة الأجانب").optional().default(0),
    exemptShareGovernment: ratio("الحصة الحكومية").optional().default(0),
    exemptShareConditional: ratio("حصص مشروطة").optional().default(0),
    exemptShareNonMuslim: ratio("حصص غير المسلمين").optional().default(0),
  })
  .superRefine((v, ctx) => {
    if (v.totalEquity > v.totalAssets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalEquity"],
        message: "حقوق الملكية لا يمكن أن تتجاوز إجمالي الموجودات",
      });
    }
    if (v.currentAssets > v.totalAssets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentAssets"],
        message: "الموجودات المتداولة لا يمكن أن تتجاوز إجمالي الموجودات",
      });
    }
    if (v.currentLiabilities > v.totalAssets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentLiabilities"],
        message: "المطلوبات المتداولة لا يمكن أن تتجاوز إجمالي الموجودات",
      });
    }
    const exemptSum =
      v.exemptShareForeign +
      v.exemptShareGovernment +
      v.exemptShareConditional +
      v.exemptShareNonMuslim;
    if (exemptSum > 1.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exemptShareForeign"],
        message: `مجموع الحصص المعفاة (${(exemptSum * 100).toFixed(1)}%) يتجاوز 100%. راجع النسب.`,
      });
    }
    if (exemptSum >= 0.9999) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exemptShareForeign"],
        message: "جميع الحصص معفاة — لا يوجد وعاء زكوي للحساب.",
      });
    }
    if (v.totalAssets === 0 && v.totalEquity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalAssets"],
        message: "يجب إدخال إجمالي الموجودات أو حقوق الملكية قبل الحساب.",
      });
    }
  });

export type CompanyInputs = z.infer<typeof companyInputsSchema>;

export type ValidationError = { path: string; message: string };

export function validateCompanyInputs(
  raw: Partial<Record<keyof CompanyInputs, number>>,
): { ok: true; data: CompanyInputs } | { ok: false; errors: ValidationError[] } {
  const result = companyInputsSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}
