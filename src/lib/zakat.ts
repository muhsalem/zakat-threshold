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

// نصاب الإبل ومقدار الزكاة فيها (المرجع: فقه الزكاة + ملحق نصاب الأنعام)
export const camelZakat = (count: number): string => {
  if (count < 5) return "لا زكاة";
  if (count <= 9) return "شاة واحدة";
  if (count <= 14) return "شاتان";
  if (count <= 19) return "ثلاث شياه";
  if (count <= 24) return "أربع شياه";
  if (count <= 35) return "بنت مخاض (أنثى إبل أتمت سنة)";
  if (count <= 45) return "بنت لبون (أتمت سنتين)";
  if (count <= 60) return "حِقَّة (أتمت ثلاث سنين)";
  if (count <= 75) return "جَذَعة (أتمت أربع سنين)";
  if (count <= 90) return "بنتا لبون";
  if (count <= 120) return "حِقَّتان";
  if (count <= 129) return "ثلاث بنات لبون";
  if (count <= 139) return "حِقَّة + بنتا لبون";
  if (count <= 149) return "حِقَّتان + بنت لبون";
  if (count <= 159) return "ثلاث حِقاق";
  if (count <= 169) return "أربع بنات لبون";
  if (count <= 179) return "ثلاث بنات لبون + حِقَّة";
  if (count <= 189) return "بنتا لبون + حِقَّتان";
  if (count <= 199) return "ثلاث حِقاق + بنت لبون";
  if (count <= 209) return "أربع حِقاق أو خمس بنات لبون";
  // ثم في كل 50 حقة وفي كل 40 بنت لبون
  const hiqqah = Math.floor(count / 50);
  const bintLabun = Math.floor((count % 50) / 40);
  return `${hiqqah} حِقَّة + ${bintLabun} بنت لبون`;
};

// زكاة البقر (يُضم إليها الجاموس)
export const cowZakat = (count: number): string => {
  if (count < 30) return "لا زكاة";
  if (count <= 39) return "تبيع (عمر سنة)";
  if (count <= 59) return "مسنّة (أتمت سنتين)";
  if (count <= 69) return "تبيعان";
  if (count <= 79) return "مسنّة + تبيع";
  if (count <= 89) return "مسنّتان";
  if (count <= 99) return "ثلاثة أتبعة";
  if (count <= 109) return "مسنّة + تبيعان";
  if (count <= 119) return "مسنّتان + تبيع";
  if (count <= 129) return "ثلاث مسنّات أو أربعة أتبعة";
  const tabee = Math.floor(count / 30);
  const musinnah = Math.floor(count / 40);
  return `في كل 30: تبيع (≈${tabee}) أو في كل 40: مسنّة (≈${musinnah})`;
};

// زكاة الغنم
export const sheepZakat = (count: number): string => {
  if (count < 40) return "لا زكاة";
  if (count <= 120) return "شاة واحدة";
  if (count <= 200) return "شاتان";
  if (count <= 399) return "ثلاث شياه";
  if (count <= 499) return "أربع شياه";
  if (count <= 599) return "خمس شياه";
  return `${Math.floor(count / 100)} شياه`;
};

// تحويل الذهب من أي عيار إلى ما يعادله من عيار 24
export const karatToPure24 = (grams: number, karat: number): number => {
  if (!grams || !karat) return 0;
  return (grams * karat) / 24;
};

// معدلات زكاة الزروع والثمار
export const CROPS_RATE_NATURAL = 0.1; // الري بدون كلفة (الأنهار/الأمطار)
export const CROPS_RATE_IRRIGATED = 0.05; // الري بكلفة
export const CROPS_RATE_MIXED = 0.075; // ري مشترك

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
  goldUsd: number; // سعر جرام الذهب عيار 24 بالدولار
  silverUsd: number; // سعر جرام الفضة بالدولار
  event?: string;
}

