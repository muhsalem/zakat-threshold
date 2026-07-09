import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { verifyCheckoutSession } from "@/lib/payments";

const searchSchema = z.object({
  checkout: z.enum(["success", "cancelled"]).optional(),
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/checkout-result")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "نتيجة الدفع — نِصاب" }] }),
  component: CheckoutResultPage,
});

function CheckoutResultPage() {
  const { checkout, session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "cancelled" | "error">(
    checkout === "cancelled" ? "cancelled" : "loading",
  );

  useEffect(() => {
    if (checkout === "cancelled" || !session_id) {
      if (checkout !== "cancelled") setStatus("error");
      return;
    }
    // تحقق من قاعدة البيانات بعد ثانية (Webhook قد يتأخر قليلاً)
    const timer = setTimeout(async () => {
      const result = await verifyCheckoutSession(session_id);
      setStatus(result === "paid" ? "paid" : result === "pending" ? "pending" : "error");
    }, 1500);
    return () => clearTimeout(timer);
  }, [checkout, session_id]);

  // Auto-redirect بعد النجاح
  useEffect(() => {
    if (status === "paid") {
      const t = setTimeout(() => navigate({ to: "/dashboard" }), 4000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardContent className="pt-10 pb-8 text-center space-y-5">
          {status === "loading" && (
            <>
              <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-bold">جارٍ التحقق من الدفع…</h1>
              <p className="text-sm text-muted-foreground">لحظة من فضلك</p>
            </>
          )}
          {status === "paid" && (
            <>
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
              <h1 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                تم الدفع بنجاح 🎉
              </h1>
              <p className="text-sm text-muted-foreground">
                سيُفعَّل اشتراكك خلال لحظات. جارٍ التوجيه للوحة التحكم…
              </p>
              <Link to="/dashboard">
                <Button className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> لوحة التحكم
                </Button>
              </Link>
            </>
          )}
          {status === "pending" && (
            <>
              <Loader2 className="h-14 w-14 animate-spin text-amber-500 mx-auto" />
              <h1 className="text-xl font-bold">جارٍ معالجة الدفع</h1>
              <p className="text-sm text-muted-foreground">
                قد يستغرق هذا بضع دقائق. ستصلك رسالة بريد إلكتروني عند التأكيد.
              </p>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full">
                  العودة للوحة التحكم
                </Button>
              </Link>
            </>
          )}
          {status === "cancelled" && (
            <>
              <XCircle className="h-14 w-14 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-bold">تم إلغاء عملية الدفع</h1>
              <p className="text-sm text-muted-foreground">لم يُخصم أي مبلغ من حسابك.</p>
              <Link to="/#pricing">
                <Button variant="outline" className="w-full">
                  العودة للأسعار
                </Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-14 w-14 text-destructive mx-auto" />
              <h1 className="text-xl font-bold">حدث خطأ</h1>
              <p className="text-sm text-muted-foreground">
                إذا تم خصم المبلغ ولم يُفعَّل اشتراكك، تواصل معنا على support@nisab.app
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  الصفحة الرئيسية
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
