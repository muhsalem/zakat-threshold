/**
 * بناء حمولة تقرير PDF قابل للطباعة لنتائج زكاة الأفراد والشركات،
 * مع توثيق المصادر (الأسعار، أسعار الصرف، المراجع الشرعية) والاستثناءات
 * (البنود المستبعدة، عدم بلوغ النصاب، عدم اكتمال الحول، السياسات التقديرية).
 */

import type { ReportPayload } from "./types";

export interface ZakatPdfRow {
  label: string;
  gross: number;
  nisab?: number;
  eligible: boolean;
  zakat: number;
}

export interface ZakatPdfDeduction {
  label: string;
  amount: number;
  included: boolean;
  reason: string;
  ref?: string;
}

export interface ZakatPdfFx {
  reportCurrency: string;
  rates: Array<{ from: string; to?: string; rate: number }>;
  source?: string;
}

export interface ZakatPdfInput {
  entity: "individual" | "company";
  name: string;
  profession?: string;
  countryCode?: string;
  currencyName: string;
  calendarBasis: "hijri" | "gregorian";
  effectiveRate: number;
  hijriYear?: string;
  gregorianDate?: string;
  method?: string;
  rows: ZakatPdfRow[];
  monetaryGross: number;
  debts: number;
  monetaryBase: number;
  moneyNisab: number;
  totalZakat: number;
  hawlComplete?: boolean | null;
  hawlDate?: string;
  goldPricePerGram?: number;
  silverPricePerGram?: number;
  priceSource?: string;
  nisabBasis?: "gold" | "silver";
  valuationBasis?: "market" | "book";
  deductions?: ZakatPdfDeduction[];
  fx?: ZakatPdfFx;
  /** استثناءات إضافية يحدّدها السياق (بنود غير مصنّفة، سياسات تقييم، تحذيرات المحرك). */
  extraExceptions?: ReportPayload["exceptions"];
  /** مراجع شرعية إضافية خاصة بالسياق. */
  extraShariaRefs?: ReportPayload["sharia_refs"];
  madhab?: string;
}

export type ZakatPdfPayload = Omit<
  ReportPayload,
  "report_uid" | "verify_token" | "kind" | "title" | "issued_at" | "issuer_name" | "content_hash" | "version"
>;

