import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, cycleLang } = useI18n();
  const labels: Record<string, string> = {
    ar: "العربية",
    en: "English",
    fr: "Français",
    ur: "اردو",
    id: "Bahasa",
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleLang}
      aria-label="Change language"
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs">{labels[lang]}</span>
    </Button>
  );
}
