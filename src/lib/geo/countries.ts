// خريطة الدول → منطقة القوة الشرائية + العملة المعروضة
// PPP tiers مستوحاة من تصنيف البنك الدولي للدخل

export type PPPTier = "T1" | "T2" | "T3" | "T4";

export const TIER_MULTIPLIER: Record<PPPTier, number> = {
  T1: 1.0,
  T2: 0.6,
  T3: 0.35,
  T4: 0.2,
};

export type CountryInfo = {
  name: string;
  nameAr: string;
  tier: PPPTier;
  currency: string; // ISO-4217
  locale: string;
  flag: string;
};

// شامل: 60+ دولة رئيسية، وباقي العالم يقع افتراضياً على T1/USD
export const COUNTRIES: Record<string, CountryInfo> = {
  // ===== T1: High-income =====
  US: { name: "United States", nameAr: "الولايات المتحدة", tier: "T1", currency: "USD", locale: "en-US", flag: "🇺🇸" },
  GB: { name: "United Kingdom", nameAr: "المملكة المتحدة", tier: "T1", currency: "GBP", locale: "en-GB", flag: "🇬🇧" },
  CA: { name: "Canada", nameAr: "كندا", tier: "T1", currency: "USD", locale: "en-CA", flag: "🇨🇦" },
  AU: { name: "Australia", nameAr: "أستراليا", tier: "T1", currency: "USD", locale: "en-AU", flag: "🇦🇺" },
  DE: { name: "Germany", nameAr: "ألمانيا", tier: "T1", currency: "EUR", locale: "de-DE", flag: "🇩🇪" },
  FR: { name: "France", nameAr: "فرنسا", tier: "T1", currency: "EUR", locale: "fr-FR", flag: "🇫🇷" },
  IT: { name: "Italy", nameAr: "إيطاليا", tier: "T1", currency: "EUR", locale: "it-IT", flag: "🇮🇹" },
  ES: { name: "Spain", nameAr: "إسبانيا", tier: "T1", currency: "EUR", locale: "es-ES", flag: "🇪🇸" },
  NL: { name: "Netherlands", nameAr: "هولندا", tier: "T1", currency: "EUR", locale: "nl-NL", flag: "🇳🇱" },
  BE: { name: "Belgium", nameAr: "بلجيكا", tier: "T1", currency: "EUR", locale: "nl-BE", flag: "🇧🇪" },
  CH: { name: "Switzerland", nameAr: "سويسرا", tier: "T1", currency: "EUR", locale: "de-CH", flag: "🇨🇭" },
  AT: { name: "Austria", nameAr: "النمسا", tier: "T1", currency: "EUR", locale: "de-AT", flag: "🇦🇹" },
  SE: { name: "Sweden", nameAr: "السويد", tier: "T1", currency: "EUR", locale: "sv-SE", flag: "🇸🇪" },
  NO: { name: "Norway", nameAr: "النرويج", tier: "T1", currency: "EUR", locale: "nb-NO", flag: "🇳🇴" },
  DK: { name: "Denmark", nameAr: "الدنمارك", tier: "T1", currency: "EUR", locale: "da-DK", flag: "🇩🇰" },
  FI: { name: "Finland", nameAr: "فنلندا", tier: "T1", currency: "EUR", locale: "fi-FI", flag: "🇫🇮" },
  IE: { name: "Ireland", nameAr: "أيرلندا", tier: "T1", currency: "EUR", locale: "en-IE", flag: "🇮🇪" },
  JP: { name: "Japan", nameAr: "اليابان", tier: "T1", currency: "USD", locale: "en-US", flag: "🇯🇵" },
  KR: { name: "South Korea", nameAr: "كوريا الجنوبية", tier: "T1", currency: "USD", locale: "en-US", flag: "🇰🇷" },
  SG: { name: "Singapore", nameAr: "سنغافورة", tier: "T1", currency: "USD", locale: "en-SG", flag: "🇸🇬" },
  HK: { name: "Hong Kong", nameAr: "هونغ كونغ", tier: "T1", currency: "USD", locale: "en-HK", flag: "🇭🇰" },
  NZ: { name: "New Zealand", nameAr: "نيوزيلندا", tier: "T1", currency: "USD", locale: "en-NZ", flag: "🇳🇿" },
  IL: { name: "Israel", nameAr: "فلسطين المحتلة", tier: "T1", currency: "USD", locale: "en-US", flag: "🇮🇱" },
  // GCC
  SA: { name: "Saudi Arabia", nameAr: "المملكة العربية السعودية", tier: "T1", currency: "SAR", locale: "ar-SA", flag: "🇸🇦" },
  AE: { name: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة", tier: "T1", currency: "AED", locale: "ar-AE", flag: "🇦🇪" },
  KW: { name: "Kuwait", nameAr: "الكويت", tier: "T1", currency: "KWD", locale: "ar-KW", flag: "🇰🇼" },
  QA: { name: "Qatar", nameAr: "قطر", tier: "T1", currency: "QAR", locale: "ar-QA", flag: "🇶🇦" },
  BH: { name: "Bahrain", nameAr: "البحرين", tier: "T1", currency: "BHD", locale: "ar-BH", flag: "🇧🇭" },
  OM: { name: "Oman", nameAr: "عُمان", tier: "T1", currency: "OMR", locale: "ar-OM", flag: "🇴🇲" },

  // ===== T2: Upper-middle income =====
  TR: { name: "Turkey", nameAr: "تركيا", tier: "T2", currency: "TRY", locale: "tr-TR", flag: "🇹🇷" },
  MY: { name: "Malaysia", nameAr: "ماليزيا", tier: "T2", currency: "MYR", locale: "ms-MY", flag: "🇲🇾" },
  CN: { name: "China", nameAr: "الصين", tier: "T2", currency: "USD", locale: "en-US", flag: "🇨🇳" },
  RU: { name: "Russia", nameAr: "روسيا", tier: "T2", currency: "USD", locale: "en-US", flag: "🇷🇺" },
  BR: { name: "Brazil", nameAr: "البرازيل", tier: "T2", currency: "USD", locale: "en-US", flag: "🇧🇷" },
  MX: { name: "Mexico", nameAr: "المكسيك", tier: "T2", currency: "USD", locale: "es-MX", flag: "🇲🇽" },
  AR: { name: "Argentina", nameAr: "الأرجنتين", tier: "T2", currency: "USD", locale: "es-AR", flag: "🇦🇷" },
  ZA: { name: "South Africa", nameAr: "جنوب أفريقيا", tier: "T2", currency: "USD", locale: "en-ZA", flag: "🇿🇦" },
  TH: { name: "Thailand", nameAr: "تايلاند", tier: "T2", currency: "USD", locale: "en-US", flag: "🇹🇭" },
  LY: { name: "Libya", nameAr: "ليبيا", tier: "T2", currency: "USD", locale: "ar", flag: "🇱🇾" },

  // ===== T3: Lower-middle income =====
  EG: { name: "Egypt", nameAr: "مصر", tier: "T3", currency: "EGP", locale: "ar-EG", flag: "🇪🇬" },
  JO: { name: "Jordan", nameAr: "الأردن", tier: "T3", currency: "JOD", locale: "ar-JO", flag: "🇯🇴" },
  MA: { name: "Morocco", nameAr: "المغرب", tier: "T3", currency: "MAD", locale: "ar-MA", flag: "🇲🇦" },
  DZ: { name: "Algeria", nameAr: "الجزائر", tier: "T3", currency: "DZD", locale: "ar-DZ", flag: "🇩🇿" },
  TN: { name: "Tunisia", nameAr: "تونس", tier: "T3", currency: "TND", locale: "ar-TN", flag: "🇹🇳" },
  IQ: { name: "Iraq", nameAr: "العراق", tier: "T3", currency: "IQD", locale: "ar-IQ", flag: "🇮🇶" },
  LB: { name: "Lebanon", nameAr: "لبنان", tier: "T3", currency: "USD", locale: "ar-LB", flag: "🇱🇧" },
  PS: { name: "Palestine", nameAr: "فلسطين", tier: "T3", currency: "USD", locale: "ar", flag: "🇵🇸" },
  ID: { name: "Indonesia", nameAr: "إندونيسيا", tier: "T3", currency: "IDR", locale: "id-ID", flag: "🇮🇩" },
  IN: { name: "India", nameAr: "الهند", tier: "T3", currency: "INR", locale: "en-IN", flag: "🇮🇳" },
  PK: { name: "Pakistan", nameAr: "باكستان", tier: "T3", currency: "PKR", locale: "en-PK", flag: "🇵🇰" },
  BD: { name: "Bangladesh", nameAr: "بنغلاديش", tier: "T3", currency: "BDT", locale: "bn-BD", flag: "🇧🇩" },
  NG: { name: "Nigeria", nameAr: "نيجيريا", tier: "T3", currency: "NGN", locale: "en-NG", flag: "🇳🇬" },
  PH: { name: "Philippines", nameAr: "الفلبين", tier: "T3", currency: "USD", locale: "en-PH", flag: "🇵🇭" },
  VN: { name: "Vietnam", nameAr: "فيتنام", tier: "T3", currency: "USD", locale: "en-US", flag: "🇻🇳" },
  KE: { name: "Kenya", nameAr: "كينيا", tier: "T3", currency: "USD", locale: "en-KE", flag: "🇰🇪" },
  GH: { name: "Ghana", nameAr: "غانا", tier: "T3", currency: "USD", locale: "en-GH", flag: "🇬🇭" },
  SN: { name: "Senegal", nameAr: "السنغال", tier: "T3", currency: "USD", locale: "fr-SN", flag: "🇸🇳" },
  UZ: { name: "Uzbekistan", nameAr: "أوزبكستان", tier: "T3", currency: "USD", locale: "en-US", flag: "🇺🇿" },
  MR: { name: "Mauritania", nameAr: "موريتانيا", tier: "T3", currency: "USD", locale: "ar", flag: "🇲🇷" },

  // ===== T4: Low-income =====
  YE: { name: "Yemen", nameAr: "اليمن", tier: "T4", currency: "USD", locale: "ar-YE", flag: "🇾🇪" },
  SD: { name: "Sudan", nameAr: "السودان", tier: "T4", currency: "USD", locale: "ar-SD", flag: "🇸🇩" },
  SY: { name: "Syria", nameAr: "سوريا", tier: "T4", currency: "USD", locale: "ar-SY", flag: "🇸🇾" },
  SO: { name: "Somalia", nameAr: "الصومال", tier: "T4", currency: "USD", locale: "ar-SO", flag: "🇸🇴" },
  AF: { name: "Afghanistan", nameAr: "أفغانستان", tier: "T4", currency: "USD", locale: "en-US", flag: "🇦🇫" },
  ET: { name: "Ethiopia", nameAr: "إثيوبيا", tier: "T4", currency: "USD", locale: "en-ET", flag: "🇪🇹" },
  KM: { name: "Comoros", nameAr: "جزر القمر", tier: "T4", currency: "USD", locale: "ar", flag: "🇰🇲" },
  DJ: { name: "Djibouti", nameAr: "جيبوتي", tier: "T4", currency: "USD", locale: "ar", flag: "🇩🇯" },
};

export const DEFAULT_COUNTRY: CountryInfo = {
  name: "Global",
  nameAr: "عالمي",
  tier: "T1",
  currency: "USD",
  locale: "en-US",
  flag: "🌍",
};

export function getCountry(code?: string | null): CountryInfo {
  if (!code) return DEFAULT_COUNTRY;
  const upper = code.toUpperCase();
  return COUNTRIES[upper] ?? DEFAULT_COUNTRY;
}

export function listCountries(): Array<CountryInfo & { code: string }> {
  return Object.entries(COUNTRIES)
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
}