function money(value: number, currencyName: string): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currencyName}`;
}

const BASE_REFS: ReportPayload["sharia_refs"] = [
  { ref: "AAOIFI — معيار الزكاة رقم (35)", note: "أساس تحديد الوعاء الزكوي والخصوم القابلة للحسم" },
  { ref: "قرار مجمع الفقه الإسلامي الدولي رقم 28 (3/4)", note: "زكاة أسهم الشركات وعروض التجارة" },
  { ref: "حديث: «ليس فيما دون خمس أواقٍ صدقة» — متفق عليه", note: "أصل اشتراط النصاب" },
  { ref: "حديث: «لا زكاة في مالٍ حتى يحول عليه الحول» — رواه الترمذي", note: "أصل اشتراط الحول" },
];

/** يبني حمولة تقرير PDF كاملة من نتائج الحاسبة. */
export function buildZakatReportPayload(input: ZakatPdfInput): ZakatPdfPayload {
  const cur = (v: number) => money(v, input.currencyName);
  const isCompany = input.entity === "company";

  const inputs: Array<{ label: string; value: string }> = [
    { label: "نوع الإقرار", value: isCompany ? "إقرار زكاة شركة/منشأة" : "إقرار زكاة فرد" },
    { label: "أساس التقويم", value: input.calendarBasis === "hijri" ? "هجري (2.5%)" : "ميلادي (2.577%)" },
    { label: "نسبة الزكاة المطبقة", value: `${(input.effectiveRate * 100).toFixed(4)}%` },
  ];
  if (input.method) inputs.push({ label: "طريقة احتساب الوعاء", value: input.method });
  if (input.madhab) inputs.push({ label: "المذهب/المنهجية", value: input.madhab });
  if (input.nisabBasis)
    inputs.push({ label: "أساس النصاب", value: input.nisabBasis === "gold" ? "الذهب (85 جم)" : "الفضة (595 جم)" });
  if (input.valuationBasis)
    inputs.push({ label: "أساس التقييم", value: input.valuationBasis === "market" ? "القيمة السوقية" : "القيمة الدفترية" });
  if (input.hawlDate) inputs.push({ label: "تاريخ بلوغ النصاب", value: input.hawlDate });

  const assets = input.rows
    .filter((r) => r.gross > 0)
    .map((r) => ({
      label: r.nisab && r.nisab > 0 ? `${r.label} (النصاب: ${cur(r.nisab)})` : r.label,
      value: cur(r.gross),
    }));

  const calc_steps: Array<{ label: string; value: string }> = [
    { label: "١) إجمالي الأوعية الزكوية قبل الخصم", value: cur(input.monetaryGross) },
    { label: "٢) إجمالي الخصوم القابلة للحسم", value: cur(input.debts) },
    { label: "٣) صافي الوعاء الزكوي", value: cur(input.monetaryBase) },
    { label: "٤) قيمة النصاب الشرعي", value: cur(input.moneyNisab) },
    {
      label: "٥) بلوغ النصاب",
      value: input.monetaryBase >= input.moneyNisab ? "نعم — تجب الزكاة" : "لا — لا تجب الزكاة",
    },
    { label: "٦) الزكاة المستحقة", value: cur(input.totalZakat) },
  ];

  const deductions = (input.deductions ?? []).map((d) => ({
    label: d.ref ? `${d.label} — ${d.reason} (${d.ref})` : `${d.label} — ${d.reason}`,
    value: cur(d.amount),
    included: d.included,
  }));

  const results: Array<{ label: string; value: string; emphasize?: boolean }> = [
    ...input.rows
      .filter((r) => r.zakat > 0)
      .map((r) => ({ label: r.label, value: cur(r.zakat) })),
    { label: "إجمالي الزكاة المستحقة", value: cur(input.totalZakat), emphasize: true },
  ];

  // ===== المصادر =====
  const sources: NonNullable<ReportPayload["sources"]> = [
    {
      label: "منهجية الحساب",
      value: isCompany
        ? `محرك زكاة الشركات — ${input.method ?? "صافي الأصول"}`
        : "محرك زكاة الأفراد — نِصاب",
    },
  ];
  if (input.goldPricePerGram && input.goldPricePerGram > 0)
    sources.push({
      label: "سعر جرام الذهب المعتمد",
      value: cur(input.goldPricePerGram),
      origin: input.priceSource ?? "أسعار المعادن اليومية داخل المنصة / إدخال المستخدم",
    });
  if (input.silverPricePerGram && input.silverPricePerGram > 0)
    sources.push({
      label: "سعر جرام الفضة المعتمد",
      value: cur(input.silverPricePerGram),
      origin: input.priceSource ?? "أسعار المعادن اليومية داخل المنصة / إدخال المستخدم",
    });
  if (input.fx && input.fx.rates.length > 0) {
    for (const r of input.fx.rates) {
      sources.push({
        label: `سعر صرف ${r.from} → ${r.to ?? input.fx.reportCurrency}`,
        value: String(r.rate),
        origin: input.fx.source ?? "إدخال يدوي — مسؤولية المُزكِّي",
      });
    }
  }
  sources.push({
    label: "المرجعية الشرعية الأساسية",
    value: "معيار AAOIFI رقم (35) + قرارات مجمع الفقه الإسلامي الدولي",
  });

  // ===== الاستثناءات =====
  const exceptions: NonNullable<ReportPayload["exceptions"]> = [];
  for (const r of input.rows) {
    if (r.gross > 0 && !r.eligible) {
      exceptions.push({
        code: "NISAB-NOT-REACHED",
        label: r.label,
        reason:
          r.nisab && r.nisab > 0
            ? `لم يبلغ الوعاء النصاب الشرعي (${cur(r.nisab)}) فاستُبعد من الحساب.`
            : "الوعاء غير مستوفٍ لشروط الوجوب فاستُبعد من الحساب.",
        impact: `مبلغ مستبعد: ${cur(r.gross)}`,
        severity: "excluded",
      });
    }
  }
  for (const d of input.deductions ?? []) {
    if (!d.included && d.amount > 0) {
      exceptions.push({
        code: "DEDUCTION-REJECTED",
        label: d.label,
        reason: d.reason,
        impact: `لم يُخصم: ${cur(d.amount)}${d.ref ? ` — ${d.ref}` : ""}`,
        severity: "excluded",
      });
    }
  }
  if (input.hawlComplete === false) {
    exceptions.push({
      code: "HAWL-INCOMPLETE",
      label: "عدم اكتمال الحول",
      reason: "لم يمضِ حولٌ هجري كامل (354 يومًا) على بلوغ النصاب، فأُوقف احتساب بعض الأوعية.",
      severity: "warning",
    });
  }
  if (input.monetaryBase < 0) {
    exceptions.push({
      code: "NEGATIVE-BASE",
      label: "وعاء زكوي سالب",
      reason: "تجاوزت الخصوم قيمة الأصول الزكوية، ويُعامل الوعاء بالصفر ولا تجب الزكاة.",
      severity: "warning",
    });
  }
  if (input.valuationBasis === "book") {
    exceptions.push({
      code: "VALUATION-BOOK",
      label: "التقييم بالقيمة الدفترية",
      reason: "الأصل شرعًا التقييم بالقيمة السوقية يوم وجوب الزكاة؛ اعتماد الدفترية سياسة تقديرية.",
      severity: "info",
    });
  }
  if (input.fx && (!input.fx.source || input.fx.source.includes("يدوي"))) {
    exceptions.push({
      code: "FX-MANUAL",
      label: "أسعار صرف مُدخلة يدويًا",
      reason: "لم تُجلب أسعار الصرف من مصدر رسمي، والمسؤولية عن دقتها على المُزكِّي.",
      severity: "info",
    });
  }
  exceptions.push(...(input.extraExceptions ?? []));

  const sharia_refs = [
    ...BASE_REFS,
    ...(input.deductions ?? [])
      .filter((d) => d.ref)
      .map((d) => ({ ref: d.ref as string, note: d.label })),
    ...(input.extraShariaRefs ?? []),
  ].filter((r, i, arr) => arr.findIndex((x) => x.ref === r.ref) === i);

  return {
    owner: {
      name: input.name || "—",
      profession: input.profession,
      country: input.countryCode,
    },
    meta: {
      currency: input.currencyName,
      hijri_year: input.hijriYear,
      gregorian_date: input.gregorianDate ?? new Date().toISOString().slice(0, 10),
    },
    inputs,
    assets,
    calc_steps,
    deductions,
    results,
    sharia_refs,
    sources,
    exceptions,
  };
}
