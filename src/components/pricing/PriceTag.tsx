import { getLocalPrice } from "@/lib/geo/pricing";
import { cn } from "@/lib/utils";

type Props = {
  usdMonthly: number | null;
  countryCode?: string | null;
  period?: string;
  className?: string;
  showUsd?: boolean;
};

export function PriceTag({
  usdMonthly,
  countryCode,
  period = "/ شهر",
  className,
  showUsd = true,
}: Props) {
  if (usdMonthly === null) {
    return (
      <div className={cn("flex items-baseline gap-1", className)}>
        <span className="text-3xl font-bold">حسب الطلب</span>
      </div>
    );
  }

  if (usdMonthly === 0) {
    return (
      <div className={cn("flex items-baseline gap-1", className)}>
        <span className="text-3xl font-bold">مجاناً</span>
        <span className="text-sm text-muted-foreground">للأبد</span>
      </div>
    );
  }

  const price = getLocalPrice(usdMonthly, countryCode);
  const showConversion =
    showUsd && price.currency !== "USD" && price.usdEquivalent > 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-3xl font-bold">{price.formatted}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </div>
      {showConversion && (
        <div className="text-xs text-muted-foreground">
          ≈ ${price.usdEquivalent.toFixed(2)} USD
          {price.saving > 0 && (
            <span className="ms-2 text-primary font-medium">
              خصم {price.saving}% للمنطقة
            </span>
          )}
        </div>
      )}
    </div>
  );
}
