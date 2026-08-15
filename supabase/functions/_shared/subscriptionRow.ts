/**
 * اشتقاق حقول صف الاشتراك من وقائع جلسة Stripe — منطق نقي بلا أي استيراد.
 *
 * مستخرَج من stripe-webhook ليصير قابلاً للاختبار: الأصل كان داخل معالج الحدث،
 * ولا يمكن استيراد الدالة الطرفية في vitest (تستورد من esm.sh وتعمل على Deno).
 *
 * القاعدة الحاكمة: القيم من Stripe لا من كتالوج التطبيق. يوجد كتالوجان
 * متعارضان (payments.ts يبيع startup شهرياً بـ$149 وplans.ts يعرّفه سنوياً
 * بـ$99)، والصف تُبنى منه فاتورة PDF — فالمصدر الوحيد المقبول هو ما شُحن فعلاً.
 */

/** القيم المسموحة في CHECK constraint على user_subscriptions.billing_period */
export type BillingPeriod = "monthly" | "yearly" | "lifetime" | "one_time";

export type SubscriptionRowInput = {
  /** session.mode */
  mode?: string | null;
  /** session.amount_total — بالوحدات الصغرى (سنتات) */
  amountTotalMinor?: number | null;
  /** session.currency */
  currency?: string | null;
  /** session.metadata.prepayYears — دفع مسبق لعدة سنوات */
  prepayYears?: string | number | null;
  /** price.recurring.interval للاشتراكات */
  recurringInterval?: string | null;
  /** subscription.current_period_end — بالثواني (اصطلاح Stripe) */
  currentPeriodEndSec?: number | null;
  /** لحقن الزمن في الاختبارات */
  now?: number;
};

export type SubscriptionRowFields = {
  amount: number;
  currency: string;
  billingPeriod: BillingPeriod;
  renewsAt: string | null;
};

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;

/**
 * يحوّل دورية Stripe إلى القيم التي يقبلها المخطط.
 * لا يقبل CHECK سوى monthly/yearly/lifetime/one_time، فـ day/week تُقرَّب إلى
 * monthly بوصفها الأقرب — وهي حالة لا تنتجها خططنا الحالية لكن تركها تسقط
 * على "yearly" (كما كان) كان سيصف اشتراكاً أسبوعياً بأنه سنوي.
 */
function intervalToBillingPeriod(interval: string | null | undefined): BillingPeriod {
  switch (interval) {
    case "month":
    case "week":
    case "day":
      return "monthly";
    case "year":
      return "yearly";
    default:
      return "yearly";
  }
}

export function deriveSubscriptionRow(input: SubscriptionRowInput): SubscriptionRowFields {
  const now = input.now ?? Date.now();

  const amount = Math.round(((input.amountTotalMinor ?? 0) / 100) * 100) / 100;
  const currency = (input.currency ?? "usd").toUpperCase();

  if (input.mode === "subscription") {
    return {
      amount,
      currency,
      billingPeriod: intervalToBillingPeriod(input.recurringInterval),
      renewsAt: input.currentPeriodEndSec
        ? new Date(input.currentPeriodEndSec * 1000).toISOString()
        : null,
    };
  }

  // دفعة واحدة: قد تكون تغطية ممتدة مدفوعة مقدماً
  const years = Number(input.prepayYears ?? 0);
  const prepaid = Number.isFinite(years) && years > 0;

  return {
    amount,
    currency,
    billingPeriod: "one_time",
    renewsAt: prepaid ? new Date(now + years * YEAR_DAYS * DAY_MS).toISOString() : null,
  };
}
