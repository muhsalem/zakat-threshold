// طبقة التسعير: تحويل USD الأساسي → السعر المحلي حسب PPP + تقريب نفسي.
import { getCountry, TIER_MULTIPLIER, type CountryInfo } from "./countries";

// أسعار صرف تقريبية (ثابتة، للعرض فقط — الفوترة الحقيقية بالـ USD)
// آخر تحديث: 2026-Q1
const FX_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.38,
  OMR: 0.38,
  EGP: 49,
  JOD: 0.71,
  MAD: 10,
  DZD: 135,
  TND: 3.1,
  IQD: 1310,
  TRY: 34,
  MYR: 4.7,
  IDR: 15800,
  INR: 84,
  PKR: 278,
  BDT: 120,
  NGN: 1580,
};

// أرقام نفسية: قرّب لأقرب ".99" أو رقم صحيح لطيف
function psychologicalRound(amount: number, currency: string): number {
  if (amount < 1) return Math.round(amount * 100) / 100;

  // العملات ذات المضاعف الكبير
  const bigCurrencies = ["IDR", "IQD", "NGN", "PKR", "BDT", "EGP", "DZD"];
  if (bigCurrencies.includes(currency)) {
    if (amount < 100) return Math.round(amount / 10) * 10 - 1;
    if (amount < 1000) return Math.round(amount / 50) * 50 - 1;
    if (amount < 10000) return Math.round(amount / 100) * 100 - 1;
    return Math.round(amount / 500) * 500 - 1;
  }

  // العملات ذات الوحدات الصغيرة (KWD, BHD, OMR, JOD)
  const smallUnitCurrencies = ["KWD", "BHD", "OMR", "JOD"];
  if (smallUnitCurrencies.includes(currency)) {
    if (amount < 10) return Math.round(amount * 10) / 10; // 0.1 دقة
    return Math.round(amount);
  }

  // USD/EUR/GBP/SAR/AED والباقي
  if (amount < 20) {
    const rounded = Math.floor(amount) + 0.99;
    return rounded;
  }
  if (amount < 100) return Math.round(amount / 5) * 5 - 1;
  if (amount < 1000) return Math.round(amount / 10) * 10 - 1;
  return Math.round(amount / 50) * 50 - 1;
}

export type PriceResult = {
  amount: number;
  currency: string;
  formatted: string;
  usdEquivalent: number;
  saving: number; // نسبة الخصم مقارنة بالسعر العالمي
  country: CountryInfo;
};

export function getLocalPrice(usdBase: number, countryCode?: string | null): PriceResult {
  const country = getCountry(countryCode);
  const multiplier = TIER_MULTIPLIER[country.tier];
  const pppUsd = usdBase * multiplier;
  const fx = FX_RATES[country.currency] ?? 1;
  const localRaw = pppUsd * fx;
  const localRounded = psychologicalRound(localRaw, country.currency);

  return {
    amount: localRounded,
    currency: country.currency,
    formatted: formatPrice(localRounded, country.currency, country.locale),
    usdEquivalent: pppUsd,
    saving: Math.round((1 - multiplier) * 100),
    country,
  };
}

export function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    const noDecimals = ["IDR", "IQD", "NGN", "PKR", "BDT", "EGP", "DZD", "TRY", "JPY", "KRW"];
    const digits = noDecimals.includes(currency) ? 0 : amount % 1 === 0 ? 0 : 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
