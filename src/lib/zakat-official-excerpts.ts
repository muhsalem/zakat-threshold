import type { ZakatSource } from "./zakat-questions";

/** Verified source passages, not live price announcements. Retrieved 2026-10-24. */
export const ZAKAT_OFFICIAL_EXCERPTS: ZakatSource[] = [
  {
    id: "dar-ifta-11653",
    kind: "official",
    title: "دار الإفتاء المصرية · مقدار نصاب زكاة المال · 19 أغسطس 2007",
    url: "https://www.dar-alifta.org/ar/Fatwa/Details/11653/%D9%85%D9%82%D8%AF%D8%A7%D8%B1-%D9%86%D8%B5%D8%A7%D8%A8-%D8%B2%D9%83%D8%A7%D8%A9-%D8%A7%D9%84%D9%85%D8%A7%D9%84",
    text: "نصاب زكاة المال خمسة وثمانون جرامًا من الذهب من عيار واحد وعشرين. وتخرج الزكاة عما قيمته ذلك أو أكثر إذا مرَّ على المال حولٌ قَمَرِيٌّ بواقع ربع العُشر؛ أي اثنين ونصف بالمائة. هذه فتوى دار الإفتاء المصرية المؤرخة 19 أغسطس 2007 وليست إعلانًا بسعر النصاب اليوم، ولا تعميمًا على جميع الدول أو المذاهب.",
  },
  {
    id: "dar-ifta-11535",
    kind: "official",
    title: "دار الإفتاء المصرية · زكاة المال وقيمتها · 5 مارس 2005",
    url: "https://www.dar-alifta.org/ar/fatwa/details/11535/%D8%B2%D9%83%D8%A7%D8%A9-%D8%A7%D9%84%D9%85%D8%A7%D9%84-%D9%88%D9%82%D9%8A%D9%85%D8%AA%D9%87%D8%A7",
    text: "زكاةُ المالِ تكون على رأس المال والربح إذا بلغ المالُ النصابَ وحال عليه الحَوْل، وقيمة الزكاة ربع العشر أي 2.5 بالمائة. تاريخ الفتوى 5 مارس 2005، دار الإفتاء المصرية.",
  },
];