// قيم تقريبية مبنية على متوسط أسعار السوق العالمية (للإرشاد التاريخي)
export const NISAB_LAST_100_YEARS: YearlyNisabRow[] = [
  { hijri: 1344, gregorian: 1925, goldUsd: 0.67, silverUsd: 0.022, event: "معيار الذهب الكلاسيكي" },
  { hijri: 1349, gregorian: 1930, goldUsd: 0.67, silverUsd: 0.012, event: "الكساد الكبير" },
  {
    hijri: 1354,
    gregorian: 1935,
    goldUsd: 1.13,
    silverUsd: 0.021,
    event: "رفع سعر الذهب لـ35$/أوقية",
  },
  { hijri: 1359, gregorian: 1940, goldUsd: 1.13, silverUsd: 0.011 },
  {
    hijri: 1364,
    gregorian: 1945,
    goldUsd: 1.13,
    silverUsd: 0.016,
    event: "نهاية الحرب العالمية الثانية",
  },
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
  {
    hijri: 1430,
    gregorian: 2009,
    goldUsd: 31.25,
    silverUsd: 0.475,
    event: "الأزمة المالية العالمية",
  },
  { hijri: 1432, gregorian: 2011, goldUsd: 50.41, silverUsd: 1.13, event: "قفزة قياسية" },
  { hijri: 1435, gregorian: 2014, goldUsd: 40.51, silverUsd: 0.61 },
  { hijri: 1437, gregorian: 2016, goldUsd: 40.16, silverUsd: 0.55 },
  { hijri: 1440, gregorian: 2019, goldUsd: 45.01, silverUsd: 0.52 },
  { hijri: 1441, gregorian: 2020, goldUsd: 57.07, silverUsd: 0.66, event: "جائحة كوفيد-19" },
  { hijri: 1443, gregorian: 2022, goldUsd: 58.4, silverUsd: 0.71 },
  { hijri: 1445, gregorian: 2024, goldUsd: 75.2, silverUsd: 0.95 },
  { hijri: 1447, gregorian: 2026, goldUsd: 95.5, silverUsd: 1.3, event: "أعلى مستوى تاريخي" },
];

// ============ شرط الحول والتقويم الهجري ============
export const HAWL_DAYS_HIJRI = 354; // السنة الهجرية القمرية
export const ZAKAT_RATE_GREGORIAN = 0.02577; // معدل معدّل عند استخدام التاريخ الميلادي (الندوة السابعة للزكاة)

// تحويل ميلادي إلى هجري (الخوارزمية الكويتية المعتمدة)
export interface HijriDate {
  hy: number;
  hm: number;
  hd: number;
}
export function gregorianToHijri(gy: number, gm: number, gd: number): HijriDate {
  const jd =
    Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
    Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
    gd -
    32075;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hm = Math.floor((24 * l3) / 709);
  const hd = l3 - Math.floor((709 * hm) / 24);
  const hy = 30 * n + j - 30;
  return { hy, hm, hd };
}

