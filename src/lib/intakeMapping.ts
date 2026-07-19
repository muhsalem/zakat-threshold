/**
 * Intake ↔ Comprehensive Calculator Mapping — ربط نموذج بيانات الأفراد بالحاسبة الشاملة
 * ------------------------------------------------------------------------------------
 * يحل تعارضين كانا قائمين:
 *
 * 1) «السحق الفقهي»: كان النموذج الشامل يجمع كل الحقول في 6 أرقام بمعدل 2.5% مسطّح،
 *    فتدخل الأسهم طويلة الأجل بكامل قيمتها (والصواب: زكاة الموجودات الزكوية)،
 *    وتُدمج الزروع مع عروض التجارة (والصواب: 5%/10% لا 2.5%)، وتسقط الأنعام كلياً.
 *    هنا: التجميع يضم فقط ما يصح ضمه بمعدل 2.5%، والبقية تُحفظ مفصّلة مع
 *    أعلام مراجعة تشرح المعالجة الشرعية الواجبة لكل بند.
 *
 * 2) «انقطاع البيانات»: كانت التفاصيل تُرسل نصاً حراً في الملاحظات. هنا: تُحفظ
 *    بنيوياً في breakdown.details (jsonb) وتصل المحاسب جاهزة، مع حمولة تعبئة
 *    مسبقة للحاسبة الشاملة يراجعها ويُصدر التقرير منها.
 */
import type { ZakatBreakdown } from "@/lib/accountantStore";

/** قيم النموذج التفصيلية كما أدخلها العميل — تُحفظ كاملة للمحاسب */
export interface IntakeDetails {
  mode: "quick" | "comprehensive";
  phone?: string;
  // نقد وسيولة
  cash: number;
  bankAccounts: number;
  savingsBonds: number;
  cryptoValue: number;
  // ذهب وفضة
  gold: number; // بالقيمة
  goldGrams: number;
  goldKarat: 18 | 21 | 24;
  silverGrams: number;
  jewelryPersonal: number;
  // استثمارات
  investments: number;
  stocksTrading: number;
  stocksLongTerm: number;
  mutualFunds: number;
  sukuk: number;
  // عقار
  realEstateTrading: number;
  realEstateRental: number;
  rentalIncomeAnnual: number;
  // زراعة وأنعام
  agricultureType: "none" | "rainfed" | "irrigated";
  agricultureValue: number;
  livestockCamels: number;
  livestockCattle: number;
  livestockSheep: number;
  // دخل ونشاط
  salaryMonthly: number;
  endOfServiceBenefits: number;
  inventory: number;
  businessAssets: number;
  businessLiabilities: number;
  receivables: number;
  receivablesDoubtful: number;
  debts: number;
  esopVestedValue: number;
  bills: number;
  rikazMetals: number;
  notes: string;
}

export interface AggregationResult {
  /** الأرقام الستة المجمّعة — فقط ما يصح تزكيته بمعدل 2.5% مباشرة */
  breakdown: ZakatBreakdown;
  /** بنود استُبعدت من التجميع وتحتاج معالجتها الفقهية الخاصة في الحاسبة الشاملة */
  reviewFlags: string[];
}

const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/**
 * التجميع الفقهي الصحيح: يدخل في الأرقام الستة (معدل 2.5%) فقط:
 *   النقد وما في حكمه، الذهب/الفضة بالقيمة، استثمارات المتاجرة، عروض التجارة،
 *   الذمم المرجوّة، والديون القصيرة (خصماً).
 * ويُستبعد مع علم مراجعة: الأسهم طويلة الأجل، دخل الإيجار، الزروع، الأنعام،
 *   الحلي الشخصي، أوزان الذهب/الفضة (تُقوَّم في الحاسبة بسعر اليوم)،
 *   والرواتب/مكافأة نهاية الخدمة (تدفقات لا أرصدة).
 */
