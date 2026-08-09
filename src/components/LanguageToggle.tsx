import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

/**
 * يبدّل بين عربي/إنجليزي فعلياً الآن — الشريط الجانبي وأعلى الصفحة
 * مترجَمان بعمق حقيقي (nav.*, group.*, auth.*, search.*). محتوى الحاسبات
 * الداخلي وصفحات التسويق لا تزال عربية فقط؛ هذا نطاق مقصود (قرار: "إنجليزي
 * فقط بعمق حقيقي" بدل عشر لغات سطحية) — نوضّح ذلك بدل الادعاء بترجمة كاملة.
 * fr/ur/id غير مُفعَّلة هنا بعد (راجع src/lib/i18n.tsx وTERMINOLOGY.md).
 */
export default function LanguageToggle() {
  const { lang, cycleLang, t } = useI18n();

  function handleClick() {
    cycleLang();
    if (lang === "ar") {
      toast.info(
        "English: navigation & core UI are translated. Calculator content stays Arabic for now.",
      );
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs">{t("lang.toggle")}</span>
    </Button>
  );
}
