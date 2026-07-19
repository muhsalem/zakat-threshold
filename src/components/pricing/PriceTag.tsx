import { getLocalPrice } from "@/lib/geo/pricing";
import { billingPeriodLabel, type BillingPeriod } from "@/lib/geo/plans";
import { cn } from "@/lib/utils";

type Props = {
  /** السعر المرجعي بالـ USD (T1). null = حسب الطلب. */
  usdPrice: number | null;
  countryCode?: string | null;
  billing?: BillingPeriod;
  /** نص مخصص للفترة (يتجاوز billing). */
  period?: string;
  /** anchor مثل "يبدأ من". */
  anchorLabel?: string;
  className?: string;
};

export function PriceTag({
  usdPrice,
  countryCode,
  billing = "monthly",
  period,
  anchorLabel,
  className,
}: Props) {
  const periodText = period ?? billingPeriodLabel(billing);

  if (usdPrice === null) {
    return (
      <div className={cn("flex items-baseline gap-1", className)}>
        <span className="text-3xl font-bold">حسب الطلب</span>
      </div>
    );
  }

  if (usdPrice === 0) {
    return (
      <div className={cn("flex items-baseline gap-1", className)}>
        <span className="text-3xl font-bold">مجاناً</span>
        <span className="text-sm text-muted-foreground">للأبد</span>
      </div>
    );
  }

  const price = getLocalPrice(usdPrice, countryCode);

  // نُخفي مرجع USD في T3/T4 لتجنّب شعور المستخدم بـ"المقارنة" السلبية.
  // نُظهره فقط في T1 (نفس السعر) و T2 (خصم معتدل).
  const showUsdReference =
    price.currency !== "USD" &&
    (price.country.tier === "T1" || price.country.tier === "T2");

  return (
    <div className={cn("space-y-1", className)}>
      {anchorLabel && (
        <span className="text-xs text-muted-foreground block">{anchorLabel}</span>
      )}
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-3xl font-bold">{price.formatted}</span>
        <span className="text-sm text-muted-foreground">{periodText}</span>
      </div>
      {showUsdReference && price.usdEquivalent > 0 && (
        <div className="text-xs text-muted-foreground">
          ≈ ${price.usdEquivalent.toFixed(2)} USD
        </div>
      )}
      {!showUsdReference && price.saving > 0 && (
        <div className="text-xs text-primary font-medium">
          سعر محلي مخصّص لمنطقتك
        </div>
      )}
    </div>
  );
}
