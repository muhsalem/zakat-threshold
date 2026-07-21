/**
 * محرك الفرز الشرعي لأسهم الشركات المُتداوَلة — منطق حاسم (deterministic)
 * لا يعتمد على الذكاء الاصطناعي إلا في استخراج الأرقام من القوائم؛ كل
 * النسب والأحكام الكمية تُحسب برمجياً هنا وفق ثلاث منهجيات فرز معتمدة عالمياً.
 *
 * الفرق عن محرك زكاة الشركات (shariaAudit.ts): ذاك يراجع امتثال *منشأتك*
 * الزكوي من ميزان مراجعتها. هذا يفرز *سهم شركة أخرى* تملك أسهمها للمتاجرة —
 * هل يجوز شراؤها/الاحتفاظ بها أصلاً قبل أن تُزكّى؟ مكمّلان لا بديلان.
 */

export type MethodologyKey = "aaoifi" | "djim" | "sp";

export interface Methodology {
  key: MethodologyKey;
  name: string;
  debtLimit: number;
  depLimit: number;
  incLimit: number;
  denomRule: "strictest" | "avgMarket";
  denomLabel: string;
}

export const METHODOLOGIES: Record<MethodologyKey, Methodology> = {
  aaoifi: {
    key: "aaoifi",
    name: "أيوفي — المعيار الشرعي (٢١)",
    debtLimit: 30,
    depLimit: 30,
    incLimit: 5,
    denomRule: "strictest",
    denomLabel: "الأشد من: إجمالي الأصول / القيمة السوقية",
  },
  djim: {
    key: "djim",
    name: "داو جونز الإسلامي (DJIM)",
    debtLimit: 33.33,
    depLimit: 33.33,
    incLimit: 5,
    denomRule: "avgMarket",
    denomLabel: "متوسط القيمة السوقية ٣٦ شهراً",
  },
  sp: {
    key: "sp",
    name: "S&P Shariah",
    debtLimit: 33,
    depLimit: 33,
    incLimit: 5,
    denomRule: "avgMarket",
    denomLabel: "متوسط القيمة السوقية ٣٦ شهراً",
  },
};

export interface LineItem {
  name: string;
  amount: number;
  evidence?: string;
}

export interface Instrument {
  name: string;
  amount: number;
  classification: "متوافقة" | "غير متوافقة" | "تحتاج فحصاً";
  basis?: string;
}

export interface GovernanceItem {
  item: string;
  status: "yes" | "no" | "partial";
  note?: string;
}

export interface Violation {
  title: string;
  severity: "high" | "medium" | "low";
  detail: string;
  reference?: string;
}

export interface Recommendation {
  priority: number;
  title: string;
  detail: string;
}

export interface ContractReviewItem {
  item: string;
  why: string;
}

/** ما يستخرجه الذكاء الاصطناعي من القوائم — لا نسب ولا أحكام هنا */
export interface StockAuditExtract {
  company: { name: string; period: string; auditor?: string; activity?: string };
  statementType: "مستقلة" | "مجمعة" | "غير محدد";
  figures: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    interestIncome: number;
    capitalizedInterest: number;
    weightedShares: number;
  };
  conventionalDebt: LineItem[];
  interestBearingDeposits: LineItem[];
  instruments: Instrument[];
  governance: GovernanceItem[];
  violations: Violation[];
  recommendations: Recommendation[];
  contractReview: ContractReviewItem[];
  extractionNotes?: string;
}

export const num = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(/[,،\s]/g, "")) : Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export const fmtNum = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? parseFloat(n.replace(/[,،]/g, "")) : n;
  if (Number.isNaN(v)) return String(n);
  return v.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
};

const pct = (a: number, b: number): number | null => (b > 0 ? (a / b) * 100 : null);

export interface VerificationResult {
  unconfirmed: Array<{ label: string; v1: number; v2: number; diffPct: number }>;
  singlePass: boolean;
}

/** يقارن استخراجين مستقلين لنفس الملف — أي فارق جوهري (>1%) يُعلَّم غير مؤكد */
export function compareExtracts(
  e1: StockAuditExtract,
  e2: StockAuditExtract | null,
): VerificationResult {
  if (!e2) return { unconfirmed: [], singlePass: true };
  const sum = (arr: LineItem[] | undefined) => (arr || []).reduce((s, d) => s + num(d.amount), 0);
  const fields: Array<[string, (e: StockAuditExtract) => number]> = [
    ["إجمالي الأصول", (e) => num(e.figures?.totalAssets)],
    ["إجمالي الالتزامات", (e) => num(e.figures?.totalLiabilities)],
    ["حقوق الملكية", (e) => num(e.figures?.totalEquity)],
    ["إجمالي الإيرادات", (e) => num(e.figures?.totalRevenue)],
    ["الفوائد الدائنة", (e) => num(e.figures?.interestIncome)],
    ["الفوائد المرسملة", (e) => num(e.figures?.capitalizedInterest)],
    ["المتوسط المرجح للأسهم", (e) => num(e.figures?.weightedShares)],
    ["إجمالي الديون الربوية", (e) => sum(e.conventionalDebt)],
    ["الودائع بفائدة", (e) => sum(e.interestBearingDeposits)],
  ];
  const unconfirmed: VerificationResult["unconfirmed"] = [];
  for (const [label, get] of fields) {
    const v1 = get(e1);
    const v2 = get(e2);
    const base = Math.max(Math.abs(v1), Math.abs(v2));
    if (base === 0) continue;
    const diff = Math.abs(v1 - v2) / base;
    if (diff > 0.01) unconfirmed.push({ label, v1, v2, diffPct: diff * 100 });
  }
  return { unconfirmed, singlePass: false };
}

