import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en" | "fr" | "ur" | "id";

/**
 * قرار نطاق صريح: العربية (المرجع) والإنجليزية مترجمتان بعمق حقيقي.
 * fr/ur/id تبقى بنفس التغطية الجزئية السابقة (partial) — إضافة مفاتيح
 * جديدة إليها بترجمة AI غير مراجَعة كان سيكون تخميناً غير مسؤول، خاصة
 * لمصطلحات شرعية. راجع TERMINOLOGY.md لتفاصيل قرار النطاق.
 */
const ar = {
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
  "a11y.skip": "تخطَّ إلى المحتوى الرئيسي",
  // التنقل — الشريط الجانبي
  "nav.home": "الرئيسية",
  "nav.dashboard": "لوحتي",
  "nav.advisor": "المستشار الذكي",
  "nav.history": "السجل",
  "nav.notifications": "الإشعارات",
  "nav.subscription": "اشتراكي",
  "nav.settings": "الإعدادات",
  "calc.fitr": "زكاة الفطر",
  "calc.company": "زكاة الشركات",
  "calc.enterprise": "زكاة المؤسسات",
  "calc.distribution": "خطة توزيع الزكاة",
  "pro.intake": "الحاسبة الشاملة",
  "pro.bulkClients": "معالجة عملاء دفعة",
  "pro.reviews": "مركز المراجعات",
  "pro.shariaReview": "المراجعة الشرعية",
  "pro.reportsHistory": "سجل تقارير PDF",
  "pro.pdfTemplates": "قوالب تقارير PDF",
  "pro.coaMapping": "ربط دليل الحسابات",
  "pro.nisabAudit": "الأنصبة",
  "pro.pricesHistory": "سجل الأسعار",
  "pro.pricesAudit": "تدقيق سحب الأسعار",
  "group.nav": "التنقّل",
  "group.calcsAll": "كل الحاسبات",
  "group.calcsCompany": "حاسبات الشركات",
  "group.calcsInstitution": "حاسبات المؤسسات",
  "group.calcsIndividual": "حاسبات الأفراد",
  "group.proTools": "أدوات المحاسب",
  "group.proRecords": "سجلات ومحفوظات",
  "group.proReferences": "الأنصبة والأسعار",
  "search.placeholder": "ابحث في المنصة…",
  "search.aria": "بحث",
  "search.noResults": "لا نتائج مطابقة",
  "auth.login": "دخول / تسجيل",
  "auth.logout": "تسجيل الخروج",
  "auth.logoutShort": "خروج",
  "topbar.preferences": "التفضيلات",
  "topbar.preferencesAria": "خيارات وتفضيلات",
} as const;

export type Key = keyof typeof ar;

const en: Record<Key, string> = {
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
  "a11y.skip": "Skip to main content",
  "nav.home": "Home",
  "nav.dashboard": "My Dashboard",
  "nav.advisor": "Smart Advisor",
  "nav.history": "History",
  "nav.notifications": "Notifications",
  "nav.subscription": "My Subscription",
  "nav.settings": "Settings",
  "calc.fitr": "Zakat al-Fitr",
  "calc.company": "Corporate Zakat",
  "calc.enterprise": "Institutional Zakat",
  "calc.distribution": "Zakat Distribution Plan",
  "pro.intake": "Comprehensive Calculator",
  "pro.bulkClients": "Bulk Client Processing",
  "pro.reviews": "Review Center",
  "pro.shariaReview": "Sharia Review",
  "pro.reportsHistory": "PDF Report History",
  "pro.pdfTemplates": "PDF Report Templates",
  "pro.coaMapping": "Chart of Accounts Mapping",
  "pro.nisabAudit": "Nisab Thresholds",
  "pro.pricesHistory": "Price History",
  "pro.pricesAudit": "Price Fetch Audit",
  "group.nav": "Navigation",
  "group.calcsAll": "All Calculators",
  "group.calcsCompany": "Company Calculators",
  "group.calcsInstitution": "Institution Calculators",
  "group.calcsIndividual": "Individual Calculators",
  "group.proTools": "Accountant Tools",
  "group.proRecords": "Records & Archives",
  "group.proReferences": "Nisab & Prices",
  "search.placeholder": "Search the platform…",
  "search.aria": "Search",
  "search.noResults": "No matching results",
  "auth.login": "Log in / Sign up",
  "auth.logout": "Log out",
  "auth.logoutShort": "Log out",
  "topbar.preferences": "Preferences",
  "topbar.preferencesAria": "Options and preferences",
};