export function aggregateIntake(d: IntakeDetails): AggregationResult {
  const flags: string[] = [];

  const cash = n(d.cash) + n(d.bankAccounts) + n(d.savingsBonds) + n(d.cryptoValue);
  const gold = n(d.gold);
  const investments =
    n(d.investments) +
    n(d.stocksTrading) +
    n(d.mutualFunds) +
    n(d.sukuk) +
    n(d.realEstateTrading) +
    n(d.esopVestedValue) +
    n(d.bills);
  const inventory = n(d.inventory) + n(d.businessAssets);
  const receivables = n(d.receivables);
  const debts = n(d.debts) + n(d.businessLiabilities);

  if (n(d.stocksLongTerm) > 0)
    flags.push(
      `أسهم طويلة الأجل (${d.stocksLongTerm}): لا تُزكّى بكامل قيمتها — تُزكّى الموجودات الزكوية للشركة أو صافي الريع بحسب المذهب. استُبعدت من التجميع وتُعالج في الحاسبة.`,
    );
  if (n(d.rentalIncomeAnnual) > 0)
    flags.push(
      `دخل إيجاري سنوي (${d.rentalIncomeAnnual}): يُزكّى المدّخر منه عند تمام الحول لا كامل الدخل. استُبعد من التجميع.`,
    );
  if (n(d.realEstateRental) > 0)
    flags.push(
      `عقار مؤجَّر (${d.realEstateRental}): أصل غير زكوي (مستغلات) — الزكاة في غلته المدّخرة فقط.`,
    );
  if (d.agricultureType !== "none" && n(d.agricultureValue) > 0)
    flags.push(
      `زروع وثمار (${d.agricultureValue} — ري ${d.agricultureType === "rainfed" ? "بعل 10%" : "بكلفة 5%"}): معدل مختلف عن 2.5% — استُبعدت من التجميع وتُحسب في قسم الزروع.`,
    );
  if (n(d.livestockCamels) + n(d.livestockCattle) + n(d.livestockSheep) > 0)
    flags.push(
      `أنعام (إبل ${n(d.livestockCamels)} · بقر ${n(d.livestockCattle)} · غنم ${n(d.livestockSheep)}): تُزكّى بالجداول النبوية بالعدد لا بالقيمة — تُحسب في قسم الأنعام.`,
    );
  if (n(d.goldGrams) > 0)
    flags.push(
      `ذهب بالوزن (${d.goldGrams} جم عيار ${d.goldKarat}): يُقوَّم بسعر يوم الوجوب في الحاسبة — لم يُقدَّر نقداً هنا.`,
    );
  if (n(d.silverGrams) > 0)
    flags.push(`فضة بالوزن (${d.silverGrams} جم): تُقوَّم بسعر يوم الوجوب في الحاسبة.`);
  if (n(d.jewelryPersonal) > 0)
    flags.push(
      `حلي شخصي (${d.jewelryPersonal}): خلاف مذهبي — لا زكاة عند الجمهور بشروط الاعتدال، وتجب عند الحنفية. يقرره المحاسب مع العميل.`,
    );
  if (n(d.salaryMonthly) > 0 || n(d.endOfServiceBenefits) > 0)
    flags.push(
      `راتب/مكافأة نهاية خدمة: تدفقات — يدخل المدّخر منها ضمن النقد عند الحول، ولا تُجمع كبند مستقل.`,
    );
  if (n(d.rikazMetals) > 0)
    flags.push(
      `ركاز ومعادن مكتشفة (${d.rikazMetals}): نسبة زكاتها 20% (الخُمس) لا 2.5% — استُبعدت من التجميع وتُعالج بشكل منفصل.`,
    );
  if (n(d.receivablesDoubtful) > 0)
    flags.push(
      `ديون مشكوك في تحصيلها (${d.receivablesDoubtful}): لا تجب زكاتها فوراً بل تُزكّى لعام واحد عند قبضها. استُبعدت من التجميع.`,
    );

  return {
    breakdown: {
      cash: +cash.toFixed(2),
      gold: +gold.toFixed(2),
      investments: +investments.toFixed(2),
      inventory: +inventory.toFixed(2),
      receivables: +receivables.toFixed(2),
      debts: +debts.toFixed(2),
      details: d,
    },
    reviewFlags: flags,
  };
}

/* ------------------------------------------------------------------ */
/*            حمولة التعبئة المسبقة للحاسبة الشاملة (للمحاسب)            */
/* ------------------------------------------------------------------ */

export const INDIVIDUAL_PREFILL_KEY = "zakat_individual_prefill_v1";

