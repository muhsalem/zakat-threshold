import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/consent";

/**
 * بانر موافقة أدنى — يظهر مرة واحدة فقط قبل أي كتابة لتحليلات المنتج
 * (product_events). التخزين المحلي الوظيفي (لغة/دولة/مسودات) لا يحتاج
 * موافقة لأنه ضروري لعمل التطبيق، فلا يُغطّى بهذا البانر.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getAnalyticsConsent() === null);
  }, []);

  if (!visible) return null;

  function choose(accepted: boolean) {
    setAnalyticsConsent(accepted ? "accepted" : "declined");
    setVisible(false);
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="موافقة على تحليلات الاستخدام"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur-sm shadow-lg"
    >
      <div className="container mx-auto flex flex-col md:flex-row items-center gap-3 px-4 py-3 text-sm">
        <p className="flex-1 text-muted-foreground">
          نستخدم تحليلات استخدام أساسية (من الطرف الأول، بلا بيانات مالية أو شخصية) لتحسين المنصة.
          راجع{" "}
          <Link to="/legal/privacy" className="text-primary underline">
            سياسة الخصوصية
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => choose(false)}>
            رفض
          </Button>
          <Button size="sm" onClick={() => choose(true)}>
            موافق
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