export type RatioStatus = "pass" | "warning" | "fail";

export interface Ratio {
  name: string;
  numer: number;
  numLabel: string;
  vAssets?: number | null;
  vMarket?: number | null;
  vAvg?: number | null;
  vRevenue?: number | null;
  judged: number;
  denomUsed: string;
  limit: number;
  status: RatioStatus;
}

export interface MethodologyComparison {
  methodology: Methodology;
  debt: number;
  dep: number;
  inc: number;
  passAll: boolean;
  needsMarket: boolean;
}

export interface ComputedStockAudit {
  ex: StockAuditExtract;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  balanceOk: boolean;
  balanceDiffPct: number;
  ribaDebt: number;
  ribaDeposits: number;
  ratios: Ratio[];
  comparison: MethodologyComparison[];
  purification: {
    interestIncome: number;
    capitalizedInterest: number;
    total: number;
    pctOfRevenue: number | null;
    perShare: number | null;
    shares: number;
  };
  score: number;
  verdict: string;
  verdictDetail: string;
  verdictTone: "pass" | "warn" | "fail";
  marketCap: number;
  avgMarketCap: number;
  methodology: Methodology;
  verification?: VerificationResult;
}

export function computeStockAudit(
  ex: StockAuditExtract,
  opts: {
    marketCap?: number | string;
    avgMarketCap?: number | string;
    methodologyKey: MethodologyKey;
    verification?: VerificationResult;
  },
): ComputedStockAudit {
  const M = METHODOLOGIES[opts.methodologyKey] ?? METHODOLOGIES.aaoifi;
  const f = ex.figures || ({} as StockAuditExtract["figures"]);
  const A = num(f.totalAssets);
  const L = num(f.totalLiabilities);
  const E = num(f.totalEquity);
  const rev = num(f.totalRevenue);
  const intInc = num(f.interestIncome);
  const capInt = num(f.capitalizedInterest);
  const shares = num(f.weightedShares);
  const mc = num(opts.marketCap);
  const amc = num(opts.avgMarketCap);

  const balanceDiffPct = A > 0 ? (Math.abs(A - (L + E)) / A) * 100 : 100;
  const balanceOk = balanceDiffPct <= 2;

  const ribaDebt = (ex.conventionalDebt || []).reduce((s, d) => s + num(d.amount), 0);
  const ribaDeposits = (ex.interestBearingDeposits || []).reduce((s, d) => s + num(d.amount), 0);
  const nonCompliantIncome = intInc + capInt;

  const pickFixedDenom = (): { v: number; label: string } | null => {
    if (M.denomRule !== "avgMarket") return null;
    if (amc > 0) return { v: amc, label: "متوسط القيمة السوقية ٣٦ شهراً" };
    if (mc > 0) return { v: mc, label: "القيمة السوقية الحالية (بديل عن متوسط ٣٦ شهراً)" };
    return { v: A, label: "إجمالي الأصول (بديل اضطراري — المنهجية تتطلب القيمة السوقية)" };
  };
  const denomFixed = pickFixedDenom();

  const mkRatio = (name: string, numer: number, numLabel: string, limit: number): Ratio => {
    const vAssets = pct(numer, A);
    const vMarket = mc > 0 ? pct(numer, mc) : null;
    const vAvg = amc > 0 ? pct(numer, amc) : null;
    let judged: number;
    let denomUsed: string;
    if (M.denomRule === "strictest") {
      judged = Math.max(vAssets ?? 0, vMarket ?? 0);
      denomUsed =
        vMarket !== null && vMarket >= (vAssets ?? 0) ? "القيمة السوقية" : "إجمالي الأصول";
    } else {
      judged = pct(numer, denomFixed?.v ?? 0) ?? 0;
      denomUsed = denomFixed?.label ?? "—";
    }
    const status: RatioStatus =
      judged > limit ? "fail" : judged >= limit * 0.8 ? "warning" : "pass";
    return { name, numer, numLabel, vAssets, vMarket, vAvg, judged, denomUsed, limit, status };
  };

  const rDebt = mkRatio(
    "نسبة الديون والتمويلات الربوية",
    ribaDebt,
    "إجمالي الديون الربوية",
    M.debtLimit,
  );
  const rDep = mkRatio(
    "نسبة الودائع والاستثمارات بفائدة",
    ribaDeposits,
    "الودائع والاستثمارات بفائدة",
    M.depLimit,
  );
  const vInc = pct(nonCompliantIncome, rev);
  const rInc: Ratio = {
    name: "نسبة الإيرادات غير المتوافقة",
    numer: nonCompliantIncome,
    numLabel: "الفوائد الدائنة + المرسملة",
    vRevenue: vInc,
    judged: vInc ?? 0,
    denomUsed: "إجمالي الإيرادات",
    limit: M.incLimit,
    status:
      (vInc ?? 0) > M.incLimit ? "fail" : (vInc ?? 0) >= M.incLimit * 0.8 ? "warning" : "pass",
  };
  const ratios = [rDebt, rDep, rInc];

  const comparison: MethodologyComparison[] = Object.values(METHODOLOGIES).map((m) => {
    const denomOf = (numer: number) => {
      if (m.denomRule === "strictest") {
        return Math.max(pct(numer, A) ?? 0, mc > 0 ? (pct(numer, mc) ?? 0) : 0);
      }
      const d = amc > 0 ? amc : mc > 0 ? mc : A;
      return pct(numer, d) ?? 0;
    };
    const debt = denomOf(ribaDebt);
    const dep = denomOf(ribaDeposits);
    const inc = vInc ?? 0;
    const passAll = debt <= m.debtLimit && dep <= m.depLimit && inc <= m.incLimit;
    return {
      methodology: m,
      debt,
      dep,
      inc,
      passAll,
      needsMarket: m.denomRule === "avgMarket" && amc === 0,
    };
  });

  const purification = {
    interestIncome: intInc,
    capitalizedInterest: capInt,
    total: nonCompliantIncome,
    pctOfRevenue: vInc,
    perShare: shares > 0 ? nonCompliantIncome / shares : null,
    shares,
  };

  const ratioPts =
    (ratios.reduce((s, r) => s + (r.status === "pass" ? 1 : r.status === "warning" ? 0.5 : 0), 0) /
      3) *
    50;
  const instr = ex.instruments || [];
  const totInstr = instr.reduce((s, i) => s + num(i.amount), 0);
  const okInstr = instr
    .filter((i) => i.classification === "متوافقة")
    .reduce((s, i) => s + num(i.amount), 0);
  const instrPts = totInstr > 0 ? (okInstr / totInstr) * 25 : 12.5;
  const gov = ex.governance || [];
  const govPts = gov.length
    ? (gov.reduce((s, g) => s + (g.status === "yes" ? 1 : g.status === "partial" ? 0.5 : 0), 0) /
        gov.length) *
      25
    : 0;
  const score = Math.round(ratioPts + instrPts + govPts);

  let verdict: string;
  let verdictDetail: string;
  let verdictTone: "pass" | "warn" | "fail";
  const anyFail = ratios.some((r) => r.status === "fail");
  if (anyFail) {
    verdict = `لا يجوز الاستثمار في أسهمها وفق ${M.name}`;
    verdictTone = "fail";
    verdictDetail = `تجاوزت الشركة حداً أو أكثر من الحدود الكمية لمنهجية ${M.name}، فلا تنطبق عليها شروط جواز تداول أسهم الشركات المختلطة ما لم تُصحَّح أوضاعها.`;
  } else if (nonCompliantIncome > 0 || ribaDebt > 0) {
    verdict = "شركة مختلطة — يجوز تداول أسهمها بشرط التطهير";
    verdictTone = "warn";
    verdictDetail = `نشاطها الأصلي مباح وخالطته معاملات بفائدة ضمن الحدود الكمية لمنهجية ${M.name}؛ فيجوز — على قول من أجاز المختلطة — تداول أسهمها مع وجوب التطهير المبين أدناه. والحكم منصبّ على التعامل مع السهم لا على توصيف الشركة بالتوافق.`;
  } else {
    verdict = "لا يظهر من القوائم ما يمنع شرعاً — بشرط استيفاء فحص العقود";
    verdictTone = "pass";
    verdictDetail =
      "لم يظهر من القوائم ديون ربوية أو إيرادات محرمة، ويبقى الحكم معلقاً على فحص العقود المبين في قسم «ما لا تُظهره القوائم».";
  }

  return {
    ex,
    totalAssets: A,
    totalLiabilities: L,
    totalEquity: E,
    totalRevenue: rev,
    balanceOk,
    balanceDiffPct,
    ribaDebt,
    ribaDeposits,
    ratios,
    comparison,
    purification,
    score,
    verdict,
    verdictDetail,
    verdictTone,
    marketCap: mc,
    avgMarketCap: amc,
    methodology: M,
    verification: opts.verification,
  };
}