/** ما تفهمه الحاسبة الشاملة مباشرة من بيانات العميل */
export interface IndividualPrefill {
  clientId: string;
  clientName: string;
  countryCode?: string;
  hawlDate?: string;
  notes: string;
  // ذهب/فضة بالوزن
  goldGrams?: number;
  goldKarat?: 18 | 21 | 24;
  silverGrams?: number;
  // عروض تجارة وذمم وديون
  inventory?: number;
  receivablesGood?: number;
  debts?: number;
  // عقار
  realEstateTrading?: number;
  rentalIncomeAnnual?: number;
  // زراعة
  agricultureType?: "none" | "rainfed" | "irrigated";
  agricultureValue?: number;
  // أنعام
  camels?: number;
  cows?: number;
  sheep?: number;
}

export function buildIndividualPrefill(client: {
  id: string;
  name: string;
  country?: string;
  hawlDate?: string;
  breakdown: ZakatBreakdown;
}): IndividualPrefill {
  const d = client.breakdown.details;
  const agg = client.breakdown;

  const noteLines: string[] = [
    `عميل: ${client.name} — بيانات نافذة الاستقبال جاهزة للمراجعة.`,
  ];
  if (d) {
    const { reviewFlags } = aggregateIntake(d);
    if (reviewFlags.length) {
      noteLines.push("بنود تحتاج قرار المحاسب:");
      noteLines.push(...reviewFlags.map((f) => `• ${f}`));
    }
    // ما لا تستقبله الحاسبة كحقول مباشرة يُوثّق نصاً كي لا يضيع
    const manual: string[] = [];
    if (n(d.stocksTrading)) manual.push(`أسهم متاجرة: ${d.stocksTrading}`);
    if (n(d.stocksLongTerm)) manual.push(`أسهم طويلة الأجل: ${d.stocksLongTerm}`);
    if (n(d.mutualFunds)) manual.push(`صناديق: ${d.mutualFunds}`);
    if (n(d.sukuk)) manual.push(`صكوك: ${d.sukuk}`);
    if (n(d.cryptoValue)) manual.push(`عملات رقمية: ${d.cryptoValue}`);
    if (n(d.cash) + n(d.bankAccounts) + n(d.savingsBonds))
      manual.push(
        `نقد/بنوك/شهادات: ${n(d.cash)} + ${n(d.bankAccounts)} + ${n(d.savingsBonds)}`,
      );
    if (n(d.jewelryPersonal)) manual.push(`حلي شخصي بالقيمة: ${d.jewelryPersonal}`);
    if (n(d.salaryMonthly)) manual.push(`راتب شهري: ${d.salaryMonthly}`);
    if (n(d.endOfServiceBenefits)) manual.push(`نهاية خدمة: ${d.endOfServiceBenefits}`);
    if (n(d.esopVestedValue)) manual.push(`ESOP: ${d.esopVestedValue}`);
    if (n(d.bills)) manual.push(`أوراق تجارية/قبض: ${d.bills}`);
    if (n(d.rikazMetals)) manual.push(`ركاز/معادن: ${d.rikazMetals}`);
    if (n(d.receivablesDoubtful)) manual.push(`ديون مشكوك فيها: ${d.receivablesDoubtful}`);
    if (manual.length) noteLines.push(`تفاصيل للإدخال في أقسام الحاسبة: ${manual.join(" · ")}`);
    if (d.notes) noteLines.push(`ملاحظات العميل: ${d.notes}`);
  }

  return {
    clientId: client.id,
    clientName: client.name,
    countryCode: client.country,
    hawlDate: client.hawlDate || undefined,
    notes: noteLines.join("\n"),
    goldGrams: d ? n(d.goldGrams) || undefined : undefined,
    goldKarat: d?.goldKarat,
    silverGrams: d ? n(d.silverGrams) || undefined : undefined,
    inventory: n(agg.inventory) || undefined,
    receivablesGood: n(agg.receivables) || undefined,
    debts: n(agg.debts) || undefined,
    realEstateTrading: d ? n(d.realEstateTrading) || undefined : undefined,
    rentalIncomeAnnual: d ? n(d.rentalIncomeAnnual) || undefined : undefined,
    agricultureType: d?.agricultureType,
    agricultureValue: d ? n(d.agricultureValue) || undefined : undefined,
    camels: d ? n(d.livestockCamels) || undefined : undefined,
    cows: d ? n(d.livestockCattle) || undefined : undefined,
    sheep: d ? n(d.livestockSheep) || undefined : undefined,
  };
}

