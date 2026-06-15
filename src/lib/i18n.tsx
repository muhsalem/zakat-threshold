import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  ar: {
    "app.title": "حاسبة الزكاة",
    "app.subtitle": "نموذج شامل لكل الأوعية وفق المعايير الشرعية",
    "disclaimer.title": "إخلاء مسؤولية شرعي:",
    "disclaimer.body":
      "هذه الحاسبة استرشادية ومبنية على المعايير الفقهية المعتمدة (AAOIFI، المجامع الفقهية، بيت الزكاة الكويتي). للحالات الخاصة والفتاوى الملزمة، يُرجى مراجعة دار الإفتاء أو عالم/مفتٍ معتمد في بلدك.",
    "hero.title": "احسب زكاتك بدقة وفق المنهج الشرعي",
    "hero.body":
      "نموذج شامل لكل الأوعية: نقد وأوراق مالية وتجارية ورقمية وعقار وزروع وأنعام وركاز، مع مطابقة الوعاء الضريبي.",
    "tabs.individual": "الأفراد",
    "tabs.company": "الشركات",
    "tabs.fitr": "زكاة الفطر",
    "tabs.history": "الأنصبة",
    "tabs.advanced": "أدوات متقدمة",
    "footer.brand": "حاسبة الزكاة الشاملة",
    "footer.about":
      "أداة استرشادية فقهية‑محاسبية وفق المعايير الشرعية الدولية (AAOIFI رقم 35) وفتاوى المجامع الفقهية وبيت الزكاة الكويتي.",
    "footer.legal": "روابط قانونية",
    "footer.privacy": "سياسة الخصوصية",
    "footer.terms": "شروط الاستخدام وإخلاء المسؤولية",
    "footer.disclaimer": "إخلاء مسؤولية",
    "footer.disclaimerBody":
      "نتائج هذه الحاسبة استرشادية وليست فتوى ملزمة ولا تقريراً حكومياً معتمداً. للحالات الخاصة يُرجى مراجعة عالم/مفتٍ معتمد أو هيئة الفتوى المحلية.",
    "lang.toggle": "English",
  },
  en: {
    "app.title": "Zakat Calculator",
    "app.subtitle": "Comprehensive model for all zakat categories per Sharia standards",
    "disclaimer.title": "Sharia disclaimer:",
    "disclaimer.body":
      "This calculator is advisory, based on adopted standards (AAOIFI, fiqh academies, Kuwait Zakat House). For binding fatwas and special cases, consult your local fatwa authority or a certified scholar.",
    "hero.title": "Calculate your Zakat accurately, the Sharia way",
    "hero.body":
      "All categories: cash, securities, trade, digital, real estate, crops, livestock and rikaz — with tax-base reconciliation.",
    "tabs.individual": "Individuals",
    "tabs.company": "Companies",
    "tabs.fitr": "Zakat al-Fitr",
    "tabs.history": "Nisab",
    "tabs.advanced": "Advanced",
    "footer.brand": "Comprehensive Zakat Calculator",
    "footer.about":
      "An advisory fiqh-accounting tool aligned with AAOIFI 35, international fiqh resolutions, and Kuwait Zakat House.",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms & Disclaimer",
    "footer.disclaimer": "Disclaimer",
    "footer.disclaimerBody":
      "Results are advisory, not a binding fatwa nor an official report. For special cases consult a certified scholar or your local fatwa body.",
    "lang.toggle": "العربية",
  },
} as const;

type Key = keyof typeof dict.ar;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "ar";
    setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: Key) => dict[lang][k] ?? k;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
