import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { startCheckout, type PlanId } from "@/lib/payments";
import { toast } from "sonner";

interface Props {
  planId: PlanId;
  label?: string;
  returnPath?: string;
  variant?: "default" | "outline";
  className?: string;
}

export function PayButton({
  planId,
  label = "اشترِ الآن",
  returnPath = "/",
  variant = "default",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    const result = await startCheckout(planId, returnPath);
    if (!result.ok) {
      toast.error(result.error ?? "حدث خطأ أثناء الدفع");
      setLoading(false);
    }
    // إذا نجح، سيُوجَّه المستخدم تلقائياً — لا نحتاج setLoading(false)
  }

  return (
    <Button variant={variant} className={className} onClick={handlePay} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin ml-2" />
      ) : (
        <CreditCard className="h-4 w-4 ml-2" />
      )}
      {label}
    </Button>
  );
}
