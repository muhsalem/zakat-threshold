// منطق مركزي لخصومات الـ Checkout — يُستخدم في العميل (لعرض السعر النهائي) وفي
// الـ Edge Function (لتطبيق الخصم فعلياً على Stripe). لا يعتمد على ملفات خادم.

export type CheckoutPlanId =
  | "personal-one-time"
  | "personal-annual"
  | "family-annual"
  | "personal-lifetime"
  | "startup"
  | "growth"
  | "business"
  // مطابقة أسماء payments.ts القديمة (للتوافق):
  | "certified"
  | "vip_annual";

export type DiscountOptions = {
  /** خصم Early-Bird 30% قبل رمضان — يُطبَّق مرة واحدة على أول فاتورة/دفعة. */
  earlyBird?: boolean;
  /** الدفع المسبق لعدد سنوات (1 افتراضي). 3 = خصم 20% + قفل السعر لثلاث سنوات. */
  prepayYears?: 1 | 3;
};

export type DiscountBreakdown = {
  /** السعر الأساسي بالدولار عن سنة واحدة/دفعة واحدة. */
  baseUsd: number;
  /** عدد الوحدات (سنوات) المطبَّقة. */
  years: number;
  /** نسبة خصم Early-Bird (0 أو 0.30). */
  earlyBirdPct: number;
  /** نسبة خصم الدفع المسبق (0 أو 0.20). */
  prepayPct: number;
  /** السعر النهائي بالدولار بعد كل الخصومات. */
  totalUsd: number;
  /** مبلغ التوفير بالدولار. */
  savedUsd: number;
  /** أسطر مقروءة للعرض في الواجهة. */
  lines: string[];
};

/** أهلية خصم Early-Bird — يُطبَّق فقط على الخطط السنوية المؤهَّلة. */
export function isEarlyBirdEligible(planId: CheckoutPlanId): boolean {
  return [
    "personal-annual",
    "family-annual",
    "startup",
    "growth",
    "business",
    "vip_annual",
  ].includes(planId);
}

/** أهلية الدفع لثلاث سنوات — الخطط السنوية فقط. */
export function isPrepayEligible(planId: CheckoutPlanId): boolean {
  return isEarlyBirdEligible(planId);
}

/** هل نافذة Early-Bird مفتوحة الآن؟ يُتحكَّم بها عبر متغيّر بيئة (VITE_EARLY_BIRD_UNTIL=YYYY-MM-DD) */
export function isEarlyBirdWindowOpen(now: Date = new Date()): boolean {
  const until = import.meta.env.VITE_EARLY_BIRD_UNTIL as string | undefined;
  if (!until) return true; // مفتوح افتراضياً حتى يُحدَّد تاريخ الإغلاق
  const end = new Date(until + "T23:59:59Z");
  return !Number.isNaN(end.getTime()) && now <= end;
}

export function computeDiscount(
  planId: CheckoutPlanId,
  baseUsd: number,
  opts: DiscountOptions = {},
): DiscountBreakdown {
  const earlyBird = !!opts.earlyBird && isEarlyBirdEligible(planId);
  const years = opts.prepayYears === 3 && isPrepayEligible(planId) ? 3 : 1;

  const earlyBirdPct = earlyBird ? 0.30 : 0;
  const prepayPct = years === 3 ? 0.20 : 0;

  // Early-Bird يُطبَّق على أول فاتورة فقط (سنة واحدة)، وخصم الدفع المسبق
  // يُطبَّق على كامل السنوات الثلاث.
  const firstYearAfterEB = baseUsd * (1 - earlyBirdPct);
  const remainingYears = Math.max(0, years - 1) * baseUsd;
  const subtotal = firstYearAfterEB + remainingYears;
  const totalUsd = Math.round(subtotal * (1 - prepayPct) * 100) / 100;
  const gross = baseUsd * years;
  const savedUsd = Math.round((gross - totalUsd) * 100) / 100;

  const lines: string[] = [];
  if (earlyBird) lines.push("Early-Bird: خصم 30% على السنة الأولى");
  if (years === 3) lines.push("دفع مسبق 3 سنوات: خصم 20% إضافي + قفل السعر");

  return { baseUsd, years, earlyBirdPct, prepayPct, totalUsd, savedUsd, lines };
}
