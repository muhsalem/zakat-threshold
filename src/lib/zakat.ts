// أدوات حساب الزكاة وفق الضوابط الشرعية

export const ZAKAT_RATE = 0.025; // 2.5% للمال وعروض التجارة
export const GOLD_NISAB_GRAMS = 85; // نصاب الذهب
export const SILVER_NISAB_GRAMS = 595; // نصاب الفضة
export const CROPS_NISAB_KG = 653; // نصاب الزروع والثمار (5 أوسق)

export const num = (v: string | number): number => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) && n > 0 ? n : 0;
};

export const fmt = (n: number, digits = 2): string =>
  new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(isFinite(n) ? n : 0);

export const currency = (n: number, c = "ج.م"): string => `${fmt(n)} ${c}`;

// نصاب الأنعام - الإبل
export const camelZakat = (count: number): string => {
  if (count < 5) return "لا زكاة";
  if (count <= 9) return "شاة واحدة";
  if (count <= 14) return "شاتان";
  if (count <= 19) return "ثلاث شياه";
  if (count <= 24) return "أربع شياه";
  if (count <= 35) return "بنت مخاض (أنثى إبل عمر سنة)";
  if (count <= 45) return "بنت لبون (أنثى إبل عمر سنتين)";
  if (count <= 60) return "حِقَّة (أنثى إبل عمر ثلاث سنوات)";
  if (count <= 75) return "جَذَعة (أنثى إبل عمر أربع سنوات)";
  if (count <= 90) return "بنتا لبون";
  if (count <= 120) return "حِقَّتان";
  // فوق 120: في كل 40 بنت لبون، وفي كل 50 حقة
  const hiqqah = Math.floor(count / 50);
  const bintLabun = Math.floor((count % 50) / 40);
  return `${hiqqah} حقة + ${bintLabun} بنت لبون (تقدير)`;
};

// زكاة البقر
export const cowZakat = (count: number): string => {
  if (count < 30) return "لا زكاة";
  const tabee = Math.floor(count / 30); // تبيع لكل 30
  const musinnah = Math.floor(count / 40); // مسنّة لكل 40
  if (count < 40) return `${tabee} تبيع (عجل عمر سنة)`;
  if (count < 60) return `${musinnah} مسنّة (بقرة عمر سنتين)`;
  return `حسب الجمع: ${tabee} تبيع و/أو ${musinnah} مسنّة`;
};

// زكاة الغنم
export const sheepZakat = (count: number): string => {
  if (count < 40) return "لا زكاة";
  if (count <= 120) return "شاة واحدة";
  if (count <= 200) return "شاتان";
  if (count <= 399) return "ثلاث شياه";
  // ثم في كل 100 شاة شاة
  return `${Math.floor(count / 100)} شياه`;
};

// التطور التاريخي للنصاب
export interface NisabHistoryItem {
  era: string;
  period: string;
  gold: string;
  silver: string;
  note: string;
}

export const NISAB_HISTORY: NisabHistoryItem[] = [
  {
    era: "العهد النبوي",
    period: "1هـ - 11هـ",
    gold: "20 ديناراً (~85 جم)",
    silver: "200 درهم (~595 جم)",
    note: "ثبت النصاب بنص السنة النبوية: «ليس فيما دون خمس أواقٍ صدقة»",
  },
  {
    era: "الخلافة الراشدة",
    period: "11هـ - 40هـ",
    gold: "20 ديناراً ذهبياً",
    silver: "200 درهم فضة",
    note: "ضرب الدينار الإسلامي في عهد عمر بن الخطاب رضي الله عنه بوزن 4.25 جم",
  },
  {
    era: "العصر الأموي",
    period: "41هـ - 132هـ",
    gold: "دينار عبد الملك (4.25 جم)",
    silver: "درهم (2.975 جم)",
    note: "توحيد المسكوكات في عهد عبد الملك بن مروان عام 77هـ",
  },
  {
    era: "العصر العباسي",
    period: "132هـ - 656هـ",
    gold: "20 ديناراً (~85 جم)",
    silver: "200 درهم (~595 جم)",
    note: "استقرار المعيار النقدي مع تطور أنظمة بيوت المال",
  },
  {
    era: "العصر العثماني",
    period: "699هـ - 1342هـ",
    gold: "الليرة الذهبية العثمانية",
    silver: "القرش الفضي",
    note: "ربط النصاب بالعملات المحلية مع الإبقاء على المعيار الشرعي بالوزن",
  },
  {
    era: "العصر الحديث",
    period: "1342هـ - الآن",
    gold: "85 جراماً ذهب عيار 21 (أو ما يعادله)",
    silver: "595 جراماً فضة خالصة",
    note: "اعتمدت المجامع الفقهية (المجمع الفقهي الإسلامي، دار الإفتاء) تقدير النصاب بالوزن مع تقويمه بالعملات المعاصرة، والعبرة بالأنفع للفقراء",
  },
];

// أسعار الذهب والفضة الحالية التقريبية للجرام حسب الدولة (للإرشاد فقط — قابلة للتعديل)
export interface CountryPrice {
  code: string;
  name: string;
  currency: string;
  gold24: number; // سعر جرام الذهب عيار 24
  silver: number; // سعر جرام الفضة
}

