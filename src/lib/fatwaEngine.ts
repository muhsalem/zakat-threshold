/**
 * محرك قواعد الفتاوى — Fatwa Rule Engine
 *
 * يسمح بتخصيص الأحكام حسب:
 * - الولاية القضائية (Jurisdiction: SA, AE, EG, ...)
 * - الهيئة الشرعية (Authority: AAOIFI, IFA-OIC, Dar Al-Ifta, ...)
 * - المذهب (Madhab: Hanafi, Maliki, Shafii, Hanbali)
 *
 * كل قاعدة توثّق: الحكم، النسبة، الأدلة، المصدر، تاريخ السريان.
 */

export type Madhab = "hanafi" | "maliki" | "shafii" | "hanbali";
export type Jurisdiction = "SA" | "AE" | "EG" | "KW" | "MY" | "PK" | "GB" | "US" | "ID" | "QA" | "JO" | "TR";
export type Authority =
  | "aaoifi"
  | "ifa-oic"
  | "mwl-fiqh-council"
  | "dar-al-ifta-eg"
  | "haiah-kibar-sa"
  | "bait-al-zakat-kw"
  | "majlis-fatwa-my"
  | "dar-al-ifta-jo";

export type Ruling = "obligatory" | "permissible_with_zakat" | "permissible_no_zakat" | "prohibited" | "differed";

export interface FatwaRule {
  id: string;
  topic: string; // e.g. "crypto.bitcoin", "stocks.mixed", "reit"
  authority: Authority;
  jurisdiction?: Jurisdiction[];
  madhab?: Madhab[];
  ruling: Ruling;
  rate?: number; // e.g. 0.025
  basis: string[]; // ["AAOIFI-59", "IFA-237/2019"]
  evidence?: string; // نص الدليل مختصراً
  source_url?: string;
  effective_from?: string; // ISO date
  supersedes?: string; // id of older rule
  notes?: string;
}

// ==== سجل الفتاوى المعتمدة ====
export const FATWA_REGISTRY: FatwaRule[] = [
  // العملات الرقمية
  {
    id: "crypto-btc-aaoifi-59",
    topic: "crypto.bitcoin",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-59"],
    evidence: "المعيار الشرعي (59) للعملات الرقمية — تُعدّ مالاً متقوماً في نظر بعض المجامع.",
    effective_from: "2023-01-01",
  },
  {
    id: "crypto-btc-mwl-2019",
    topic: "crypto.bitcoin",
    authority: "mwl-fiqh-council",
    jurisdiction: ["SA"],
    ruling: "differed",
    basis: ["قرار المجمع الفقهي الإسلامي — رابطة العالم الإسلامي 2019"],
    evidence: "توقّف عن الحكم النهائي بانتظار مزيد من الدراسة.",
    effective_from: "2019-01-01",
  },
  {
    id: "crypto-btc-eg-2018",
    topic: "crypto.bitcoin",
    authority: "dar-al-ifta-eg",
    jurisdiction: ["EG"],
    ruling: "prohibited",
    basis: ["فتوى دار الإفتاء المصرية — 2018"],
    effective_from: "2018-01-01",
  },

  // الأسهم
  {
    id: "stocks-pure-halal-aaoifi-21",
    topic: "stocks.islamic",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    rate: 0.025,
    basis: ["AAOIFI-21"],
    evidence: "الشركات النقية شرعياً — زكاة على القيمة السوقية بالكامل.",
  },
  {
    id: "stocks-mixed-aaoifi-21",
    topic: "stocks.mixed",
    authority: "aaoifi",
    ruling: "permissible_with_zakat",
    basis: ["AAOIFI-21"],
    evidence: "تُخرج الزكاة على نصيب المساهم من الموجودات الزكوية فقط، لا كامل قيمة السهم.",
  },

  // REITs
  {
    id: "reit-my-2015",
    topic: "reit",
    authority: "majlis-fatwa-my",
    jurisdiction: ["MY"],
    ruling: "permissible_with_zakat",
    basis: ["MAIWP — Islamic REIT Guidelines"],
    effective_from: "2015-01-01",
  },

  // الراتب
  {
    id: "salary-hanafi-fixed",
    topic: "income.salary",
    authority: "aaoifi",
    madhab: ["hanafi"],
    ruling: "permissible_with_zakat",
    basis: ["فتوى مجمع الفقه الإسلامي الدولي — الدورة الثالثة"],
    evidence: "تُزكّى مع سائر المال عند الحول، ولا زكاة مستقلة على الراتب.",
  },
];

// ==== الاستعلامات ====

export interface FatwaQuery {
  topic: string;
  jurisdiction?: Jurisdiction;
  authority?: Authority;
  madhab?: Madhab;
  onlyEffective?: boolean;
}

export function findFatwas(q: FatwaQuery): FatwaRule[] {
  const today = new Date().toISOString().slice(0, 10);
  return FATWA_REGISTRY.filter((r) => {
    if (r.topic !== q.topic) return false;
    if (q.authority && r.authority !== q.authority) return false;
    if (q.jurisdiction && r.jurisdiction && !r.jurisdiction.includes(q.jurisdiction)) return false;
    if (q.madhab && r.madhab && !r.madhab.includes(q.madhab)) return false;
    if (q.onlyEffective && r.effective_from && r.effective_from > today) return false;
    // استبعد المنسوخ
    const supersededBy = FATWA_REGISTRY.find((x) => x.supersedes === r.id);
    if (supersededBy) return false;
    return true;
  });
}

/**
 * يختار الحكم الراجح بناءً على الأولوية:
 * 1. فتوى الهيئة الوطنية للولاية القضائية إن وُجدت
 * 2. AAOIFI (المعيار الدولي)
 * 3. مجمع الفقه الإسلامي الدولي
 * 4. أول فتوى متاحة
 */
export function resolveRuling(q: FatwaQuery): FatwaRule | null {
  const matches = findFatwas({ ...q, onlyEffective: true });
  if (!matches.length) return null;

  const nationalPriority: Record<Jurisdiction, Authority[]> = {
    SA: ["haiah-kibar-sa", "mwl-fiqh-council"],
    EG: ["dar-al-ifta-eg"],
    KW: ["bait-al-zakat-kw"],
    MY: ["majlis-fatwa-my"],
    JO: ["dar-al-ifta-jo"],
    AE: [], PK: [], GB: [], US: [], ID: [], QA: [], TR: [],
  };

  if (q.jurisdiction) {
    for (const auth of nationalPriority[q.jurisdiction] ?? []) {
      const m = matches.find((r) => r.authority === auth);
      if (m) return m;
    }
  }
  return matches.find((r) => r.authority === "aaoifi")
    ?? matches.find((r) => r.authority === "ifa-oic")
    ?? matches[0];
}
