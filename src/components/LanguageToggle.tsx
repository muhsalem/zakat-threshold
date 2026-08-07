import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { toast } from "sonner";

/**
 * الترجمة الفعلية للمنصة (40+ أداة) غير مكتملة — فقط ~20 مفتاحاً مترجَماً
 * بـsrc/lib/i18n.tsx تُستخدَم في مكوّنين اثنين فقط. تفعيل تبديل اللغة هنا
 * كان يغيّر lang/dir دون أي تغيير فعلي بمحتوى الشاشات — تجربة مكسورة
 * موحية بدعم لغوي غير موجود. عُطِّل التبديل حتى تكتمل الترجمة فعلياً.
 */
export default function LanguageToggle() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toast.info("دعم اللغات الأخرى قيد التطوير — المنصة عربية بالكامل حالياً")}
      aria-label="Change language (coming soon)"
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs">العربية</span>
    </Button>
  );
}
