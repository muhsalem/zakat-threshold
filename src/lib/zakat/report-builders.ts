/**
 * وحدات مساعدة مشتركة لبناء بيانات التقارير (PDF / Excel) لتبويبات الزكاة.
 * تم استخراجها من IndividualTab.tsx لإتاحة إعادة الاستخدام في CompanyTab
 * وغيرها من التبويبات مستقبلاً، مع الحفاظ على السلوك كما هو تماماً.
 */

// ============ أدوات مساعدة ============

const num = (v: string | number | undefined | null): number => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// ============ buildDeductionsList ============

export type DeferredPolicy = "yearly" | "full" | "none";

export interface DeductionsInput {
  debtPersonalLoan: string;
  debtBankLoan: string;
  debtConsumerFinance: string;
  debtCarInstall: string;
  debtTradePayable: string;
  debtPurchases: string;
  debtAlimony: string;
  debtDeferredYearly: string;
  debtMortgage: string;
  debtMahr: string;
  debtDeferredPolicy: DeferredPolicy;
}

export interface DeductionItem {
  label: string;
  amount: number;
  included: boolean;
  reason: string;
  ref?: string;
}

/** بناء بيان الخصومات والمبرّرات الشرعية لإثبات سبب الاحتساب أو الاستبعاد. */
export function buildDeductionsList(input: DeductionsInput): DeductionItem[] {
  const items: DeductionItem[] = [];
  const add = (
    label: string,
    raw: string,
    included: boolean,
    reason: string,
    ref?: string,
  ) => {
    const amount = num(raw);
    if (amount > 0) items.push({ label, amount, included, reason, ref });
  };

  // الديون الحالّة — تُخصم بإجماع الفقهاء
  add(
    "قروض شخصية حالّة",
    input.debtPersonalLoan,
    true,
    "دين حالّ مستحق السداد الآن — يُخصم من الوعاء الزكوي",
    "AAOIFI 35 / إجماع الفقهاء",
  );
  add(
    "ديون مصرفية حالّة",
    input.debtBankLoan,
    true,
    "أصل الدين دون الفوائد الربوية — يُخصم",
    "AAOIFI 35",
  );
  add(
    "تمويل استهلاكي حالّ",
    input.debtConsumerFinance,
    true,
    "تمويل إسلامي مستحق — يُخصم",
    "مجمع الفقه الإسلامي",
  );
  add(
    "أقساط سيارات/سلع حالّة",
    input.debtCarInstall,
    true,
    "قسط مستحق خلال الحول — يُخصم",
    "AAOIFI 35",
  );
  add(
    "ديون تجارية مستحقة",
    input.debtTradePayable,
    true,
    "دين للموردين مستحق الآن — يُخصم",
    "AAOIFI 35",
  );
  add("أثمان مشتريات لم تُسدد", input.debtPurchases, true, "دين تجاري حالّ — يُخصم", "AAOIFI 35");
  add(
    "نفقة واجبة مستحقة",
    input.debtAlimony,
    true,
    "نفقة بحكم قضاء/اتفاق — تُخصم باعتبارها ديناً حالاً",
    "قول الجمهور",
  );

  // الديون المؤجلة — السياسة تحدد القبول
  const longTermLabel =
    input.debtDeferredPolicy === "yearly"
      ? "قسط السنة فقط (سياسة الأنفع للفقراء)"
      : input.debtDeferredPolicy === "full"
        ? "كامل الدين المؤجل (الأحوط للمزكّي)"
        : "بدون خصم (الأنفع للفقراء التام)";

  if (input.debtDeferredPolicy !== "none") {
    add(
      "قسط السنة من الديون المؤجلة",
      input.debtDeferredYearly,
      true,
      `يُخصم وفق سياسة: ${longTermLabel}`,
      "AAOIFI 35 / فتاوى معاصرة",
    );
  } else {
    add(
      "قسط السنة من الديون المؤجلة",
      input.debtDeferredYearly,
      false,
      "مستبعد — السياسة المختارة لا تخصم الديون المؤجلة (الأنفع للفقراء)",
      "ابن باز / ابن عثيمين",
    );
  }

  add(
    "تمويل عقاري (إجمالي متبقي)",
    input.debtMortgage,
    input.debtDeferredPolicy === "full",
    input.debtDeferredPolicy === "full"
      ? "السياسة الأحوط: خصم كامل الدين المؤجل"
      : "مستبعد — التمويل العقاري المؤجل لا يُخصم بالكامل عند جمهور المعاصرين",
    "ندوات البركة",
  );
  add(
    "مهر مؤجل",
    input.debtMahr,
    false,
    "مستبعد — المهر المؤجل لا يُعتبر ديناً حالّاً ما لم يُطلب",
    "قول الجمهور",
  );

  return items;
}

// ============ buildBaseReportData ============

