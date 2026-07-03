/**
 * Jurisdiction Adapters — محوّلات الولايات القضائية
 *
 * يجمع القواعد الضريبية والزكوية المحلية لكل دولة،
 * ويوفّر واجهة موحّدة لتصدير النماذج الرسمية.
 */

import type { Jurisdiction } from "./fatwaEngine";

export interface JurisdictionProfile {
  code: Jurisdiction;
  name_ar: string;
  name_en: string;
  currency: string;
  currency_symbol: string;
  official_body: string;
  calendar: "hijri" | "gregorian" | "either";
  zakat_rate_hijri: number;
  zakat_rate_gregorian: number;
  tax_deductible: boolean;
  corporate_zakat_mandatory: boolean;
  report_format?: string; // مثل: "ZAT-01", "NPWZ", "Form-28"
  regulator_url?: string;
  notes?: string;
}

export const JURISDICTIONS: Record<Jurisdiction, JurisdictionProfile> = {
  SA: {
    code: "SA",
    name_ar: "المملكة العربية السعودية",
    name_en: "Saudi Arabia",
    currency: "SAR",
    currency_symbol: "ر.س",
    official_body: "هيئة الزكاة والضريبة والجمارك (ZATCA)",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: false,
    corporate_zakat_mandatory: true,
    report_format: "ZAT-01",
    regulator_url: "https://zatca.gov.sa",
    notes: "الشركات المدرجة تخضع للزكاة إلزامياً. تُقدَّم الإقرارات إلكترونياً.",
  },
  AE: {
    code: "AE",
    name_ar: "الإمارات العربية المتحدة",
    name_en: "United Arab Emirates",
    currency: "AED",
    currency_symbol: "د.إ",
    official_body: "صندوق الزكاة الإماراتي",
    calendar: "either",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    regulator_url: "https://zakatfund.gov.ae",
    notes: "ضريبة الشركات 9% (2023) قابلة للخصم قبل حساب الوعاء الزكوي.",
  },
  EG: {
    code: "EG",
    name_ar: "جمهورية مصر العربية",
    name_en: "Egypt",
    currency: "EGP",
    currency_symbol: "ج.م",
    official_body: "دار الإفتاء المصرية / بيت الزكاة المصري",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    report_format: "نموذج 28 ضرائب",
    regulator_url: "https://dar-alifta.org",
  },
  KW: {
    code: "KW",
    name_ar: "دولة الكويت",
    name_en: "Kuwait",
    currency: "KWD",
    currency_symbol: "د.ك",
    official_body: "بيت الزكاة الكويتي",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: false,
    corporate_zakat_mandatory: true,
    regulator_url: "https://zakathouse.org.kw",
    notes: "الشركات المساهمة تخضع لزكاة 1% مع خيار الاحتساب الكامل 2.5%.",
  },
  MY: {
    code: "MY",
    name_ar: "ماليزيا",
    name_en: "Malaysia",
    currency: "MYR",
    currency_symbol: "RM",
    official_body: "Lembaga Zakat Selangor / PPZ-MAIWP",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    report_format: "Zakat Perniagaan",
    regulator_url: "https://www.zakatselangor.com.my",
    notes: "الزكاة قابلة للخصم من ضريبة الدخل بنسبة 100% للأفراد.",
  },
  PK: {
    code: "PK",
    name_ar: "باكستان",
    name_en: "Pakistan",
    currency: "PKR",
    currency_symbol: "₨",
    official_body: "Ministry of Religious Affairs — Zakat Ordinance 1980",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    report_format: "CZ-50",
    notes: "خصم تلقائي 2.5% من الحسابات المصرفية في رمضان.",
  },
  GB: {
    code: "GB",
    name_ar: "المملكة المتحدة",
    name_en: "United Kingdom",
    currency: "GBP",
    currency_symbol: "£",
    official_body: "National Zakat Foundation (NZF)",
    calendar: "either",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    notes: "يمكن الاستفادة من Gift Aid لزيادة قيمة التبرع بنسبة 25%.",
  },
  US: {
    code: "US",
    name_ar: "الولايات المتحدة",
    name_en: "United States",
    currency: "USD",
    currency_symbol: "$",
    official_body: "Zakat Foundation of America / IRS 501(c)(3)",
    calendar: "either",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    notes: "قابلة للخصم الضريبي عند التبرع لمؤسسات 501(c)(3).",
  },
  ID: {
    code: "ID",
    name_ar: "إندونيسيا",
    name_en: "Indonesia",
    currency: "IDR",
    currency_symbol: "Rp",
    official_body: "BAZNAS (Badan Amil Zakat Nasional)",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
    report_format: "NPWZ",
    regulator_url: "https://baznas.go.id",
  },
  QA: {
    code: "QA",
    name_ar: "دولة قطر",
    name_en: "Qatar",
    currency: "QAR",
    currency_symbol: "ر.ق",
    official_body: "صندوق الزكاة القطري",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: false,
    corporate_zakat_mandatory: false,
  },
  JO: {
    code: "JO",
    name_ar: "المملكة الأردنية الهاشمية",
    name_en: "Jordan",
    currency: "JOD",
    currency_symbol: "د.أ",
    official_body: "صندوق الزكاة الأردني / دار الإفتاء الأردنية",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: true,
    corporate_zakat_mandatory: false,
  },
  TR: {
    code: "TR",
    name_ar: "الجمهورية التركية",
    name_en: "Türkiye",
    currency: "TRY",
    currency_symbol: "₺",
    official_body: "Diyanet İşleri Başkanlığı",
    calendar: "hijri",
    zakat_rate_hijri: 0.025,
    zakat_rate_gregorian: 0.02577,
    tax_deductible: false,
    corporate_zakat_mandatory: false,
  },
};

export function getJurisdiction(code: Jurisdiction): JurisdictionProfile {
  return JURISDICTIONS[code];
}

export function listJurisdictions(): JurisdictionProfile[] {
  return Object.values(JURISDICTIONS);
}
