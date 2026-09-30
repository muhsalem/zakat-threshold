// قراءة لقطة النصاب من جدول nisab_prices — مصدر واحد للأعمدة وشكل الردّ.
//
// كانت /api/public/nisab تطلب أعمدة لا وجود لها في الجدول
// (gold_price_per_gram, gold_nisab, recorded_at…) فيفشل الاستعلام دائماً
// ويردّ 500، وكان fallback الأسعار يرتّب بعمود recorded_at غير الموجود
// فيسقط بصمت. الأعمدة الحقيقية هنا، ويُبنى منها الردّ العام.

export const GOLD_NISAB_GRAMS = 85;
export const SILVER_NISAB_GRAMS = 595;

/** الأعمدة الموجودة فعلاً في nisab_prices (انظر integrations/supabase/types.ts). */
export const NISAB_PRICES_COLUMNS =
  "currency, country_code, gold_price, silver_price, gold_nisab_value, silver_nisab_value, created_at, updated_at, source, reliability";

/** عمود الترتيب: اللقطة اليومية تُحدِّث صفّ الشهر (upsert) فيتغيّر updated_at لا created_at. */
export const NISAB_PRICES_ORDER_COLUMN = "updated_at";

/**
 * «آخر سعر» هو آخر لقطة يومية وحدها (يكتبها hooks/snapshot-prices بهذا الحدث).
 * الجدول يحمل أيضاً متوسطات سنوية تاريخية (LBMA/USGS) بلا حدث، وأحدث
 * updated_at فيها قد يكون لمتوسط سنة مضت — فيُعرض نصابُ ماضٍ نصاباً لليوم.
 */
export const NISAB_PRICES_LIVE_EVENT = "daily_snapshot";

export interface NisabPriceRow {
  currency: string;
  country_code?: string | null;
  gold_price: number | string;
  silver_price: number | string;
  gold_nisab_value: number | string | null;
  silver_nisab_value: number | string | null;
  created_at: string;
  updated_at: string | null;
  source: string | null;
  reliability: string | null;
}

export interface PublicNisabLatest {
  currency: string;
  gold_price_per_gram: number;
  silver_price_per_gram: number;
  gold_nisab: number;
  silver_nisab: number;
  recorded_at: string;
  source: string | null;
  reliability: string | null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * يحوّل صفّ الجدول إلى شكل الردّ العام. يُرجع null لصفّ بلا سعر ذهب صالح:
 * نصابٌ من سعرٍ صفريّ أسوأ من لا نصاب، لأن من يقرؤه يظنّه صحيحاً.
 */
export function toPublicNisab(row: NisabPriceRow | null | undefined): PublicNisabLatest | null {
  if (!row) return null;
  const gold = Number(row.gold_price);
  const silver = Number(row.silver_price);
  if (!Number.isFinite(gold) || gold <= 0) return null;
  const silverOk = Number.isFinite(silver) && silver > 0;
  const storedGoldNisab = Number(row.gold_nisab_value);
  const storedSilverNisab = Number(row.silver_nisab_value);
  return {
    currency: row.currency,
    gold_price_per_gram: gold,
    silver_price_per_gram: silverOk ? silver : 0,
    gold_nisab:
      Number.isFinite(storedGoldNisab) && storedGoldNisab > 0
        ? storedGoldNisab
        : round2(gold * GOLD_NISAB_GRAMS),
    silver_nisab:
      Number.isFinite(storedSilverNisab) && storedSilverNisab > 0
        ? storedSilverNisab
        : silverOk
          ? round2(silver * SILVER_NISAB_GRAMS)
          : 0,
    recorded_at: row.updated_at ?? row.created_at,
    source: row.source,
    reliability: row.reliability,
  };
}