const HIJRI_MONTHS = [
  "محرّم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];
export function formatHijri(h: HijriDate): string {
  return `${h.hd} ${HIJRI_MONTHS[h.hm - 1] ?? ""} ${h.hy}هـ`;
}

export interface HawlStatus {
  hijriStart: HijriDate;
  daysPassed: number;
  hawlComplete: boolean;
  daysRemaining: number;
}
// فرق الأيام التقويمية بعد التطبيع على منتصف الليل UTC — يمنع انحراف يوم عند عبور التوقيت الصيفي
const diffCalendarDays = (from: Date, to: Date): number =>
  Math.floor(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86400000,
  );

export function checkHawl(startDateISO: string, today = new Date()): HawlStatus | null {
  if (!startDateISO) return null;
  const start = new Date(startDateISO);
  if (isNaN(start.getTime())) return null;
  const hijriStart = gregorianToHijri(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const daysPassed = diffCalendarDays(start, today);
  const hawlComplete = daysPassed >= HAWL_DAYS_HIJRI;
  return {
    hijriStart,
    daysPassed,
    hawlComplete,
    daysRemaining: Math.max(0, HAWL_DAYS_HIJRI - daysPassed),
  };
}

// ============ جدول الحول التنازلي/التصاعدي متعدد السنوات ============
export interface HawlCycle {
  index: number; // 0 = الحول الحالي، سالب = ماضٍ، موجب = مستقبل
  startISO: string;
  endISO: string;
  hijriStart: HijriDate;
  hijriEnd: HijriDate;
  status: "past" | "current" | "future";
  daysPassed: number;
  daysRemaining: number;
  progressPct: number;
  label: string;
}

/**
 * يولّد جدول دورات الحول (تنازلي للماضي وتصاعدي للمستقبل) انطلاقاً من
 * تاريخ بلوغ النصاب. طول الدورة = 354 يوماً هجرياً أو 365 يوماً ميلادياً.
 */
export function generateHawlSchedule(
  startDateISO: string,
  opts: { pastCycles?: number; futureCycles?: number; basis?: "hijri" | "gregorian"; today?: Date } = {},
): HawlCycle[] {
  if (!startDateISO) return [];
  const start = new Date(startDateISO);
  if (isNaN(start.getTime())) return [];
  const past = Math.max(0, opts.pastCycles ?? 2);
  const future = Math.max(0, opts.futureCycles ?? 2);
  const cycleDays = opts.basis === "gregorian" ? 365 : HAWL_DAYS_HIJRI;
  const today = opts.today ?? new Date();
  const startMs = start.getTime();

  // تحديد فهرس الدورة الحالية بالنسبة لتاريخ البداية
  const elapsedDays = diffCalendarDays(start, today);
  const currentIndex = Math.floor(elapsedDays / cycleDays);

  const cycles: HawlCycle[] = [];
  for (let i = currentIndex - past; i <= currentIndex + future; i++) {
    const cStart = new Date(startMs + i * cycleDays * 86400000);
    const cEnd = new Date(startMs + (i + 1) * cycleDays * 86400000 - 86400000);
    const hijriStart = gregorianToHijri(cStart.getFullYear(), cStart.getMonth() + 1, cStart.getDate());
    const hijriEnd = gregorianToHijri(cEnd.getFullYear(), cEnd.getMonth() + 1, cEnd.getDate());
    const inCycleDays = diffCalendarDays(cStart, today);
    const status: HawlCycle["status"] =
      i < currentIndex ? "past" : i > currentIndex ? "future" : "current";
    const daysPassed = status === "past" ? cycleDays : status === "future" ? 0 : Math.max(0, Math.min(cycleDays, inCycleDays));
    const daysRemaining = Math.max(0, cycleDays - daysPassed);
    const progressPct = Math.round((daysPassed / cycleDays) * 100);
    const label =
      i === 0
        ? "الحول الأساس (بلوغ النصاب)"
        : i > 0
          ? `الحول +${i}`
          : `الحول ${i}`;
    cycles.push({
      index: i,
      startISO: cStart.toISOString().slice(0, 10),
      endISO: cEnd.toISOString().slice(0, 10),
      hijriStart,
      hijriEnd,
      status,
      daysPassed,
      daysRemaining,
      progressPct,
      label,
    });
  }
  return cycles;
}

// ============ مصارف الزكاة الثمانية (التوبة: 60) ============
export interface ZakatRecipient {
  name: string;
  description: string;
}
export const ZAKAT_RECIPIENTS: ZakatRecipient[] = [
  { name: "الفقراء", description: "من لا يجد ما يكفيه أو يجد أقلّ من نصف كفايته" },
  { name: "المساكين", description: "من يجد أكثر من نصف كفايته ولا تكفيه" },
  { name: "العاملون عليها", description: "السعاة والجباة والموظفون على شؤون الزكاة" },
  { name: "المؤلفة قلوبهم", description: "حديثو الإسلام أو من يُرجى إسلامهم تأليفًا لقلوبهم" },
  { name: "في الرقاب", description: "تحرير الأرقّاء، ويُلحق بهم فكّ الأسرى ومعونة المكاتبين" },
  { name: "الغارمون", description: "المدينون العاجزون عن سداد ديونهم في غير معصية" },
  {
    name: "في سبيل الله",
    description: "الجهاد في سبيل الله، وعند بعض العلماء: كل وجوه الخير العامة",
  },
  { name: "ابن السبيل", description: "المسافر المنقطع عن ماله ولو كان غنيًا في بلده" },
];