export const COUNTRY_PRICES: CountryPrice[] = [
  { code: "EG", name: "مصر", currency: "ج.م", gold24: 5400, silver: 65 },
  { code: "SA", name: "السعودية", currency: "ر.س", gold24: 415, silver: 5.1 },
  { code: "AE", name: "الإمارات", currency: "د.إ", gold24: 405, silver: 5.0 },
  { code: "KW", name: "الكويت", currency: "د.ك", gold24: 34, silver: 0.42 },
  { code: "QA", name: "قطر", currency: "ر.ق", gold24: 405, silver: 5.0 },
  { code: "BH", name: "البحرين", currency: "د.ب", gold24: 42, silver: 0.51 },
  { code: "OM", name: "عُمان", currency: "ر.ع", gold24: 43, silver: 0.52 },
  { code: "JO", name: "الأردن", currency: "د.أ", gold24: 78, silver: 0.95 },
  { code: "MA", name: "المغرب", currency: "د.م", gold24: 1100, silver: 13 },
  { code: "DZ", name: "الجزائر", currency: "د.ج", gold24: 14800, silver: 180 },
  { code: "TN", name: "تونس", currency: "د.ت", gold24: 345, silver: 4.2 },
  { code: "IQ", name: "العراق", currency: "د.ع", gold24: 145000, silver: 1750 },
  { code: "SY", name: "سوريا", currency: "ل.س", gold24: 1400000, silver: 17000 },
  { code: "LB", name: "لبنان", currency: "ل.ل", gold24: 9900000, silver: 120000 },
  { code: "YE", name: "اليمن", currency: "ر.ي", gold24: 27000, silver: 325 },
  { code: "SD", name: "السودان", currency: "ج.س", gold24: 66000, silver: 800 },
  { code: "LY", name: "ليبيا", currency: "د.ل", gold24: 535, silver: 6.5 },
  { code: "PS", name: "فلسطين", currency: "₪", gold24: 405, silver: 4.9 },
  { code: "TR", name: "تركيا", currency: "₺", gold24: 3850, silver: 47 },
  { code: "US", name: "الولايات المتحدة", currency: "$", gold24: 110, silver: 1.35 },
  { code: "EU", name: "الاتحاد الأوروبي", currency: "€", gold24: 102, silver: 1.25 },
  { code: "GB", name: "المملكة المتحدة", currency: "£", gold24: 87, silver: 1.07 },
];

// التطور التاريخي لسعر جرام الذهب عيار 24 والفضة بالدولار الأمريكي خلال آخر 100 عام
export interface YearlyNisabRow {
  hijri: number;
  gregorian: number;
  goldUsd: number;   // سعر جرام الذهب عيار 24 بالدولار
  silverUsd: number; // سعر جرام الفضة بالدولار
  event?: string;
}

// قيم تقريبية مبنية على متوسط أسعار السوق العالمية (للإرشاد التاريخي)
export const NISAB_LAST_100_YEARS: YearlyNisabRow[] = [
  { hijri: 1344, gregorian: 1925, goldUsd: 0.67, silverUsd: 0.022, event: "معيار الذهب الكلاسيكي" },
  { hijri: 1349, gregorian: 1930, goldUsd: 0.67, silverUsd: 0.012, event: "الكساد الكبير" },
  { hijri: 1354, gregorian: 1935, goldUsd: 1.13, silverUsd: 0.021, event: "رفع سعر الذهب لـ35$/أوقية" },
  { hijri: 1359, gregorian: 1940, goldUsd: 1.13, silverUsd: 0.011 },
  { hijri: 1364, gregorian: 1945, goldUsd: 1.13, silverUsd: 0.016, event: "نهاية الحرب العالمية الثانية" },
  { hijri: 1369, gregorian: 1950, goldUsd: 1.13, silverUsd: 0.024 },
  { hijri: 1374, gregorian: 1955, goldUsd: 1.13, silverUsd: 0.028 },
  { hijri: 1380, gregorian: 1960, goldUsd: 1.13, silverUsd: 0.029 },
  { hijri: 1385, gregorian: 1965, goldUsd: 1.13, silverUsd: 0.042 },
  { hijri: 1390, gregorian: 1970, goldUsd: 1.18, silverUsd: 0.057, event: "بداية تحرير سعر الذهب" },
  { hijri: 1395, gregorian: 1975, goldUsd: 5.18, silverUsd: 0.142, event: "انهيار بريتون وودز" },
  { hijri: 1400, gregorian: 1980, goldUsd: 19.81, silverUsd: 0.65, event: "ذروة الذهب التاريخية" },
  { hijri: 1405, gregorian: 1985, goldUsd: 10.29, silverUsd: 0.197 },
  { hijri: 1410, gregorian: 1990, goldUsd: 12.32, silverUsd: 0.155, event: "حرب الخليج" },
  { hijri: 1415, gregorian: 1995, goldUsd: 12.43, silverUsd: 0.168 },
  { hijri: 1420, gregorian: 2000, goldUsd: 8.97, silverUsd: 0.161 },
  { hijri: 1425, gregorian: 2005, goldUsd: 14.31, silverUsd: 0.235 },
  { hijri: 1430, gregorian: 2009, goldUsd: 31.25, silverUsd: 0.475, event: "الأزمة المالية العالمية" },
  { hijri: 1432, gregorian: 2011, goldUsd: 50.41, silverUsd: 1.13, event: "قفزة قياسية" },
  { hijri: 1435, gregorian: 2014, goldUsd: 40.51, silverUsd: 0.61 },
  { hijri: 1437, gregorian: 2016, goldUsd: 40.16, silverUsd: 0.55 },
  { hijri: 1440, gregorian: 2019, goldUsd: 45.01, silverUsd: 0.52 },
  { hijri: 1441, gregorian: 2020, goldUsd: 57.07, silverUsd: 0.66, event: "جائحة كوفيد-19" },
  { hijri: 1443, gregorian: 2022, goldUsd: 58.40, silverUsd: 0.71 },
  { hijri: 1445, gregorian: 2024, goldUsd: 75.20, silverUsd: 0.95 },
  { hijri: 1447, gregorian: 2026, goldUsd: 95.50, silverUsd: 1.30, event: "أعلى مستوى تاريخي" },
];
