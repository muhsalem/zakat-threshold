// Requirements matrix linking each zakat type/calculation to the attachments
// that shariah/audit governance expects. Consumed by the compliance summary
// component to show coverage per case.

import type { AttachmentCategory } from "@/components/attachments/ApprovalAttachments";

export type Requirement = {
  category: AttachmentCategory;
  required: boolean; // false = recommended only
  reason: string; // why this document is expected
};

export const CATEGORY_LABEL_AR: Record<AttachmentCategory, string> = {
  council_decision: "قرار مجمع فقهي",
  financial_statement: "قوائم مالية",
  fatwa: "فتوى / رأي شرعي",
  audit: "تقرير تدقيق / مراجعة",
  other: "مستندات داعمة",
};

/**
 * Rules per record_type. Unknown record types fall back to the individual profile.
 * `required` documents block a fully-compliant status; `recommended` ones only lower the score.
 */
const RULES: Record<string, Requirement[]> = {
  individual: [
    {
      category: "financial_statement",
      required: false,
      reason: "كشف حساب أو بيان أصول يوثّق مصادر الوعاء الزكوي.",
    },
    {
      category: "fatwa",
      required: false,
      reason: "فتوى مرجعية عند اختيار مذهب فقهي محدد أو حالة خاصة.",
    },
  ],
  company: [
    {
      category: "financial_statement",
      required: true,
      reason: "الميزانية العمومية وقائمة الدخل أساس احتساب وعاء الشركة.",
    },
    {
      category: "audit",
      required: true,
      reason: "تقرير مراجع خارجي لاعتماد الأرقام أمام الجهات التنظيمية.",
    },
    {
      category: "council_decision",
      required: true,
      reason: "قرار المجمع الفقهي المعتمد لأسلوب حساب زكاة الشركات (صافي الموجودات / رأس المال العامل).",
    },
    {
      category: "fatwa",
      required: false,
      reason: "فتوى تُعالج بنوداً استثنائية (استثمارات، صناديق، أدوات مالية).",
    },
  ],
  trade: [
    {
      category: "financial_statement",
      required: true,
      reason: "قائمة المخزون والذمم المدينة/الدائنة لحساب عروض التجارة.",
    },
    {
      category: "council_decision",
      required: true,
      reason: "قرار المجمع الفقهي في تقييم عروض التجارة بسعر السوق يوم الحول.",
    },
    {
      category: "fatwa",
      required: false,
      reason: "فتوى في الديون المشكوك فيها والبضاعة الراكدة.",
    },
  ],
  agriculture: [
    {
      category: "fatwa",
      required: true,
      reason: "فتوى تحدد نوع السقي (طبيعي/بمؤونة) ونصاب الزروع والثمار.",
    },
    {
      category: "financial_statement",
      required: false,
      reason: "بيان محصول موثّق (وزن/قيمة) لدعم الحساب.",
    },
  ],
  livestock: [
    {
      category: "fatwa",
      required: true,
      reason: "فتوى في نصاب الأنعام وأحكام الخلطة والسائمة.",
    },
    {
      category: "other",
      required: false,
      reason: "إثبات ملكية القطيع وتاريخ اقتنائه.",
    },
  ],
  investment: [
    {
      category: "financial_statement",
      required: true,
      reason: "بيان محفظة الاستثمار للتفريق بين نية القنية والمتاجرة.",
    },
    {
      category: "council_decision",
      required: true,
      reason: "قرار المجمع في زكاة الأسهم والصناديق حسب نية المستثمر.",
    },
    {
      category: "fatwa",
      required: false,
      reason: "فتوى لبنود خاصة (سندات، صكوك، مشتقات).",
    },
  ],
};

export function requirementsFor(recordType: string | null | undefined): Requirement[] {
  const key = (recordType ?? "individual").toLowerCase();
  return RULES[key] ?? RULES.individual;
}

export type CoverageStatus = "covered" | "missing_required" | "missing_recommended";

export interface CoverageRow extends Requirement {
  status: CoverageStatus;
  count: number;
}

export function computeCoverage(
  recordType: string | null | undefined,
  attachments: Array<{ category: AttachmentCategory }>,
): { rows: CoverageRow[]; score: number; total: number; missingRequired: number } {
  const reqs = requirementsFor(recordType);
  const counts = attachments.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});
  const rows: CoverageRow[] = reqs.map((r) => {
    const count = counts[r.category] ?? 0;
    const status: CoverageStatus =
      count > 0 ? "covered" : r.required ? "missing_required" : "missing_recommended";
    return { ...r, count, status };
  });
  const total = rows.length;
  const covered = rows.filter((r) => r.status === "covered").length;
  const missingRequired = rows.filter((r) => r.status === "missing_required").length;
  const score = total === 0 ? 100 : Math.round((covered / total) * 100);
  return { rows, score, total, missingRequired };
}