export interface BaseReportCalc {
  totalGoldValue: number;
  goldNisabValue: number;
  goldEligible: boolean;
  goldZakat: number;
  silverValue: number;
  silverNisabValue: number;
  silverEligible: boolean;
  silverZakat: number;
  cashTotal: number;
  securitiesTotal: number;
  billsTotal: number;
  tradeTotal: number;
  realEstateZakatable: number;
  cropsValue: number;
  cropsEligible: boolean;
  cropsZakat: number;
  camelsN: number;
  cowsN: number;
  sheepN: number;
  monetaryGross: number;
  debts: number;
  monetaryBase: number;
  moneyNisab: number;
  total: number;
}

export interface BaseReportInput {
  name: string;
  profession: string;
  countryCode: string;
  currencyName: string;
  calendarBasis: "gregorian" | "hijri";
  effectiveRate: number;
  calc: BaseReportCalc;
  incomeUsufructTotal: number;
  rikazTotal: number;
  ownsLivestock: boolean;
  livestockForTrade: boolean;
  livestockTradeValue: string;
  esopData:
    | {
        show: boolean;
        vestedShares: number;
        price: number;
        strike: number;
        intrinsic: number;
        rsuValue: number;
        base: number;
        intentTrade: boolean;
        zakat: number;
      }
    | undefined;
  hawl: { hawlComplete: boolean } | null;
  nisabStartDate: string;
  goldPrice: string;
  silverPrice: string;
  accountantName: string;
  accountantLicense: string;
  accountantPreamble: string;
  accountantOpinion: string;
  opinionType: "adverse" | "clean" | "qualified";
  previousYearZakat: string;
  includeAuditReport: boolean;
  auditEntries: Array<{
    id: string;
    action: string;
    fingerprint: string | null;
    sharia_refs: string[] | null;
    created_at: string;
  }>;
}

/** بيانات التقرير الأساسية المشتركة بين تصدير PDF و Excel. */
export function buildBaseReportData(input: BaseReportInput) {
  const { calc } = input;
  return {
    name: input.name,
    profession: input.profession,
    countryCode: input.countryCode,
    currencyName: input.currencyName,
    calendarBasis: input.calendarBasis,
    effectiveRate: input.effectiveRate,
    rows: [
      {
        label: "زكاة الذهب",
        gross: calc.totalGoldValue,
        nisab: calc.goldNisabValue,
        eligible: calc.goldEligible,
        zakat: calc.goldZakat,
      },
      {
        label: "زكاة الفضة",
        gross: calc.silverValue,
        nisab: calc.silverNisabValue,
        eligible: calc.silverEligible,
        zakat: calc.silverZakat,
      },
      {
        label: "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية",
        gross: calc.cashTotal,
        eligible: true,
        zakat: 0,
      },
      {
        label: "زكاة الأوراق المالية ووثائق التأمين",
        gross: calc.securitiesTotal,
        eligible: true,
        zakat: 0,
      },
      {
        label: "زكاة الأوراق التجارية (الكمبيالات وأوراق القبض)",
        gross: calc.billsTotal,
        eligible: true,
        zakat: 0,
      },
      {
        label: "زكاة الدخل وعروض التجارة والمستغلات",
        gross: calc.tradeTotal + calc.realEstateZakatable + input.incomeUsufructTotal,
        eligible: true,
        zakat: 0,
      },
      {
        label: "زكاة الزروع والثمار",
        gross: calc.cropsValue,
        eligible: calc.cropsEligible,
        zakat: calc.cropsZakat,
      },
      {
        label: "زكاة الركاز والمعادن",
        gross: input.rikazTotal,
        eligible: input.rikazTotal > 0,
        zakat: input.rikazTotal,
      },
    ],
    livestock: {
      camels: calc.camelsN,
      cows: calc.cowsN,
      sheep: calc.sheepN,
      show: input.ownsLivestock,
      mode: input.livestockForTrade ? ("trade" as const) : ("grazing" as const),
      tradeValue: input.livestockForTrade ? num(input.livestockTradeValue) : 0,
    },
    esop: input.esopData,
    rikazTotal: input.rikazTotal,
    monetaryGross: calc.monetaryGross,
    debts: calc.debts,
    monetaryBase: calc.monetaryBase,
    moneyNisab: calc.moneyNisab,
    totalZakat: calc.total,
    hawlComplete: input.hawl ? input.hawl.hawlComplete : null,
    hawlDate: input.nisabStartDate,
    goldPricePerGram: num(input.goldPrice),
    silverPricePerGram: num(input.silverPrice),
    accountantName: input.accountantName,
    accountantLicense: input.accountantLicense,
    accountantPreamble: input.accountantPreamble,
    accountantOpinion: input.accountantOpinion,
    opinionType: input.opinionType,
    previousYearZakat: input.previousYearZakat,
    auditEntries: input.includeAuditReport ? input.auditEntries : undefined,
  };
}
