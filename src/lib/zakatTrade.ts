/**
 * زكاة الأنشطة الزراعية والحيوانية الملحقة بعروض التجارة
 *
 * يحوّل العسل والثروة السمكية والدواجن والأنعام (إن كانت للتجارة)
 * إلى قاعدة موحَّدة تُضمّ إلى عروض التجارة لحساب 2.5%.
 *
 * يضمن عدم الازدواج: متى ضُمّ النشاط لعروض التجارة، لا يُحسب
 * مرة أخرى عيناً (للأنعام) ولا بنسبة الزروع 10% (للعسل).
 */

import { ZAKAT_RATE } from "./zakat";

export const HONEY_NISAB_KG = 653; // قياساً على نصاب الزروع (5 أوسق)
export const HONEY_RATE = 0.10;
export const RIKAZ_RATE = 0.20;

export interface HoneyInput { kg: number; pricePerKg: number; }
export interface NetInput { value: number; cost: number; }
export interface LivestockTradeInput { enabled: boolean; marketValue: number; }

export function honeyZakatableValue(input: HoneyInput): number {
  const kg = Math.max(0, input.kg);
  const price = Math.max(0, input.pricePerKg);
  if (kg < HONEY_NISAB_KG) return 0; // لم يبلغ النصاب
  return kg * price;
}

export function netZakatable(input: NetInput): number {
  const v = Math.max(0, input.value);
  const c = Math.max(0, input.cost);
  return Math.max(0, v - c); // الصافي لا يكون سالباً
}

export function livestockTradeBase(input: LivestockTradeInput): number {
  if (!input.enabled) return 0;
  return Math.max(0, input.marketValue);
}

export interface AgriTradeAggregate {
  honey: number;
  fish: number;
  poultry: number;
  livestock: number;
  total: number;       // مجموع القاعدة المُضافة لعروض التجارة
  zakat: number;       // 2.5% من المجموع (مجرد إشارة — تُحسب في الإجمالي الكلي)
}

export interface AgriTradeInputs {
  honey?: HoneyInput;
  fish?: NetInput;
  poultry?: NetInput;
  livestock?: LivestockTradeInput;
}

/**
 * يجمع كل المصادر الملحقة بعروض التجارة.
 * - العسل: يُحتسب فقط إن بلغ النصاب 653 كجم.
 * - الأسماك/الدواجن: صافي قيمة بعد خصم التكاليف (لا سالب).
 * - الأنعام: فقط إن فُعّل خيار "للتجارة"، بالقيمة السوقية.
 */
export function aggregateAgriTrade(inputs: AgriTradeInputs): AgriTradeAggregate {
  const honey = inputs.honey ? honeyZakatableValue(inputs.honey) : 0;
  const fish = inputs.fish ? netZakatable(inputs.fish) : 0;
  const poultry = inputs.poultry ? netZakatable(inputs.poultry) : 0;
  const livestock = inputs.livestock ? livestockTradeBase(inputs.livestock) : 0;
  const total = honey + fish + poultry + livestock;
  return { honey, fish, poultry, livestock, total, zakat: total * ZAKAT_RATE };
}
