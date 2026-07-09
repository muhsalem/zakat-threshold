// أنواع زكاة إضافية غير مغطّاة في الحاسبات الأساسية.
// جميعها ترجع نتيجة موحّدة: { base, zakat, rate, note }.
// المصادر: fatwaEngine.ts (ip.royalties, crypto.mining, fisheries, livestock.production).

export type ExtendedZakatResult = {
  base: number; // الوعاء الزكوي بعد الحسم
  zakat: number; // الزكاة المستحقّة
  rate: number; // النسبة المطبّقة (0.025 أو 0.10 أو غيره)
  note: string; // ملاحظة فقهية موجزة
};

const clampNonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * زكاة تعدين الكريبتو — AAOIFI-59 / قرارات معاصرة:
 * تُعامل عوائد التعدين معاملة عروض التجارة إذا كانت للبيع، أو زكاة مستغلات (10% من صافي الإيراد)
 * إذا احتُفظ بها للتحصيل والدخل المتكرر. النموذج الأشيع: 2.5% على القيمة السوقية للعملات
 * المُملَكة + الأرصدة النقدية عند حولان الحول، بعد خصم النفقات المستحقّة (كهرباء، صيانة، إيجار).
 */
export function calcCryptoMiningZakat(params: {
  minedValueAtHawl: number; // القيمة السوقية للعملات المُعدَّنة والمحتفظ بها عند الحول
  cashFromSales: number; // النقد المتحصّل من بيع العملات المُعدَّنة
  operatingCosts: number; // تكاليف تشغيل مستحقّة (كهرباء، صيانة، إيجار)
  method?: "trade" | "yield"; // "trade" = عروض تجارة (الافتراضي)، "yield" = زكاة مستغلات
}): ExtendedZakatResult {
  const mined = clampNonNegative(params.minedValueAtHawl);
  const cash = clampNonNegative(params.cashFromSales);
  const costs = clampNonNegative(params.operatingCosts);
  const method = params.method ?? "trade";

  if (method === "yield") {
    // زكاة مستغلات: 10% من صافي الإيراد (بعد النفقات) — قياساً على الزروع المسقيّة بكلفة.
    const netYield = Math.max(0, cash - costs);
    return {
      base: netYield,
      zakat: netYield * 0.1,
      rate: 0.1,
      note: "زكاة مستغلات (10% صافي الإيراد) — عند اعتماد قياس التعدين على الزروع.",
    };
  }

  const base = Math.max(0, mined + cash - costs);
  return {
    base,
    zakat: base * 0.025,
    rate: 0.025,
    note: "عروض تجارة (2.5%) — الرأي الأشيع في AAOIFI-59 وقرارات المجامع.",
  };
}

/**
 * زكاة الثروة السمكية والمزارع المائية:
 * لا زكاة في ذات السمك (كالأنعام يشترط فيها السوم والحول). إذا كانت للتجارة زُكّيت
 * زكاة عروض تجارة على القيمة السوقية للمخزون + النقد − الديون التشغيلية المستحقّة.
 */
export function calcFisheriesZakat(params: {
  inventoryMarketValue: number; // القيمة السوقية للمخزون الحيّ عند الحول
  cashAndReceivables: number; // النقد وأرصدة العملاء
  operatingPayables: number; // ديون تشغيلية مستحقّة (علف، عمالة)
  isForTrade?: boolean; // true = تجارة (الافتراضي)، false = استهلاك شخصي
}): ExtendedZakatResult {
  if (params.isForTrade === false) {
    return {
      base: 0,
      zakat: 0,
      rate: 0,
      note: "لا زكاة في السمك عيناً إذا لم يكن للتجارة.",
    };
  }
  const base = Math.max(
    0,
    clampNonNegative(params.inventoryMarketValue) +
      clampNonNegative(params.cashAndReceivables) -
      clampNonNegative(params.operatingPayables),
  );
  return {
    base,
    zakat: base * 0.025,
    rate: 0.025,
    note: "عروض تجارة (2.5%) على القيمة السوقية للمخزون السمكي.",
  };
}

/**
 * زكاة الإنتاج الحيواني (ألبان، بيض، لحوم للبيع):
 * الأنعام السائمة لها زكاتها الخاصة. أمّا مزارع الإنتاج التجاري (معلوفة/مربوطة)
 * فتُزكّى معاملة عروض التجارة على القيمة السوقية للقطيع + المنتجات + النقد − الديون.
 */
export function calcAnimalProductionZakat(params: {
  herdMarketValue: number; // القيمة السوقية للقطيع التجاري
  productsInventory: number; // مخزون منتجات (ألبان/بيض/لحوم مجمّدة)
  cashAndReceivables: number;
  operatingPayables: number;
}): ExtendedZakatResult {
  const base = Math.max(
    0,
    clampNonNegative(params.herdMarketValue) +
      clampNonNegative(params.productsInventory) +
      clampNonNegative(params.cashAndReceivables) -
      clampNonNegative(params.operatingPayables),
  );
  return {
    base,
    zakat: base * 0.025,
    rate: 0.025,
    note: "الإنتاج الحيواني التجاري (المعلوف) يُزكّى زكاة عروض تجارة (2.5%).",
  };
}

/**
 * زكاة الملكية الفكرية (براءات، حقوق نشر، علامات تجارية):
 * - mode "trade": القيمة السوقية للحقوق المعروضة للبيع → عروض تجارة 2.5%.
 * - mode "royalty": الإتاوات المقبوضة تُضمّ للنقد وتُزكّى 2.5% عند حولان الحول
 *   (رأي جمهور المعاصرين). البديل: زكاة مستغلات 10% صافي الإيراد.
 */
export function calcIntellectualPropertyZakat(params: {
  mode: "trade" | "royalty" | "yield";
  assetMarketValue?: number; // للـ "trade"
  royaltiesReceived?: number; // للـ "royalty" و "yield"
  managementCosts?: number; // للـ "yield" فقط
}): ExtendedZakatResult {
  const costs = clampNonNegative(params.managementCosts ?? 0);
  if (params.mode === "trade") {
    const base = clampNonNegative(params.assetMarketValue ?? 0);
    return {
      base,
      zakat: base * 0.025,
      rate: 0.025,
      note: "الحقوق المعروضة للبيع = عروض تجارة (2.5%).",
    };
  }
  if (params.mode === "yield") {
    const net = Math.max(0, clampNonNegative(params.royaltiesReceived ?? 0) - costs);
    return {
      base: net,
      zakat: net * 0.1,
      rate: 0.1,
      note: "زكاة مستغلات (10% صافي إيراد الإتاوات) — رأي بعض المعاصرين.",
    };
  }
  const base = clampNonNegative(params.royaltiesReceived ?? 0);
  return {
    base,
    zakat: base * 0.025,
    rate: 0.025,
    note: "الإتاوات المقبوضة تُضمّ للنقد وتُزكّى 2.5% عند حولان الحول.",
  };
}
