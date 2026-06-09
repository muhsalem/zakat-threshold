// جداول تصنيف المحال التجارية العامة (مصر) مع ما يعادلها دوليًا
// المرجع: التصنيف المصري الموحد للأنشطة الاقتصادية (CAPMAS) المبني على ISIC Rev.4
// مع المقابلات الدولية: NACE Rev.2 (الاتحاد الأوروبي) — NAICS 2022 (USA/CAN/MEX)
// — UK SIC 2007 — التصنيف الخليجي (GCC-CPC/ISIC) — السعودية تستخدم ISIC Rev.4

export type TradeActivityGroup =
  | "wholesale"
  | "retail"
  | "food"
  | "services"
  | "industry"
  | "construction"
  | "transport"
  | "tech"
  | "tourism"
  | "agriculture";

export interface TradeActivityRow {
  /** كود التصنيف المصري الموحد (ISIC Rev.4) */
  egyCode: string;
  /** اسم النشاط بالعربية */
  nameAr: string;
  /** المجموعة العامة */
  group: TradeActivityGroup;
  /** ISIC Rev.4 الدولي (الأمم المتحدة — يعتمده الخليج والسعودية والأردن وأغلب الدول العربية) */
  isic: string;
  /** NACE Rev.2 (الاتحاد الأوروبي) */
  nace: string;
  /** NAICS 2022 (الولايات المتحدة وكندا والمكسيك) */
  naics: string;
  /** UK SIC 2007 (المملكة المتحدة) */
  ukSic: string;
  /** ملاحظات زكوية مختصرة */
  zakatNote?: string;
}

export const TRADE_GROUP_LABELS: Record<TradeActivityGroup, string> = {
  wholesale: "تجارة الجملة",
  retail: "تجارة التجزئة",
  food: "مطاعم ومأكولات ومشروبات",
  services: "خدمات شخصية وأعمال",
  industry: "تصنيع وإنتاج",
  construction: "بناء وتشييد",
  transport: "نقل وتخزين ولوجستيات",
  tech: "تقنية المعلومات والاتصالات",
  tourism: "سياحة وضيافة",
  agriculture: "زراعة وثروة حيوانية وسمكية",
};

/**
 * جدول مختصر للأنشطة التجارية الأكثر شيوعًا.
 * الأكواد مأخوذة من التصنيف المصري الموحد (مطابق لـ ISIC Rev.4 على مستوى الفئة).
 */
