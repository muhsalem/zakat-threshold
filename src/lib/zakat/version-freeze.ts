/**
 * Version Freeze — تجميد إصدارات الحساب
 * --------------------------------------
 * يسدّ الفجوة (2): كل نتيجة زكوية مؤرشفة تحمل بصمة إصدارات كاملة،
 * فلا تتغير النتائج القديمة تلقائياً بسبب تحديث قاعدة أو سعر أو منهجية.
 *
 * القاعدة: التقرير المؤرشف يُعاد إنتاجه بنفس الأرقام بعد سنوات.
 */

import { RULES_CATALOG_VERSION } from "./rules-catalog";

/** إصدار محرك الحساب — يُرفع يدوياً عند أي تغيير يؤثر على النتائج */
export const CALCULATION_ENGINE_VERSION = "2026.1.0";

/** إصدار محرك التقارير */
export const REPORT_ENGINE_VERSION = "2026.1.0";

export interface PriceSnapshot {
  /** المعدن أو العملة */
  symbol: string;
  /** السعر لكل وحدة (جرام / وحدة عملة) */
  price: number;
  currency: string;
  /** مزوّد السعر — يُطبع في التقرير */
  provider: string;
  /** لحظة التقاط السعر */
  capturedAt: string;
}

export interface VersionStamp {
  rulesVersion: string;
  engineVersion: string;
  reportEngineVersion: string;
  methodologyVersion: string;
  priceVersion: string;
  /** لقطات الأسعار المستخدمة فعلياً في هذا الحساب */
  priceSnapshots: PriceSnapshot[];
  /** لحظة تجميد الحساب */
  frozenAt: string;
}

/** معرّف مستقر للقطة الأسعار — يُبنى من المزوّد والطابع الزمني */
export function derivePriceVersion(snapshots: PriceSnapshot[]): string {
  if (!snapshots.length) return "no-prices";
  const sorted = [...snapshots].sort((a, b) => a.symbol.localeCompare(b.symbol));
  const newest = sorted.reduce(
    (max, s) => (s.capturedAt > max ? s.capturedAt : max),
    sorted[0].capturedAt,
  );
  const providers = Array.from(new Set(sorted.map((s) => s.provider))).join("+");
  return `${providers}@${newest}`;
}

/** ينشئ بصمة الإصدارات لحساب جديد */
export function createVersionStamp(params: {
  methodologyVersion: string;
  priceSnapshots?: PriceSnapshot[];
  frozenAt?: string;
}): VersionStamp {
  const snapshots = params.priceSnapshots ?? [];
  return {
    rulesVersion: RULES_CATALOG_VERSION,
    engineVersion: CALCULATION_ENGINE_VERSION,
    reportEngineVersion: REPORT_ENGINE_VERSION,
    methodologyVersion: params.methodologyVersion,
    priceVersion: derivePriceVersion(snapshots),
    priceSnapshots: snapshots,
    frozenAt: params.frozenAt ?? new Date().toISOString(),
  };
}

export interface ReproducibilityCheck {
  reproducible: boolean;
  /** فروقات الإصدارات بين الحساب المؤرشف والبيئة الحالية */
  drift: Array<{ field: keyof VersionStamp; archived: string; current: string }>;
  message: string;
}

/**
 * يقارن بصمة محفوظة بالبيئة الحالية.
 * وجود انحراف لا يعني خطأ — يعني أن إعادة الحساب اليوم قد تعطي رقماً مختلفاً،
 * ولذلك يجب عرض النتيجة المؤرشفة كما هي مع تنبيه واضح.
 */
export function checkReproducibility(stamp: VersionStamp): ReproducibilityCheck {
  const drift: ReproducibilityCheck["drift"] = [];
  if (stamp.rulesVersion !== RULES_CATALOG_VERSION) {
    drift.push({
      field: "rulesVersion",
      archived: stamp.rulesVersion,
      current: RULES_CATALOG_VERSION,
    });
  }
  if (stamp.engineVersion !== CALCULATION_ENGINE_VERSION) {
    drift.push({
      field: "engineVersion",
      archived: stamp.engineVersion,
      current: CALCULATION_ENGINE_VERSION,
    });
  }
  if (stamp.reportEngineVersion !== REPORT_ENGINE_VERSION) {
    drift.push({
      field: "reportEngineVersion",
      archived: stamp.reportEngineVersion,
      current: REPORT_ENGINE_VERSION,
    });
  }
  return {
    reproducible: drift.length === 0,
    drift,
    message: drift.length
      ? "تم إنتاج هذا التقرير بإصدارات سابقة. النتائج معروضة كما جُمّدت وقت الاعتماد ولم تُعد حسابها."
      : "الإصدارات مطابقة للبيئة الحالية — النتيجة قابلة لإعادة الإنتاج بالكامل.",
  };
}

/** سطر يُطبع أسفل كل تقرير رسمي */
export function formatVersionFooter(stamp: VersionStamp): string {
  return [
    `القواعد: ${stamp.rulesVersion}`,
    `المحرك: ${stamp.engineVersion}`,
    `المنهجية: ${stamp.methodologyVersion}`,
    `الأسعار: ${stamp.priceVersion}`,
  ].join(" · ");
}
