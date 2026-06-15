import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label="Toggle language"
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs">{t("lang.toggle")}</span>
    </Button>
  );
}
