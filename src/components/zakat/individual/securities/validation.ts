import { z } from "zod";

/**
 * تحقق صارم لمدخلات قسم زكاة الأوراق المالية (SecuritiesSection)
 * و ESOP/RSU (EsopZakatSection). كل حقل رقمي:
 * - يجب أن يكون سلسلة رقمية صحيحة (أو فارغة عند السماح).
 * - غير سالب.
 * - محدود بسقف منطقي لمنع تجاوز الحدود العددية.
 */

const MAX_MONEY = 1e15; // سقف عام لأي قيمة نقدية/كمية
const MAX_QTY = 1e12;

// سلسلة رقم اختيارية: فارغة => 0
const numString = (opts: { min?: number; max?: number; label: string; allowEmpty?: boolean }) =>
  z
    .string()
    .trim()
    .refine((v) => (opts.allowEmpty !== false && v === "") || /^-?\d+(?:[.,]\d+)?$/.test(v), {
      message: `${opts.label}: أدخل رقمًا صحيحًا (بدون أحرف أو رموز).`,
    })
    .refine(
      (v) => {
        if (v === "") return true;
        const n = parseFloat(v.replace(",", "."));
        return Number.isFinite(n);
      },
      { message: `${opts.label}: القيمة غير صالحة.` },
    )
    .refine(
      (v) => {
        if (v === "") return true;
        const n = parseFloat(v.replace(",", "."));
        return n >= (opts.min ?? 0);
      },
      { message: `${opts.label}: لا يمكن أن يكون أقل من ${opts.min ?? 0}.` },
    )
    .refine(
      (v) => {
        if (v === "") return true;
        const n = parseFloat(v.replace(",", "."));
        return n <= (opts.max ?? MAX_MONEY);
      },
      { message: `${opts.label}: يتجاوز الحد المسموح (${opts.max ?? MAX_MONEY}).` },
    );

// ------------- Securities Row -------------

export const securityRowSchema = z
  .object({
    kind: z.enum([
      "stock_trade",
      "stock_invest",
      "sukuk",
      "bond",
      "mutual_islamic",
      "mutual_conv",
      "etf",
      "takaful",
      "insurance_conv",
    ]),
    company: z.string().trim().max(200, "اسم الشركة أطول من 200 حرف."),
    ticker: z
      .string()
      .trim()
      .max(20, "الرمز أطول من 20 حرفًا.")
      .regex(/^[A-Za-z0-9.\-_]*$/, "الرمز يقبل أحرف/أرقام/(.-_) فقط."),
    purchaseDate: z
      .string()
      .trim()
      .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "تاريخ غير صالح.")
      .refine(
        (v) => v === "" || new Date(v).getTime() <= Date.now() + 24 * 3600 * 1000,
        "تاريخ الشراء لا يمكن أن يكون في المستقبل.",
      ),
    qty: numString({ label: "الكمية", max: MAX_QTY }),
    price: numString({ label: "سعر الوحدة", max: MAX_MONEY }),
    shariaCompliant: z.enum(["yes", "no", "unknown"]),
    shariaIndex: z.string().trim().max(120, "اسم المؤشر أطول من 120 حرف."),
    purifyPct: numString({ label: "نسبة التطهير", max: 100 }),
    zakatableAssetsPct: numString({ label: "نسبة الموجودات الزكوية", max: 100 }),
    auditor: z.string().trim().max(200, "اسم جهة التدقيق أطول من 200 حرف."),
    notes: z.string().trim().max(1000, "الملاحظات أطول من 1000 حرف."),
  })
  .superRefine((r, ctx) => {
    // اشتراط اسم الشركة عند عدم تأكيد التوافق الشرعي و وجود قيمة سوقية
    const qty = parseFloat(r.qty || "0") || 0;
    const price = parseFloat(r.price || "0") || 0;
    if (
      (r.shariaCompliant === "no" || r.shariaCompliant === "unknown") &&
      qty * price > 0 &&
      r.company.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company"],
        message: "اسم الشركة مطلوب لتوثيق الفتوى عند عدم تأكيد التوافق الشرعي.",
      });
    }
    // مؤشر شريعة اسمه مطلوب عند اختيار "نعم"
    if (r.shariaCompliant === "yes" && r.shariaIndex.length === 0 && qty * price > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shariaIndex"],
        message: "أدخل اسم المؤشر الشرعي المعتمد.",
      });
    }
  });

export type SecurityRowInput = z.input<typeof securityRowSchema>;
export type SecurityRowErrors = Partial<Record<keyof SecurityRowInput, string>>;

export function validateSecurityRow(r: SecurityRowInput): SecurityRowErrors {
  const res = securityRowSchema.safeParse(r);
  if (res.success) return {};
  const errs: SecurityRowErrors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof SecurityRowInput | undefined;
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}

// ------------- ESOP / RSU -------------

export const esopSchema = z
  .object({
    vestedShares: numString({ label: "عدد الخيارات المستحقّة", max: MAX_QTY }),
    price: numString({ label: "سعر السهم الحالي", max: MAX_MONEY }),
    strike: numString({ label: "سعر التنفيذ", max: MAX_MONEY }),
    rsuValue: numString({ label: "قيمة RSUs", max: MAX_MONEY }),
  })
  .superRefine((v, ctx) => {
    const vested = parseFloat(v.vestedShares || "0") || 0;
    const price = parseFloat(v.price || "0") || 0;
    const strike = parseFloat(v.strike || "0") || 0;
    if (vested > 0 && price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "أدخل سعر السهم الحالي عند وجود خيارات مستحقّة.",
      });
    }
    if (strike > price && vested > 0 && price > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["strike"],
        message: "سعر التنفيذ أعلى من سعر السوق: القيمة الجوهرية = 0 (تأكد من الأرقام).",
      });
    }
  });

export type EsopInput = z.input<typeof esopSchema>;
export type EsopErrors = Partial<Record<keyof EsopInput, string>>;

export function validateEsop(v: EsopInput): EsopErrors {
  const res = esopSchema.safeParse(v);
  if (res.success) return {};
  const errs: EsopErrors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof EsopInput | undefined;
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}
