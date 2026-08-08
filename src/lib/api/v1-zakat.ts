/**
 * Zakat API v1 — نواة الحساب المعتمد
 * -----------------------------------
 * وحدة نقية (بلا HTTP) تُغذّي نقاط `/api/public/v1/*`:
 *   1) تحقق صارم من المدخلات (zod) بأخطاء حقلية واضحة.
 *   2) تحقق من كتالوج القواعد الشرعية: لا تُصدر نتيجة «معتمدة» إذا كانت
 *      القاعدة الحاكمة للبند محجوبة أو الكتالوج غير سليم.
 *   3) حساب الوعاء والزكاة وفق AAOIFI 35.
 *   4) شهادة نتيجة: بصمة إصدارات (version stamp) + بصمة محتوى SHA-256
 *      قابلة للتحقق لاحقاً عبر نقطة verify.
 */
import { z } from "zod";
import {
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  ZAKAT_RATE,
  ZAKAT_RATE_GREGORIAN,
} from "@/lib/zakat";
import {
  getRule,
  evaluateRuleActivation,
  validateCatalog,
  RULES_CATALOG_VERSION,
  type AssetType,
} from "@/lib/zakat/rules-catalog";
import { createVersionStamp, type VersionStamp } from "@/lib/zakat/version-freeze";
import { detail, v1Error, type V1ErrorDetail } from "@/lib/api/v1-errors";

/* ------------------------------- المدخلات ------------------------------- */

const money = z.number().finite().min(0).max(1e15);

export const ZakatCalcV1Schema = z
  .object({
    currency: z
      .string()
      .regex(/^[A-Za-z]{3}$/, "currency must be a 3-letter ISO code")
      .default("USD"),
    calendar: z.enum(["hijri", "gregorian"]).default("hijri"),
    nisabBasis: z.enum(["gold", "silver"]).default("silver"),
    hawlComplete: z.boolean().default(true),

    goldPricePerGram24: z.number().finite().positive().max(1e7),
    silverPricePerGramPure: z.number().finite().positive().max(1e7),

    cashAndBank: money.default(0),
    tradeInventory: money.default(0),
    tradeReceivables: money.default(0),
    stocksTrading: money.default(0),
    stocksLongTermZakatable: money.default(0),
    goldGrams24: money.default(0),
    silverGramsPure: money.default(0),
    cryptoAssets: money.default(0),
    shortTermLiabilities: money.default(0),

    priceProvider: z.string().min(1).max(64).default("client-supplied"),
    pricesCapturedAt: z.string().datetime().optional(),
  })
  .strict();

export type ZakatCalcV1Input = z.infer<typeof ZakatCalcV1Schema>;

/** تفصيل خطأ حقلي بالمغلّف الموحّد (ZKT-1010) */
export type FieldError = V1ErrorDetail;

export function parseZakatCalcV1(
  body: unknown,
): { ok: true; data: ZakatCalcV1Input } | { ok: false; errors: V1ErrorDetail[] } {
  const parsed = ZakatCalcV1Schema.safeParse(body ?? {});
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => {
      const field = i.path.join(".") || "(root)";
      return detail("ZKT-1010", {
        field,
        message: `الحقل «${field}»: ${i.message}`,
        remediation:
          i.code === "unrecognized_keys"
            ? "أزل الحقول غير المعرّفة — الواجهة ترفض المفاتيح الزائدة (strict)."
            : "راجع نوع القيمة ومداها في توثيق /developers.",
      });
    }),
  };
}

/* --------------------------- تحقق القواعد الشرعية --------------------------- */

/** البنود المالية → القاعدة الحاكمة في الكتالوج */
export const RULE_BINDINGS: Array<{
  field: keyof ZakatCalcV1Input;
  assetType: AssetType;
  ruleId: string;
}> = [
  { field: "cashAndBank", assetType: "cash", ruleId: "ZR-CASH-001" },
  { field: "goldGrams24", assetType: "gold", ruleId: "ZR-GOLD-INVEST-001" },
  // الفضة من الأثمان (النقدان) — تحكمها قاعدة النقود والأرصدة نفسها
  { field: "silverGramsPure", assetType: "cash", ruleId: "ZR-CASH-001" },
  { field: "tradeInventory", assetType: "inventory", ruleId: "ZR-INV-TRADE-001" },
  { field: "tradeReceivables", assetType: "receivables", ruleId: "ZR-RECV-001" },
  { field: "stocksTrading", assetType: "stocks", ruleId: "ZR-STOCKS-TRADE-001" },
  { field: "stocksLongTermZakatable", assetType: "stocks", ruleId: "ZR-STOCKS-HOLD-001" },
  { field: "cryptoAssets", assetType: "crypto", ruleId: "ZR-CRYPTO-001" },
  { field: "shortTermLiabilities", assetType: "debt", ruleId: "ZR-DEBT-SHORT-001" },
];

export interface RuleCheck {
  field: string;
  ruleId: string;
  /** موجود في الكتالوج ومُفعَّل */
  applied: boolean;
  reference?: string;
  reasons?: string[];
}

