import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { useNisab } from "@/components/site/Prices";
import { useI18n } from "@/lib/i18n";
import { findCountry, countryName } from "@/lib/countries";

export const Route = createFileRoute("/widget")({
  head: () => ({
    meta: [
      { title: "ودجة نصاب الزكاة اليومي المضمنة" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EmbedWidget,
});

function EmbedWidget() {
  const { values, money, isLoading, isError, currency } = useNisab();
  const { country, lang, setCountry } = useI18n();

  // Read URL query params on mount for country embedding
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const countryParam = params.get("country");
    if (countryParam) {
      setCountry(countryParam.toUpperCase());
    }
  }, [setCountry]);

  const countryObj = findCountry(country);
  const countryTitle = countryObj ? countryName(countryObj, lang) : country;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-xs text-muted-foreground bg-card">
        جاري جلب أسعار النصاب اللحظية...
      </div>
    );
  }

  if (isError || !values) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-xs text-destructive bg-card">
        تعذر تحميل أسعار النصاب. يرجى التحديث.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card p-4 text-foreground font-sans flex flex-col justify-between border border-border rounded-xl">
      <div>
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="grid size-6 place-items-center rounded bg-primary text-primary-foreground font-bold text-xs">
              ن
            </span>
            <span className="text-xs font-bold text-foreground">نصاب الزكاة اليوم</span>
            <span className="text-[0.65rem] text-muted-foreground">({countryTitle})</span>
          </div>
          <span className="num text-[0.7rem] rounded bg-secondary px-1.5 py-0.5 text-muted-foreground">
            {currency}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-border bg-background p-2.5">
            <span className="block text-[0.65rem] text-muted-foreground">نصاب الذهب (85 جم)</span>
            <span className="num block mt-1 text-sm sm:text-base font-bold text-foreground">
              {money(values.gold)}
            </span>
            <span className="num block mt-0.5 text-[0.65rem] text-muted-foreground">
              عيار 21: {money(values.goldGram * 0.875)}
            </span>
          </div>

          <div className="rounded-lg border border-border bg-background p-2.5">
            <span className="block text-[0.65rem] text-muted-foreground">نصاب الفضة (595 جم)</span>
            <span className="num block mt-1 text-sm sm:text-base font-bold text-foreground">
              {money(values.silver)}
            </span>
            <span className="num block mt-0.5 text-[0.65rem] text-muted-foreground">
              جرام الفضة: {money(values.silverGram)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/60 text-[0.65rem] text-muted-foreground">
        <span>
          الأحظ للفقراء: <strong className="text-foreground">{money(values.lower)}</strong>
        </span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          حاسبة نِصاب
          <ExternalLink className="size-2.5 ms-0.5" />
        </a>
      </div>
    </div>
  );
}