// fr/ur/id: تغطية جزئية سابقة، غير موسَّعة بهذا التحديث (راجع التعليق أعلاه).
const fr: Partial<Record<Key, string>> = {
  "app.title": "Calculateur de Zakat",
  "app.subtitle": "Modèle complet pour toutes les catégories selon les standards charia",
  "disclaimer.title": "Avertissement charia :",
  "disclaimer.body":
    "Cet outil est indicatif, fondé sur l'AAOIFI, les académies de fiqh et Bayt al-Zakat. Pour des cas particuliers consultez un savant agréé.",
  "hero.title": "Calculez votre Zakat avec précision",
  "hero.body":
    "Toutes les catégories : liquidités, titres, commerce, numérique, immobilier, récoltes, bétail et rikaz.",
  "tabs.individual": "Particuliers",
  "tabs.company": "Entreprises",
  "tabs.fitr": "Zakat al-Fitr",
  "tabs.history": "Nissab",
  "tabs.advanced": "Avancé",
  "footer.brand": "Calculateur de Zakat complet",
  "footer.about": "Outil indicatif fiqh-comptable aligné sur AAOIFI 35.",
  "footer.legal": "Mentions",
  "footer.privacy": "Confidentialité",
  "footer.terms": "Conditions",
  "footer.disclaimer": "Avertissement",
  "footer.disclaimerBody": "Résultats indicatifs, ne constituent pas une fatwa.",
  "lang.toggle": "اردو",
  "a11y.skip": "Aller au contenu principal",
};

const ur: Partial<Record<Key, string>> = {
  "app.title": "زکوٰۃ کیلکولیٹر",
  "app.subtitle": "تمام اقسام کے لیے جامع ماڈل شرعی معیارات کے مطابق",
  "disclaimer.title": "شرعی اعلانِ دستبرداری:",
  "disclaimer.body":
    "یہ کیلکولیٹر رہنمائی کے لیے ہے، AAOIFI، فقہی اکیڈمیز اور بیت الزکوٰۃ کویت کے معیارات پر مبنی۔",
  "hero.title": "اپنی زکوٰۃ کا درست شرعی حساب لگائیں",
  "hero.body": "تمام اقسام: نقدی، سیکیورٹیز، تجارت، ڈیجیٹل، رئیل اسٹیٹ، فصلیں، مویشی اور رکاز۔",
  "tabs.individual": "افراد",
  "tabs.company": "کمپنیاں",
  "tabs.fitr": "زکوٰۃ الفطر",
  "tabs.history": "نصاب",
  "tabs.advanced": "ایڈوانس",
  "footer.brand": "جامع زکوٰۃ کیلکولیٹر",
  "footer.about": "AAOIFI 35 کے مطابق رہنمائی کا فقہی-محاسباتی ٹول۔",
  "footer.legal": "قانونی",
  "footer.privacy": "رازداری کی پالیسی",
  "footer.terms": "شرائط",
  "footer.disclaimer": "دستبرداری",
  "footer.disclaimerBody": "نتائج رہنمائی کے لیے ہیں، کوئی پابند فتویٰ نہیں۔",
  "lang.toggle": "Bahasa",
  "a11y.skip": "مرکزی مواد پر جائیں",
};

const id: Partial<Record<Key, string>> = {
  "app.title": "Kalkulator Zakat",
  "app.subtitle": "Model komprehensif untuk semua jenis zakat sesuai standar syariah",
  "disclaimer.title": "Penafian syariah:",
  "disclaimer.body":
    "Kalkulator ini bersifat panduan, berdasarkan AAOIFI, akademi fiqh, dan Bayt al-Zakat Kuwait.",
  "hero.title": "Hitung zakat Anda secara akurat sesuai syariah",
  "hero.body":
    "Semua kategori: tunai, surat berharga, perdagangan, digital, properti, tanaman, ternak, dan rikaz.",
  "tabs.individual": "Individu",
  "tabs.company": "Perusahaan",
  "tabs.fitr": "Zakat Fitrah",
  "tabs.history": "Nisab",
  "tabs.advanced": "Lanjutan",
  "footer.brand": "Kalkulator Zakat Komprehensif",
  "footer.about": "Alat panduan fiqh-akuntansi selaras dengan AAOIFI 35.",
  "footer.legal": "Legal",
  "footer.privacy": "Kebijakan Privasi",
  "footer.terms": "Syarat",
  "footer.disclaimer": "Penafian",
  "footer.disclaimerBody": "Hasil bersifat panduan, bukan fatwa mengikat.",
  "lang.toggle": "العربية",
  "a11y.skip": "Lewati ke konten utama",
};

const dict: Record<Lang, Partial<Record<Key, string>>> = { ar, en, fr, ur, id };

/** اللغات المُفعَّلة فعلياً بالواجهة (زر التبديل) — fr/ur/id بنية جاهزة لكن غير مكتملة بعد. */
const ENABLED_LANGS: Lang[] = ["ar", "en"];
const RTL: Lang[] = ["ar", "ur"];

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  cycleLang: () => void;
  t: (k: Key) => string;
}>({
  lang: "ar",
  setLang: () => {},
  cycleLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "ar";
    if (ENABLED_LANGS.includes(saved)) setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const cycleLang = () => {
    const i = ENABLED_LANGS.indexOf(lang);
    setLang(ENABLED_LANGS[(i + 1) % ENABLED_LANGS.length]);
  };

  const t = (k: Key) => dict[lang][k] ?? ar[k] ?? k;

  return <Ctx.Provider value={{ lang, setLang, cycleLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