export const TRADE_ACTIVITIES: TradeActivityRow[] = [
  // تجارة الجملة
  { egyCode: "4630", nameAr: "تجارة الجملة للأغذية والمشروبات", group: "wholesale", isic: "4630", nace: "G46.3", naics: "4244", ukSic: "46.3", zakatNote: "عروض تجارة بسعر بيع الجملة يوم الوجوب" },
  { egyCode: "4641", nameAr: "تجارة الجملة للمنسوجات والملابس والأحذية", group: "wholesale", isic: "4641", nace: "G46.41", naics: "4243", ukSic: "46.41" },
  { egyCode: "4651", nameAr: "تجارة الجملة لأجهزة الحاسب والإلكترونيات", group: "wholesale", isic: "4651", nace: "G46.51", naics: "4234", ukSic: "46.51" },
  { egyCode: "4661", nameAr: "تجارة الجملة للوقود والمحروقات", group: "wholesale", isic: "4661", nace: "G46.71", naics: "4247", ukSic: "46.71" },

  // تجارة التجزئة
  { egyCode: "4711", nameAr: "تجارة التجزئة في متاجر السوبر ماركت والبقالة", group: "retail", isic: "4711", nace: "G47.11", naics: "4451", ukSic: "47.11" },
  { egyCode: "4721", nameAr: "تجارة التجزئة للفواكه والخضروات", group: "retail", isic: "4721", nace: "G47.21", naics: "44523", ukSic: "47.21" },
  { egyCode: "4751", nameAr: "تجارة التجزئة للمنسوجات والملابس", group: "retail", isic: "4751", nace: "G47.51", naics: "4581", ukSic: "47.51" },
  { egyCode: "4761", nameAr: "تجارة التجزئة للكتب والقرطاسية", group: "retail", isic: "4761", nace: "G47.61", naics: "459210", ukSic: "47.61" },
  { egyCode: "4773", nameAr: "صيدليات وتجارة التجزئة للمستحضرات الطبية", group: "retail", isic: "4772", nace: "G47.73", naics: "456110", ukSic: "47.73" },
  { egyCode: "4791", nameAr: "تجارة التجزئة عبر الإنترنت (متاجر إلكترونية)", group: "retail", isic: "4791", nace: "G47.91", naics: "4541", ukSic: "47.91", zakatNote: "يُحال إلى قسم المتجر الإلكتروني ضمن نفس البند" },

  // مطاعم ومشروبات
  { egyCode: "5610", nameAr: "مطاعم وخدمات تقديم الوجبات", group: "food", isic: "5610", nace: "I56.10", naics: "7225", ukSic: "56.10" },
  { egyCode: "5630", nameAr: "كافيهات ومحلات المشروبات", group: "food", isic: "5630", nace: "I56.30", naics: "7224", ukSic: "56.30" },

  // خدمات
  { egyCode: "9602", nameAr: "صالونات تجميل وحلاقة وعناية شخصية", group: "services", isic: "9602", nace: "S96.02", naics: "81211", ukSic: "96.02" },
  { egyCode: "9601", nameAr: "مغاسل وكي الملابس", group: "services", isic: "9601", nace: "S96.01", naics: "81231", ukSic: "96.01" },
  { egyCode: "6920", nameAr: "أنشطة المحاسبة ومسك الدفاتر والمراجعة", group: "services", isic: "6920", nace: "M69.20", naics: "5412", ukSic: "69.20", zakatNote: "خدمات مهنية — تُزكَّى الإيرادات المُدّخرة" },
  { egyCode: "6810", nameAr: "أنشطة الوكلاء العقاريين والوساطة", group: "services", isic: "6810", nace: "L68.10", naics: "5311", ukSic: "68.10" },

  // صناعة
  { egyCode: "1071", nameAr: "صناعة المخبوزات والمعجنات", group: "industry", isic: "1071", nace: "C10.71", naics: "31181", ukSic: "10.71" },
  { egyCode: "1410", nameAr: "صناعة الملابس الجاهزة", group: "industry", isic: "1410", nace: "C14.10", naics: "3152", ukSic: "14.10" },
  { egyCode: "1520", nameAr: "صناعة الأحذية", group: "industry", isic: "1520", nace: "C15.20", naics: "3162", ukSic: "15.20" },
  { egyCode: "3100", nameAr: "صناعة الأثاث", group: "industry", isic: "3100", nace: "C31", naics: "337", ukSic: "31" },

  // بناء وتشييد
  { egyCode: "4100", nameAr: "تشييد المباني السكنية وغير السكنية", group: "construction", isic: "4100", nace: "F41", naics: "236", ukSic: "41" },
  { egyCode: "4290", nameAr: "هندسة مدنية ومشاريع بنية تحتية", group: "construction", isic: "4290", nace: "F42", naics: "237", ukSic: "42" },

  // نقل ولوجستيات
  { egyCode: "4923", nameAr: "نقل البضائع بالطرق البرية", group: "transport", isic: "4923", nace: "H49.41", naics: "4841", ukSic: "49.41" },
  { egyCode: "5210", nameAr: "تخزين البضائع وأنشطة المستودعات", group: "transport", isic: "5210", nace: "H52.10", naics: "4931", ukSic: "52.10" },

  // تقنية
  { egyCode: "6201", nameAr: "برمجة الحاسب وتطوير البرمجيات", group: "tech", isic: "6201", nace: "J62.01", naics: "5415", ukSic: "62.01", zakatNote: "خدمات رقمية — راجع قسم المتجر الإلكتروني" },
  { egyCode: "6311", nameAr: "معالجة البيانات والاستضافة وأنشطة ذات صلة", group: "tech", isic: "6311", nace: "J63.11", naics: "518", ukSic: "63.11" },

  // سياحة وضيافة
  { egyCode: "5510", nameAr: "فنادق وأماكن إقامة قصيرة الأجل", group: "tourism", isic: "5510", nace: "I55.10", naics: "7211", ukSic: "55.10" },
  { egyCode: "7911", nameAr: "وكالات السفر وتنظيم الرحلات السياحية", group: "tourism", isic: "7911", nace: "N79.11", naics: "5615", ukSic: "79.11" },

  // زراعة وثروة
  { egyCode: "0111", nameAr: "زراعة المحاصيل الحقلية", group: "agriculture", isic: "0111", nace: "A01.11", naics: "1111", ukSic: "01.11", zakatNote: "إن كانت للتجارة — تُلحق بعروض التجارة لا العشر" },
  { egyCode: "0141", nameAr: "تربية الأبقار والجاموس", group: "agriculture", isic: "0141", nace: "A01.41", naics: "1121", ukSic: "01.41" },
  { egyCode: "0321", nameAr: "تربية الأحياء المائية (مزارع سمكية)", group: "agriculture", isic: "0322", nace: "A03.22", naics: "1125", ukSic: "03.22" },
];

/** المراجع الدولية للتصنيف (روابط رسمية) */
export const CLASSIFICATION_REFS: Array<{ name: string; country: string; url: string }> = [
  { name: "ISIC Rev.4 — الأمم المتحدة", country: "دولي / السعودية / الخليج / الأردن / أغلب الدول العربية", url: "https://unstats.un.org/unsd/classifications/Econ/isic" },
  { name: "التصنيف المصري الموحد للأنشطة الاقتصادية (CAPMAS)", country: "مصر", url: "https://www.capmas.gov.eg" },
  { name: "NACE Rev.2 (Eurostat)", country: "دول الاتحاد الأوروبي", url: "https://ec.europa.eu/eurostat/web/nace" },
  { name: "NAICS 2022", country: "الولايات المتحدة · كندا · المكسيك", url: "https://www.census.gov/naics/" },
  { name: "UK SIC 2007", country: "المملكة المتحدة", url: "https://www.gov.uk/government/publications/standard-industrial-classification-of-economic-activities-sic" },
  { name: "GCC Statistical Center", country: "مجلس التعاون الخليجي", url: "https://gccstat.org" },
];