export interface RulesValidation {
  /** الكتالوج سليم وكل بند ذي قيمة تحكمه قاعدة مفعّلة */
  certified: boolean;
  catalogVersion: string;
  catalogIssues: Array<{ ruleId: string; issue: string }>;
  checks: RuleCheck[];
  warnings: string[];
  /** أسباب تفصيلية موحّدة الأكواد لعدم اعتماد النتيجة (ZKT-2xxx) */
  failures: V1ErrorDetail[];
  requiresHumanReview: boolean;
}

export function validateRulesForInput(
  input: ZakatCalcV1Input,
  asOf: Date = new Date(),
): RulesValidation {
  const catalogIssues = validateCatalog();
  const checks: RuleCheck[] = [];
  const warnings: string[] = [];
  const failures: V1ErrorDetail[] = [];
  let requiresHumanReview = false;

  for (const binding of RULE_BINDINGS) {
    const value = Number(input[binding.field] ?? 0);
    if (!value) continue;
    const rule = getRule(binding.ruleId);
    if (!rule) {
      checks.push({
        field: binding.field,
        ruleId: binding.ruleId,
        applied: false,
        reasons: ["القاعدة غير مسجَّلة في الكتالوج"],
      });
      warnings.push(`لا توجد قاعدة معتمدة للبند «${binding.field}» — النتيجة غير معتمدة.`);
      failures.push(
        detail("ZKT-2001", {
          field: binding.field,
          ruleId: binding.ruleId,
          message: `البند «${binding.field}» بقيمة ${value} لا تحكمه أي قاعدة مسجَّلة في الكتالوج (${binding.ruleId} غير موجودة).`,
          remediation: "راجع GET /api/public/v1/rules أو أزل البند من الطلب.",
        }),
      );
      continue;
    }
    const activation = evaluateRuleActivation(rule, asOf);
    if (rule.requiresHumanReview) requiresHumanReview = true;
    checks.push({
      field: binding.field,
      ruleId: rule.ruleId,
      applied: activation.active,
      reference: rule.reference,
      ...(activation.active ? {} : { reasons: activation.reasons }),
    });
    if (!activation.active) {
      warnings.push(`القاعدة ${rule.ruleId} محجوبة: ${activation.reasons.join("، ")}`);
      failures.push(
        detail("ZKT-2002", {
          field: binding.field,
          ruleId: rule.ruleId,
          reasons: activation.reasons,
          message: `القاعدة ${rule.ruleId} («${rule.name}») الحاكمة للبند «${binding.field}» غير مفعّلة: ${activation.reasons.join("، ")}.`,
          remediation: "انتظر اعتماد/نفاذ القاعدة أو استبعد البند للحصول على نتيجة معتمدة.",
        }),
      );
    }
    if (activation.active && rule.requiresHumanReview) {
      failures.push(
        detail("ZKT-2005", {
          field: binding.field,
          ruleId: rule.ruleId,
          severity: "warning",
          message: `البند «${binding.field}» تحكمه القاعدة ${rule.ruleId} التي تستلزم مراجعة شرعية بشرية قبل الاعتماد النهائي.`,
          remediation: "أرسل الحالة إلى مسار المراجعة الشرعية قبل الاعتماد.",
        }),
      );
    }
  }

  if (!input.hawlComplete) {
    warnings.push("لم يكتمل الحول — المبلغ تقديري ولا يُعتمد للإقرار.");
    failures.push(
      detail("ZKT-2004", {
        field: "hawlComplete",
        message:
          "hawlComplete = false: لم يمضِ حول هجري كامل على بلوغ النصاب، فلا تُصدر شهادة معتمدة.",
        remediation: "أرسل hawlComplete = true بعد اكتمال الحول لإصدار نتيجة معتمدة.",
      }),
    );
  }
  if (catalogIssues.length) {
    warnings.push(`كتالوج القواعد يحتوي ${catalogIssues.length} ملاحظة سلامة.`);
    for (const issue of catalogIssues) {
      failures.push(
        detail("ZKT-2003", {
          ruleId: issue.ruleId,
          message: `سلامة الكتالوج — القاعدة ${issue.ruleId}: ${issue.issue}`,
          remediation: "أصلح تعريف القاعدة في كتالوج القواعد قبل إصدار نتائج معتمدة.",
        }),
      );
    }
  }

  const certified =
    catalogIssues.length === 0 &&
    input.hawlComplete &&
    checks.length > 0 &&
    checks.every((c) => c.applied);

  return {
    certified,
    catalogVersion: RULES_CATALOG_VERSION,
    catalogIssues,
    checks,
    warnings,
    failures,
    requiresHumanReview,
  };
}

/* --------------------------------- الحساب -------------------------------- */

export interface ZakatCalcV1Result {
  currency: string;
  calendar: "hijri" | "gregorian";
  ratePercent: number;
  nisab: {
    basis: "gold" | "silver";
    goldNisabValue: number;
    silverNisabValue: number;
    effectiveNisab: number;
  };
  breakdown: Record<string, number>;
  assessment: { reachesNisab: boolean; hawlComplete: boolean; zakatDue: number };
}

