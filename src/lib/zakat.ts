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
