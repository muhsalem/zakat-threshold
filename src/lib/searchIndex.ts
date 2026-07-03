export type SearchEntry = {
  title: string;
  description?: string;
  to: string;
  keywords?: string;
};

export const searchIndex: SearchEntry[] = [
  { title: "الحاسبة الرئيسية", to: "/", keywords: "زكاة حساب رئيسي" },
  { title: "المستشار الذكي", to: "/advisor", keywords: "ai ذكاء اصطناعي فتوى" },
  { title: "السجل والتاريخ", to: "/history", keywords: "سجل تقارير سنوات" },
  { title: "نافذة الفرد / الشركة", to: "/client-intake", keywords: "استقبال بيانات عميل" },
  { title: "تدقيق النصاب", to: "/nisab-audit", keywords: "نصاب تدقيق" },
  { title: "زكاة الذهب", to: "/zakat-gold", keywords: "ذهب فضة معادن" },
  { title: "زكاة الشركات", to: "/zakat-company", keywords: "شركات ميزانية" },
  { title: "زكاة الزروع", to: "/crops", keywords: "زروع ثمار زراعة" },
  { title: "زكاة المؤسسات", to: "/enterprise", keywords: "مؤسسة" },
  { title: "زكاة المجموعات", to: "/group-zakat", keywords: "جماعية مجموعة" },
  { title: "التحقق من تقرير", to: "/verify", keywords: "التحقق تحقق تقرير" },
  { title: "الأسئلة الشائعة", to: "/faq", keywords: "faq مساعدة" },
  { title: "الأثر والإحصائيات", to: "/impact", keywords: "أثر إحصاء" },
  { title: "الحوكمة والامتثال", to: "/compliance", keywords: "حوكمة امتثال" },
  { title: "الشفافية والحوكمة البيئية (ESG)", to: "/esg", keywords: "esg بيئي" },
  { title: "معدل الحول والتذكيرات", to: "/analytics", keywords: "تحليلات" },
  { title: "خصوصية البيانات", to: "/legal/privacy", keywords: "خصوصية" },
  { title: "الشروط والأحكام", to: "/legal/terms", keywords: "شروط أحكام" },
  { title: "الأمان", to: "/security", keywords: "أمان" },
  { title: "الحالة", to: "/status", keywords: "حالة النظام" },
];

export function searchEntries(q: string): SearchEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return searchIndex.filter((e) =>
    [e.title, e.description ?? "", e.keywords ?? "", e.to]
      .join(" ")
      .toLowerCase()
      .includes(s)
  ).slice(0, 12);
}