export function savePrefill(p: IndividualPrefill) {
  localStorage.setItem(INDIVIDUAL_PREFILL_KEY, JSON.stringify(p));
}

/* ------------------------------------------------------------------ */
/*             حمولة التعبئة المسبقة لحاسبة الشركات (للمحاسب)            */
/* ------------------------------------------------------------------ */

export const COMPANY_PREFILL_KEY = "zakat_company_prefill_v1";

/** ما تفهمه حاسبة الشركات مباشرة من بيانات عميل شركة/مؤسسة */
export interface CompanyPrefill {
  clientId: string;
  clientName: string;
  countryCode?: string;
  hawlDate?: string;
  /** أعلام «بنود تحتاج قرار المحاسب» — تُعرض بطاقة تنبيه أعلى الحاسبة */
  reviewFlags: string[];
  /** النقد وما في حكمه مجمّعاً (نقد + بنوك + شهادات + رقمية) */
  cash?: number;
  /** الذمم المدينة المرجوّة */
  receivablesGood?: number;
  /** المخزون/عروض التجارة (يشمل الأصول التشغيلية الزكوية) */
  inventoryBook?: number;
  /** استثمارات بنية المتاجرة (أسهم/صناديق/صكوك/عقار متاجرة) */
  stocksTrading?: number;
  /** التزامات قصيرة الأجل (ديون + التزامات النشاط) */
  shortTermPayables?: number;
}

export function buildCompanyPrefill(client: {
  id: string;
  name: string;
  country?: string;
  hawlDate?: string;
  breakdown: ZakatBreakdown;
}): CompanyPrefill {
  const d = client.breakdown.details;
  const agg = client.breakdown;

  const flags: string[] = [];
  if (d) {
    flags.push(...aggregateIntake(d).reviewFlags);
    if (n(d.gold) + n(d.goldGrams) + n(d.silverGrams) > 0)
      flags.push(
        `ذهب/فضة (قيمة ${n(d.gold)} · ذهب ${n(d.goldGrams)} جم · فضة ${n(d.silverGrams)} جم): أدخلها في قسم المعادن الثمينة بحاسبة الشركة.`,
      );
    if (d.notes) flags.push(`ملاحظات العميل: ${d.notes}`);
  }

  return {
    clientId: client.id,
    clientName: client.name,
    countryCode: client.country,
    hawlDate: client.hawlDate || undefined,
    reviewFlags: flags,
    cash: n(agg.cash) || undefined,
    receivablesGood: n(agg.receivables) || undefined,
    inventoryBook: n(agg.inventory) || undefined,
    stocksTrading: n(agg.investments) || undefined,
    shortTermPayables: n(agg.debts) || undefined,
  };
}

export function saveCompanyPrefill(p: CompanyPrefill) {
  localStorage.setItem(COMPANY_PREFILL_KEY, JSON.stringify(p));
}

/** قراءة حمولة الشركة مرة واحدة ثم حذفها (one-shot) */
export function consumeCompanyPrefill(): CompanyPrefill | null {
  try {
    const raw = localStorage.getItem(COMPANY_PREFILL_KEY);
    if (!raw) return null;
    localStorage.removeItem(COMPANY_PREFILL_KEY);
    const p = JSON.parse(raw) as CompanyPrefill;
    return p && p.clientName ? p : null;
  } catch {
    return null;
  }
}

/** قراءة الحمولة مرة واحدة ثم حذفها (one-shot) */
export function consumePrefill(): IndividualPrefill | null {
  try {
    const raw = localStorage.getItem(INDIVIDUAL_PREFILL_KEY);
    if (!raw) return null;
    localStorage.removeItem(INDIVIDUAL_PREFILL_KEY);
    const p = JSON.parse(raw) as IndividualPrefill;
    return p && p.clientName ? p : null;
  } catch {
    return null;
  }
}
