import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/**
 * شريط عائم مبسّط — أُبقي على المستشار الذكي فقط.
 * (تم إلغاء بوابات الدخول والمعلومات؛ التنقل الآن عبر الشريط الجانبي الأيسر).
 */
export function FloatingDock() {
  return (
    <Link
      to="/advisor"
      aria-label="فتح المستشار الذكي"
      className="print:hidden hidden md:inline-flex fixed bottom-4 left-4 z-40 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
    >
      <Sparkles className="h-4 w-4" />
      المستشار الذكي
    </Link>
  );
}