const r2 = (n: number) => +n.toFixed(2);

export function computeZakatV1(input: ZakatCalcV1Input): ZakatCalcV1Result {
  const rate = input.calendar === "gregorian" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;
  const goldNisabValue = GOLD_NISAB_GRAMS * input.goldPricePerGram24;
  const silverNisabValue = SILVER_NISAB_GRAMS * input.silverPricePerGramPure;
  const effectiveNisab = input.nisabBasis === "gold" ? goldNisabValue : silverNisabValue;

  const goldValue = input.goldGrams24 * input.goldPricePerGram24;
  const silverValue = input.silverGramsPure * input.silverPricePerGramPure;

  const totalZakatableAssets =
    input.cashAndBank +
    input.tradeInventory +
    input.tradeReceivables +
    input.stocksTrading +
    input.stocksLongTermZakatable +
    goldValue +
    silverValue +
    input.cryptoAssets;

  const netZakatBase = Math.max(0, totalZakatableAssets - input.shortTermLiabilities);
  const reachesNisab = netZakatBase >= effectiveNisab && effectiveNisab > 0;
  const zakatDue = reachesNisab && input.hawlComplete ? r2(netZakatBase * rate) : 0;

  return {
    currency: input.currency.toUpperCase(),
    calendar: input.calendar,
    ratePercent: +(rate * 100).toFixed(3),
    nisab: {
      basis: input.nisabBasis,
      goldNisabValue: r2(goldNisabValue),
      silverNisabValue: r2(silverNisabValue),
      effectiveNisab: r2(effectiveNisab),
    },
    breakdown: {
      cashAndBank: r2(input.cashAndBank),
      tradeInventory: r2(input.tradeInventory),
      tradeReceivables: r2(input.tradeReceivables),
      stocksTrading: r2(input.stocksTrading),
      stocksLongTermZakatable: r2(input.stocksLongTermZakatable),
      goldValue: r2(goldValue),
      silverValue: r2(silverValue),
      cryptoAssets: r2(input.cryptoAssets),
      totalZakatableAssets: r2(totalZakatableAssets),
      shortTermLiabilities: r2(input.shortTermLiabilities),
      netZakatBase: r2(netZakatBase),
    },
    assessment: { reachesNisab, hawlComplete: input.hawlComplete, zakatDue },
  };
}

/* -------------------------------- الاعتماد ------------------------------- */

export interface Certificate {
  /** معتمد فقط عندما تكون كل القواعد مفعّلة والحول مكتمل */
  status: "certified" | "provisional";
  contentHash: string;
  versions: VersionStamp;
  issuedAt: string;
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** تسلسل حتمي (مفاتيح مرتبة) كي تبقى البصمة قابلة لإعادة الإنتاج */
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export async function certifyResult(params: {
  input: ZakatCalcV1Input;
  result: ZakatCalcV1Result;
  rules: RulesValidation;
  issuedAt?: string;
}): Promise<Certificate> {
  const { input, result, rules } = params;
  const versions = createVersionStamp({
    methodologyVersion: "AAOIFI-35",
    priceSnapshots: [
      {
        symbol: "XAU",
        price: input.goldPricePerGram24,
        currency: result.currency,
        provider: input.priceProvider,
        capturedAt: input.pricesCapturedAt ?? new Date(0).toISOString(),
      },
      {
        symbol: "XAG",
        price: input.silverPricePerGramPure,
        currency: result.currency,
        provider: input.priceProvider,
        capturedAt: input.pricesCapturedAt ?? new Date(0).toISOString(),
      },
    ],
    frozenAt: params.issuedAt,
  });

  const contentHash = await sha256Hex(
    canonicalize({
      v: 1,
      result,
      rules: { certified: rules.certified, checks: rules.checks, catalog: rules.catalogVersion },
      versions: { ...versions, frozenAt: undefined },
    }),
  );

  return {
    status: rules.certified ? "certified" : "provisional",
    contentHash,
    versions,
    issuedAt: params.issuedAt ?? versions.frozenAt,
  };
}

/** استجابة v1 الموحّدة */
export async function runZakatCalcV1(
  body: unknown,
  opts: { asOf?: Date; issuedAt?: string; requestId?: string } = {},
) {
  const parsed = parseZakatCalcV1(body);
  if (!parsed.ok) {
    const err = v1Error("ZKT-1010", { details: parsed.errors, requestId: opts.requestId });
    return { ok: false as const, status: err.status, payload: err.payload };
  }
  const input = parsed.data;
  const rules = validateRulesForInput(input, opts.asOf);
  const result = computeZakatV1(input);
  const certificate = await certifyResult({ input, result, rules, issuedAt: opts.issuedAt });

  return {
    ok: true as const,
    status: 200,
    payload: {
      apiVersion: "v1",
      status: "success",
      compliance: "AAOIFI Standard 35 & FAS 9",
      data: result,
      rules,
      certificate,
      ...(opts.requestId ? { requestId: opts.requestId } : {}),
      timestamp: certificate.issuedAt,
    },
  };
}
