import { useEffect, useState } from "react";
import {
  currency as fmtCurrency,
  camelZakat,
  cowZakat,
  sheepZakat,
  ZAKAT_RECIPIENTS,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  HAWL_DAYS_HIJRI,
} from "@/lib/zakat";
import logoUrl from "@/assets/zakat-logo.png";

/**
 * تقرير زكوي احترافي (A4) — ثلاث صفحات:
 *   ص1: غلاف الهوية — لوجو كبير، عنوان، إصدار، QR، تحذير قانوني بارز
 *   ص2: البيانات + الأنصبة + الوعاء + المقارنة + المنهجية + الديون + الرأي + التوقيع الرقمي
 *   ص3: مصارف الزكاة الثمانية
 *
 * منصة: نِصاب — الحاسبة الشرعية المعتمدة للزكاة
 */

const PLATFORM_NAME_AR = "نِصاب";
const PLATFORM_TAGLINE = "الحاسبة الشرعية المعتمدة للزكاة";

export interface PrintReportRow {
  label: string;
  gross: number;
  nisab?: number;
  eligible: boolean;
  zakat: number;
}

export interface PrintReportData {
  name: string;
  profession: string;
  countryCode: string;
  currencyName: string;
  calendarBasis: "hijri" | "gregorian";
  effectiveRate: number;
  rows: PrintReportRow[];
  livestock: {
    camels: number;
    cows: number;
    sheep: number;
    show: boolean;
    mode?: "grazing" | "trade";
    tradeValue?: number;
  };
  monetaryGross: number;
  debts: number;
  monetaryBase: number;
  moneyNisab: number;
  totalZakat: number;
  hawlComplete: boolean | null;
  hawlDate?: string;
  goldPricePerGram?: number;
  silverPricePerGram?: number;
  accountantName: string;
  accountantLicense: string;
  accountantPreamble: string;
  accountantOpinion: string;
  opinionType: "clean" | "qualified" | "adverse";
  previousYearZakat: string;
  /** اختياري — لاعتماد قاعدة النصاب: ذهب / فضة / الأنفع للفقراء (الافتراضي) */
  nisabBasis?: "gold" | "silver" | "beneficial";
  /** اختياري — أساس تقييم الأصول */
  valuationBasis?: "market" | "book";
  /** اختياري — تاريخ التقييم (نص حر) */
  valuationDate?: string;
  /** اختياري — تفصيل الديون المخصومة */
  debtsBreakdown?: { current: number; longTerm: number; installmentsDueInHawl: number };
  /** اختياري — الافتراضات والإفصاحات الإضافية */
  assumptions?: string;
  /** اختياري — Data URL لرمز QR متوافق مع ZATCA (TLV) */
  zatcaQrDataUrl?: string;
  /** اختياري — سجلات المراجعة والتدقيق الشرعي (تُدمَج كملحق في نهاية التقرير) */
  auditEntries?: Array<{
    id: string;
    action: string;
    fingerprint: string | null;
    sharia_refs: string[] | null;
    created_at: string;
  }>;
  /** اختياري — زكاة خيارات/منح أسهم الموظفين (ESOP/RSU) */
  esop?: {
    show: boolean;
    vestedShares: number;
    price: number;
    strike: number;
    intrinsic: number;
    rsuValue: number;
    base: number;
    intentTrade: boolean;
    zakat: number;
  };
  /** اختياري — زكاة الأوقاف والمؤسسات الوقفية */
  waqf?: {
    show: boolean;
    tradeAssets: number;
    rentIncome: number;
    exemptCore: number;
    base: number;
    zakat: number;
  };
  /**
   * اختياري — بيان تفصيلي لكل خصم/استبعاد مع المبرّر الشرعي.
   * يظهر في PDF و Excel لإثبات سبب الاحتساب أو الاستبعاد.
   */
  deductions?: Array<{
    label: string;
    amount: number;
    included: boolean;
    reason: string;
    ref?: string;
  }>;
  /** اختياري — أسعار صرف العملات المستخدمة قبل التصدير. */
  fx?: {
    reportCurrency: string;
    rates: Array<{ from: string; to: string; rate: number }>;
    entries: Array<{
      label: string;
      originalAmount: number;
      originalCurrency: string;
      rate: number;
      convertedAmount: number;
    }>;
    source?: string;
  };
  /** اختياري — رقم تقرير ثابت يُولَّد قبل بناء المستند ليُستخدم في QR. */
  reportId?: string;
  /** اختياري — Data URL لرمز QR للتحقق (يربط برقم التقرير/الملخّص). */
  verificationQrDataUrl?: string;
  /** اختياري — مجموع زكاة الركاز والمعادن (لعرضها في صف ملخص كزكاة الزروع). */
  rikazTotal?: number;
}

const COUNTRY_FULL: Record<string, string> = {
  EG: "جمهورية مصر العربية",
  SA: "المملكة العربية السعودية",
  AE: "الإمارات العربية المتحدة",
  KW: "دولة الكويت",
  QA: "دولة قطر",
  BH: "مملكة البحرين",
  OM: "سلطنة عُمان",
  JO: "المملكة الأردنية الهاشمية",
  MA: "المملكة المغربية",
  DZ: "الجمهورية الجزائرية",
  TN: "الجمهورية التونسية",
  IQ: "جمهورية العراق",
  SY: "الجمهورية العربية السورية",
  LB: "الجمهورية اللبنانية",
  YE: "الجمهورية اليمنية",
  SD: "جمهورية السودان",
  LY: "دولة ليبيا",
  PS: "دولة فلسطين",
  TR: "الجمهورية التركية",
  US: "الولايات المتحدة الأمريكية",
  EU: "الاتحاد الأوروبي",
  GB: "المملكة المتحدة",
};
const CURRENCY_FULL: Record<string, string> = {
  EG: "جنيه مصري",
  SA: "ريال سعودي",
  AE: "درهم إماراتي",
  KW: "دينار كويتي",
  QA: "ريال قطري",
  BH: "دينار بحريني",
  OM: "ريال عُماني",
  JO: "دينار أردني",
  MA: "درهم مغربي",
  DZ: "دينار جزائري",
  TN: "دينار تونسي",
  IQ: "دينار عراقي",
  SY: "ليرة سورية",
  LB: "ليرة لبنانية",
  YE: "ريال يمني",
  SD: "جنيه سوداني",
  LY: "دينار ليبي",
  PS: "شيكل إسرائيلي جديد",
  TR: "ليرة تركية",
  US: "دولار أمريكي",
  EU: "يورو",
  GB: "جنيه إسترليني",
};

/** صياغة محايدة شرعياً — لا تستخدم لغة تدقيق محاسبية ملزمة */
const OPINION_LABELS: Record<PrintReportData["opinionType"], string> = {
  clean:
    "بحسب البيانات المُدخَلة، يظهر أن الوعاء الزكوي قد استوفى شروط الوجوب الشرعية، والنتائج المعروضة تعكس ما أُفصح عنه من أرصدة والتزامات.",
  qualified:
    "بحسب البيانات المُدخَلة، توجد بنود تحتاج إلى مراجعة فقهية أو محاسبية تخصصية قبل اعتماد النتيجة نهائياً.",
  adverse:
    "بحسب البيانات المُدخَلة، يظهر أن الوعاء الزكوي أقل من النصاب الشرعي، وعليه لا تجب الزكاة في هذا الحول، ويُستحبّ التصدّق بما تيسّر.",
};

const NISAB_BASIS_LABELS: Record<
  NonNullable<PrintReportData["nisabBasis"]>,
  { name: string; fiqh: string }
> = {
  gold: {
    name: "نصاب الذهب (٨٥ جم)",
    fiqh: "مذهب جمهور الفقهاء قديماً ومذهب الحنفية في النقد الورقي اليوم؛ يعتمد قيمة ٨٥ جراماً من الذهب الخالص حداً أدنى للوجوب، وهو الأشدّ وأبرأ للذمّة عند بعض المعاصرين.",
  },
  silver: {
    name: "نصاب الفضة (٥٩٥ جم)",
    fiqh: "مذهب الحنابلة والشافعية والمالكية في الأصل؛ يعتمد قيمة ٥٩٥ جراماً من الفضة، وهو في العادة أدنى من نصاب الذهب فيكون أيسر في وجوب الزكاة.",
  },
  beneficial: {
    name: "الأنفع للفقراء (الأدنى بين النصابين)",
    fiqh: "ترجيح مَجمَع الفقه الإسلامي وكثير من الهيئات الشرعية المعاصرة — يُؤخذ بالنصاب الأدنى (غالباً الفضة) تحقيقاً لمصلحة الفقراء وتعميماً للنفع وبراءةً للذمّة.",
  },
};

function generateReportId(name: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const seed = (name || "ZK").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZK";
  return `NS-${seed}-${ts}-${rand}`;
}

async function computeHash(payload: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const buf = new TextEncoder().encode(payload);
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)
        .toUpperCase();
    }
  } catch {
    /* ignore */
  }
  // fallback بسيط
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).toUpperCase().padStart(16, "0");
}

const ORDER_PRIORITY = [
  "زكاة الذهب",
  "زكاة الفضة",
  "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية",
  "النقدية والبنوك",
  "زكاة الأوراق المالية ووثائق التأمين",
  "الأوراق المالية والاستثمارات",
  "زكاة الأوراق التجارية",
  "كمبيالات وأوراق قبض",
  "زكاة الدخل وعروض التجارة والمستغلات",
  "عروض التجارة والديون المرجوّة",
  "العقار والمستغلات (صافي)",
  "زكاة الزروع والثمار",
];
function rowOrder(label: string) {
  const i = ORDER_PRIORITY.findIndex((p) => label.includes(p) || p.includes(label));
  return i === -1 ? 999 : i;
}

function fmtHijri(d: Date): string {
  try {
    return (
      new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d) + " هـ"
    );
  } catch {
    return "";
  }
}
function fmtGregorian(d: Date): string {
  try {
    return (
      new Intl.DateTimeFormat("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d) + " م"
    );
  } catch {
    return d.toDateString();
  }
}
function fmtTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

export function PrintReport({ data }: { data: PrintReportData }) {
  const currencyLong = CURRENCY_FULL[data.countryCode] ?? data.currencyName;
  const countryLong = COUNTRY_FULL[data.countryCode] ?? data.countryCode;
  const curFull = (n: number) => fmtCurrency(n, currencyLong);

  const [reportId, setReportId] = useState<string>("NS-PENDING");
  const [issueDate, setIssueDate] = useState<Date | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string>("");
  const [docHash, setDocHash] = useState<string>("—");

  useEffect(() => {
    const id = generateReportId(data.name);
    setReportId(id);
    const now = new Date();
    setIssueDate(now);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const payload = [
      id,
      data.name,
      data.countryCode,
      data.totalZakat.toFixed(2),
      data.monetaryBase.toFixed(2),
      data.moneyNisab.toFixed(2),
      now.toISOString(),
    ].join("|");
    computeHash(payload).then(async (h) => {
      setDocHash(h);
      const basis = data.nisabBasis ?? "beneficial";
      const issued = now.toISOString();
      let sig = "";
      try {
        const { signReport } = await import("@/lib/signature.functions");
        const r = await signReport({ data: { id, hash: h, issued } });
        sig = r.sig;
      } catch {
        /* signing optional — falls back to unsigned verify */
      }
      const params = new URLSearchParams({
        id,
        hash: h,
        basis,
        v: "Nisab v1.0",
        method: "AAOIFI-35",
        issuer: "Nisab Platform",
        issued,
        ...(sig ? { sig } : {}),
      });
      setVerifyUrl(`${origin}/verify?${params.toString()}`);
    });
  }, [
    data.name,
    data.countryCode,
    data.totalZakat,
    data.monetaryBase,
    data.moneyNisab,
    data.nisabBasis,
  ]);

  const issueGregorian = issueDate ? fmtGregorian(issueDate) : "";
  const issueHijri = issueDate ? fmtHijri(issueDate) : "";
  const issueTime = issueDate ? fmtTime(issueDate) : "";

  const baseHawl = data.hawlDate ? new Date(data.hawlDate) : (issueDate ?? null);
  const nextHawl = baseHawl ? new Date(baseHawl.getTime() + HAWL_DAYS_HIJRI * 86400000) : null;
  const nextHawlGreg = nextHawl ? fmtGregorian(nextHawl) : "";
  const nextHawlHijri = nextHawl ? fmtHijri(nextHawl) : "";

  const qrPayload = verifyUrl || reportId;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(qrPayload)}`;

  const prevYear = parseFloat(data.previousYearZakat || "0") || 0;
  const diff = data.totalZakat - prevYear;
  const diffPct = prevYear > 0 ? (diff / prevYear) * 100 : 0;

  const sortedRows = [...data.rows].sort((a, b) => rowOrder(a.label) - rowOrder(b.label));

  const goldNisabValue = (data.goldPricePerGram ?? 0) * GOLD_NISAB_GRAMS;
  const silverNisabValue = (data.silverPricePerGram ?? 0) * SILVER_NISAB_GRAMS;
  const reachedGoldNisab = goldNisabValue > 0 && data.monetaryBase >= goldNisabValue;
  const reachedSilverNisab = silverNisabValue > 0 && data.monetaryBase >= silverNisabValue;

  const nisabBasis = data.nisabBasis ?? "beneficial";
  const basisInfo = NISAB_BASIS_LABELS[nisabBasis];
  const valuationBasis = data.valuationBasis ?? "market";

  // باليتة هادئة، إطارات أنحف، خطوط محسّنة (Cairo قياسي / Amiri للنصوص الشرعية)
  const C = {
    primary: "#0e3b2a",
    primaryLight: "#1e6b4a",
    primaryDark: "#072a1d",
    gold: "#c9a84c",
    goldDark: "#9b8030",
    goldLight: "#f6efd3",
    cream: "#fbf9f0",
    deepCream: "#f1ede0",
    border: "#d8cfae",
    softBorder: "#e7e1c8",
    text: "#1a2018",
    soft: "#5a615a",
    danger: "#b03a2e",
    warn: "#a06000",
    success: "#1f7a4d",
  };

  const FONT_UI =
    "'Cairo', 'Noto Kufi Arabic', 'IBM Plex Sans Arabic', 'GE SS', 'DIN Next Arabic', 'Tajawal', system-ui, sans-serif";
  const FONT_QURAN = "'Amiri Quran', 'Amiri', 'Scheherazade New', serif";

  return (
    <div
      id="print-report"
      dir="rtl"
      lang="ar"
      style={{
        fontFamily: FONT_UI,
        color: C.text,
        fontSize: "11pt",
        lineHeight: 1.75,
        letterSpacing: "0.1pt",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* الخطوط محمّلة من __root.tsx لضمان جاهزيتها قبل تصدير PDF */}
      <style>{`
        #print-report { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; font-kerning: normal; font-feature-settings: "kern","liga","calt","ss01"; }
        #print-report * { font-family: inherit; }
        #print-report table { border-collapse: separate; border-spacing: 0; }
        #print-report td, #print-report th { vertical-align: middle; }
        #print-report .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum","lnum"; text-align: left; direction: ltr; letter-spacing: 0; font-family: 'Cairo','Inter',system-ui,sans-serif; }
        #print-report h1, #print-report h2, #print-report h3 { letter-spacing: -0.2pt; font-family: ${FONT_UI}; }
        #print-report .quran { font-family: ${FONT_QURAN}; }
      `}</style>

      {/* ============================================================ */}
      {/* صفحة 1 — الغلاف */}
      {/* ============================================================ */}
      <div
        style={{
          minHeight: "260mm",
          display: "flex",
          flexDirection: "column",
          background: C.cream,
          padding: "20pt 18pt",
          borderRadius: "10pt",
        }}
      >
        {/* شريط هوية لاتيني */}
        <div
          style={{
            textAlign: "center",
            fontSize: "8.5pt",
            color: C.goldDark,
            letterSpacing: "3pt",
            fontWeight: 700,
            paddingBottom: "8pt",
            borderBottom: `1pt double ${C.gold}`,
          }}
        >
          ◆ NISAB · CERTIFIED ZAKAT CALCULATOR ◆
        </div>

        {/* اللوجو الكبير + البسملة */}
        <div style={{ textAlign: "center", marginTop: "26pt" }}>
          <div
            style={{
              width: "170pt",
              height: "170pt",
              margin: "0 auto",
              borderRadius: "50%",
              background: "white",
              border: `2pt solid ${C.gold}`,
              padding: "10pt",
              boxShadow: "0 4pt 18pt rgba(14,59,42,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logoUrl}
              alt={`شعار ${PLATFORM_NAME_AR}`}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              fontFamily: FONT_QURAN,
              fontSize: "26pt",
              color: C.primary,
              marginTop: "22pt",
              lineHeight: 1.4,
              fontWeight: 700,
            }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </div>

          <div
            style={{
              display: "inline-block",
              marginTop: "18pt",
              padding: "10pt 26pt",
              background: C.primary,
              color: "white",
              borderRadius: "8pt",
              fontSize: "22pt",
              fontWeight: 900,
              letterSpacing: "0",
            }}
          >
            تقرير حساب زكاة الأفراد
          </div>

          <div
            style={{
              marginTop: "10pt",
              fontSize: "11pt",
              color: C.soft,
            }}
          >
            وفق المعايير الشرعية والمحاسبية الدولية (AAOIFI)
          </div>

          <div
            style={{
              marginTop: "14pt",
              fontSize: "18pt",
              color: C.primary,
              fontWeight: 800,
              fontFamily: FONT_QURAN,
            }}
          >
            {PLATFORM_NAME_AR}
            <span
              style={{
                fontFamily: FONT_UI,
                fontSize: "11pt",
                color: C.goldDark,
                marginInlineStart: "10pt",
                fontWeight: 600,
              }}
            >
              — {PLATFORM_TAGLINE}
            </span>
          </div>
        </div>

        {/* بيانات الإصدار + QR */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "30pt",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "16pt",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              border: `0.6pt solid ${C.softBorder}`,
              borderRadius: "8pt",
              padding: "12pt 14pt",
              fontSize: "9.5pt",
              lineHeight: 1.8,
            }}
          >
            <div>
              <b style={{ color: C.primary }}>المُزكِّي:</b> {data.name || "—"}
            </div>
            <div>
              <b style={{ color: C.primary }}>الدولة:</b> {countryLong} —{" "}
              <b style={{ color: C.primary }}>العملة:</b> {currencyLong}
            </div>
            <div>
              <b style={{ color: C.primary }}>التاريخ:</b> {issueGregorian}
            </div>
            <div>
              <b style={{ color: C.primary }}>الموافق:</b> {issueHijri}
            </div>
            <div>
              <b style={{ color: C.primary }}>الوقت:</b> {issueTime}
            </div>
            <div>
              <b style={{ color: C.primary }}>رقم التقرير:</b>{" "}
              <span style={{ fontFamily: "monospace", color: C.goldDark, fontWeight: 700 }}>
                {reportId}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <img
              src={qrSrc}
              alt="QR"
              style={{
                width: "110pt",
                height: "110pt",
                background: "white",
                padding: "5pt",
                border: `0.6pt solid ${C.softBorder}`,
                borderRadius: "6pt",
              }}
            />
            <div
              style={{
                fontSize: "9pt",
                marginTop: "5pt",
                color: C.primary,
                fontWeight: 800,
                lineHeight: 1.4,
              }}
            >
              تحقّق من التقرير
              <div
                style={{
                  fontSize: "7.5pt",
                  fontWeight: 600,
                  color: C.goldDark,
                  letterSpacing: "1pt",
                }}
              >
                VERIFY REPORT
              </div>
            </div>
            <div style={{ fontSize: "7.5pt", color: C.soft, marginTop: "2pt" }}>
              امسح لفتح رابط الحاسبة والتحقق
            </div>
          </div>
        </div>

        {/* التحذير القانوني البارز */}
        <div
          className="print-avoid-break"
          style={{
            marginTop: "16pt",
            padding: "12pt 14pt",
            borderRadius: "8pt",
            background: "#fff5e0",
            border: `1pt solid ${C.warn}`,
            display: "flex",
            gap: "10pt",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "26pt",
              height: "26pt",
              borderRadius: "50%",
              background: C.warn,
              color: "white",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "15pt",
            }}
          >
            !
          </div>
          <div style={{ fontSize: "10pt", color: "#5b3a00", lineHeight: 1.7 }}>
            <b style={{ fontSize: "11pt" }}>تنبيه قانوني وشرعي:</b>
            <br />
            هذا التقرير <b>أداة مساعدة للحساب وفق مدخلات المستخدم، وليس فتوى شرعية ملزمة</b> ولا
            تقريراً معتمداً من جهة حكومية. تظلّ المسؤولية الشرعية والمالية على عاتق المُزكِّي،
            ويُنصح بمراجعة مفتٍ أو محاسب زكاة معتمد للحالات الخاصة.
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* صفحة 2 — البيانات والوعاء */}
      {/* ============================================================ */}
      <div className="print-page-break" />

      {/* ترويسة مبسّطة للصفحة الثانية */}
      <div
        className="print-avoid-break"
        style={{
          background: C.primary,
          color: "white",
          padding: "10pt 14pt",
          borderRadius: "6pt",
          marginBottom: "10pt",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10pt",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10pt" }}>
          <img
            src={logoUrl}
            alt=""
            style={{
              width: "26pt",
              height: "26pt",
              background: "white",
              borderRadius: "50%",
              padding: "2pt",
            }}
          />
          <div style={{ fontWeight: 800, fontSize: "12pt" }}>
            {PLATFORM_NAME_AR} — تفصيل الوعاء الزكوي
          </div>
        </div>
        <div style={{ fontSize: "8.5pt", opacity: 0.9, fontFamily: "monospace" }}>{reportId}</div>
      </div>

      {/* ★ بطاقة البطل — إجمالي الزكاة الواجبة (أكبر عنصر بصري) */}
      <div
        className="print-avoid-break"
        style={{
          background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`,
          color: "white",
          padding: "18pt 20pt",
          borderRadius: "10pt",
          marginBottom: "12pt",
          boxShadow: "0 4pt 14pt rgba(14,59,42,0.18)",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: "14pt",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10pt",
              color: C.goldLight,
              fontWeight: 700,
              letterSpacing: "1pt",
              marginBottom: "4pt",
            }}
          >
            ◆ إجمالي الزكاة الواجبة
          </div>
          <div
            className="num"
            style={{
              fontSize: "30pt",
              fontWeight: 900,
              lineHeight: 1.1,
              color: "white",
              textAlign: "right",
              direction: "rtl",
            }}
          >
            {curFull(data.totalZakat)}
          </div>
          <div style={{ fontSize: "9pt", marginTop: "4pt", opacity: 0.85 }}>
            بعد خصم الديون والالتزامات المخصومة شرعاً
          </div>
        </div>
        <div
          style={{
            background: C.gold,
            color: C.primaryDark,
            padding: "12pt 10pt",
            borderRadius: "8pt",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "8.5pt", fontWeight: 700, opacity: 0.85 }}>
            نسبة الزكاة المطبّقة
          </div>
          <div className="num" style={{ fontSize: "22pt", fontWeight: 900, lineHeight: 1.2 }}>
            {(data.effectiveRate * 100).toFixed(3)}%
          </div>
          <div style={{ fontSize: "7.5pt", marginTop: "2pt" }}>
            {data.calendarBasis === "hijri" ? "هجري — 354 يوم" : "ميلادي — 365 يوم"}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: `0.6pt solid ${C.goldLight}`,
            padding: "10pt",
            borderRadius: "8pt",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "8.5pt", color: C.goldLight, fontWeight: 700 }}>
            النصاب المعتمد
          </div>
          <div
            className="num"
            style={{ fontSize: "14pt", fontWeight: 800, lineHeight: 1.3, marginTop: "2pt" }}
          >
            {curFull(data.moneyNisab)}
          </div>
          <div style={{ fontSize: "7.5pt", marginTop: "2pt", opacity: 0.9 }}>{basisInfo.name}</div>
        </div>
      </div>

      {/* ★ ما الذي تم احتسابه؟ — خطوات الحساب */}
      <div className="print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>ما الذي تم احتسابه؟ — خطوات الحساب باختصار</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8pt",
            fontSize: "9pt",
          }}
        >
          {[
            { n: "1", t: "حصر الأصول النامية", d: "نقد، ذهب، فضة، عروض تجارة، أسهم، ديون مرجوّة" },
            { n: "2", t: "خصم الديون الحالّة", d: `(${curFull(data.debts)}) من الوعاء الإجمالي` },
            { n: "3", t: "التأكد من بلوغ النصاب", d: `≥ ${curFull(data.moneyNisab)}` },
            {
              n: "4",
              t: "تطبيق النسبة الشرعية",
              d: `× ${(data.effectiveRate * 100).toFixed(3)}% = ${curFull(data.totalZakat)}`,
            },
          ].map((s) => (
            <div
              key={s.n}
              style={{
                background: C.cream,
                border: `0.4pt solid ${C.softBorder}`,
                borderRight: `3pt solid ${C.gold}`,
                borderRadius: "5pt",
                padding: "8pt 10pt",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: C.primary,
                  color: "white",
                  width: "18pt",
                  height: "18pt",
                  borderRadius: "50%",
                  textAlign: "center",
                  fontWeight: 900,
                  lineHeight: "18pt",
                  fontSize: "10pt",
                  marginBottom: "4pt",
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: C.primary,
                  fontSize: "9.5pt",
                  marginBottom: "2pt",
                }}
              >
                {s.t}
              </div>
              <div style={{ color: C.soft, lineHeight: 1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* مقدمة المحاسب */}
      {(data.accountantPreamble || data.accountantName) && (
        <div className="print-avoid-break" style={cardStyle(C)}>
          {data.accountantPreamble && (
            <div
              style={{
                fontSize: "10pt",
                lineHeight: 1.85,
                whiteSpace: "pre-line",
                textAlign: "justify",
                color: C.soft,
                borderRight: `2pt solid ${C.gold}`,
                paddingRight: "10pt",
              }}
            >
              {data.accountantPreamble}
            </div>
          )}
          {(data.accountantName || data.accountantLicense) && (
            <div
              style={{
                marginTop: "7pt",
                fontSize: "9pt",
                display: "flex",
                gap: "20pt",
                color: C.primary,
                flexWrap: "wrap",
              }}
            >
              {data.accountantName && (
                <div>
                  <b>المحاسب المعتمد:</b> {data.accountantName}
                </div>
              )}
              {data.accountantLicense && (
                <div>
                  <b>رقم القيد/الترخيص:</b> {data.accountantLicense}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ① بيانات المزكي */}
      <div className="print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>① بيانات المُزكِّي</div>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thLabel(C)}>الاسم</td>
              <td style={tdCell()}>{data.name || "—"}</td>
              <td style={thLabel(C)}>المهنة / النشاط</td>
              <td style={tdCell()}>{data.profession || "—"}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>الدولة</td>
              <td style={tdCell()}>{countryLong}</td>
              <td style={thLabel(C)}>عملة الإقرار</td>
              <td style={tdCell()}>{currencyLong}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>نسبة الزكاة</td>
              <td style={tdCell()}>{(data.effectiveRate * 100).toFixed(3)}%</td>
              <td style={thLabel(C)}>حالة الحول</td>
              <td style={tdCell()}>
                {data.hawlComplete === null
                  ? "غير محدد"
                  : data.hawlComplete
                    ? "✓ مكتمل"
                    : "⏳ لم يكتمل"}
              </td>
            </tr>
            {nextHawl && (
              <tr>
                <td style={thLabel(C)}>تاريخ حلول الحول القادم</td>
                <td style={tdCell()} colSpan={3}>
                  {nextHawlGreg} — {nextHawlHijri}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ② قاعدة النصاب المختارة + شرح فقهي */}
      <div className="print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>② قاعدة النصاب المعتمدة في هذا التقرير</div>
        <div
          style={{
            padding: "10pt 12pt",
            background: C.goldLight,
            borderRadius: "5pt",
            borderRight: `3pt solid ${C.gold}`,
            fontSize: "10pt",
            lineHeight: 1.8,
          }}
        >
          <div style={{ fontWeight: 800, color: C.primary, fontSize: "11pt", marginBottom: "4pt" }}>
            {basisInfo.name}
          </div>
          <div style={{ color: C.soft }}>{basisInfo.fiqh}</div>
        </div>

        {/* ميتاداتا التسعير — مصدر، تاريخ، نوع السعر */}
        <div
          style={{
            marginTop: "8pt",
            padding: "8pt 10pt",
            background: C.cream,
            borderRadius: "5pt",
            border: `0.4pt solid ${C.softBorder}`,
            fontSize: "9pt",
            color: C.soft,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "6pt",
          }}
        >
          <div>
            <b style={{ color: C.primary }}>مصدر التسعير:</b>
            <br />
            السوق العالمية (XAU/XAG) + تحويل لحظي
          </div>
          <div>
            <b style={{ color: C.primary }}>تاريخ التسعير:</b>
            <br />
            {data.valuationDate || issueGregorian}
          </div>
          <div>
            <b style={{ color: C.primary }}>نوع السعر:</b>
            <br />
            متوسط بيع/شراء (Spot Mid)
          </div>
          <div>
            <b style={{ color: C.primary }}>التقويم:</b>
            <br />
            {data.calendarBasis === "hijri" ? "هجري — 354 يوم" : "ميلادي — 365 يوم"}
          </div>
        </div>

        <table style={{ ...tableStyle, marginTop: "8pt" }}>
          <thead>
            <tr>
              <th style={thStyle(C)}>الصنف</th>
              <th style={thStyle(C)}>النصاب الشرعي</th>
              <th style={thStyle(C)}>سعر الجرام</th>
              <th style={thStyle(C)}>قيمة النصاب</th>
            </tr>
          </thead>
          <tbody>
            <tr style={nisabBasis === "gold" ? { background: C.goldLight } : undefined}>
              <td style={tdCell()}>
                <b>الذهب</b> (عيار 24)
              </td>
              <td style={tdCell("center")}>{GOLD_NISAB_GRAMS} جرام</td>
              <td style={tdCell("num")}>
                {data.goldPricePerGram ? curFull(data.goldPricePerGram) : "—"}
              </td>
              <td style={tdCell("num")}>{data.goldPricePerGram ? curFull(goldNisabValue) : "—"}</td>
            </tr>
            <tr style={nisabBasis === "silver" ? { background: C.goldLight } : undefined}>
              <td style={tdCell()}>
                <b>الفضة</b>
              </td>
              <td style={tdCell("center")}>{SILVER_NISAB_GRAMS} جرام</td>
              <td style={tdCell("num")}>
                {data.silverPricePerGram ? curFull(data.silverPricePerGram) : "—"}
              </td>
              <td style={tdCell("num")}>
                {data.silverPricePerGram ? curFull(silverNisabValue) : "—"}
              </td>
            </tr>
            <tr style={{ background: C.cream }}>
              <td style={{ ...tdCell(), fontWeight: 700, color: C.primary }} colSpan={3}>
                النصاب المعتمد في هذا التقرير
              </td>
              <td style={{ ...tdCell("num"), fontWeight: 800, color: C.primary }}>
                {curFull(data.moneyNisab)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ③ المنهجية وأسس التقييم */}
      <div className="print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>③ المنهجية وأسس التقييم</div>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thLabel(C)}>أساس القياس</td>
              <td style={tdCell()}>
                {valuationBasis === "market"
                  ? "القيمة السوقية العادلة في تاريخ حلول الحول"
                  : "القيمة الدفترية وفق سجلات المُزكِّي"}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>تاريخ التقييم المرجعي</td>
              <td style={tdCell()}>{data.valuationDate || issueGregorian}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>التقويم الزمني</td>
              <td style={tdCell()}>
                {data.calendarBasis === "hijri" ? "هجري — ٣٥٤ يوماً" : "ميلادي — ٣٦٥ يوماً"}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>نسبة الزكاة المطبّقة</td>
              <td style={tdCell()}>
                {(data.effectiveRate * 100).toFixed(3)}%
                {data.calendarBasis === "gregorian" && " (مُعدَّلة لتفاوت السنة الميلادية)"}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>أصول الزروع والأنعام</td>
              <td style={tdCell()}>
                تُقدَّر شرعاً وفق فقه الأبواب الخاصة (٥٪ أو ١٠٪ للزروع، عيناً للأنعام).
              </td>
            </tr>
          </tbody>
        </table>
        {data.assumptions && (
          <div
            style={{
              marginTop: "8pt",
              padding: "8pt 10pt",
              background: C.cream,
              borderRadius: "4pt",
              fontSize: "9.5pt",
              color: C.soft,
              lineHeight: 1.7,
              whiteSpace: "pre-line",
              borderRight: `2pt solid ${C.gold}`,
            }}
          >
            <b style={{ color: C.primary }}>الافتراضات والإفصاحات الإضافية:</b>
            <br />
            {data.assumptions}
          </div>
        )}
      </div>

      {/* ④ تحديد الوعاء الزكوي */}
      <div style={cardStyle(C)}>
        <div style={titleStyle(C)}>④ تحديد الوعاء الزكوي</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle(C)}>البند</th>
              <th style={thStyle(C)}>الوعاء الإجمالي</th>
              <th style={thStyle(C)}>النصاب المرجعي</th>
              <th style={thStyle(C)}>بلوغ النصاب</th>
              <th style={thStyle(C)}>الزكاة المستحقة</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, i) => {
              // للبنود التي تُجمَع في الوعاء النقدي (zakat===0) — نعرض زكاة تقديرية = gross × النسبة
              const isPooled = r.zakat === 0 && r.eligible && r.gross > 0;
              const shownZakat = isPooled ? r.gross * data.effectiveRate : r.zakat;
              return (
                <tr key={i} style={i % 2 ? { background: C.cream } : undefined}>
                  <td style={tdCell()}>{r.label}</td>
                  <td style={tdCell("num")}>{curFull(r.gross)}</td>
                  <td style={tdCell("num")}>{r.nisab !== undefined ? curFull(r.nisab) : "—"}</td>
                  <td
                    style={{
                      ...tdCell("center"),
                      color: r.eligible ? C.success : C.danger,
                      fontWeight: 700,
                    }}
                  >
                    {r.eligible ? "✓" : "✗"}
                  </td>
                  <td
                    style={{
                      ...tdCell("num"),
                      fontWeight: 700,
                      color: shownZakat > 0 ? C.primary : C.soft,
                    }}
                  >
                    {curFull(shownZakat)}
                    {isPooled && (
                      <div
                        style={{
                          fontSize: "7.5pt",
                          color: C.soft,
                          fontWeight: 400,
                          marginTop: "1pt",
                          direction: "rtl",
                          textAlign: "right",
                        }}
                      >
                        تقديري قبل خصم الديون
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...tdCell(), fontWeight: 700 }}>إجمالي الوعاء النقدي قبل الخصم</td>
              <td style={tdCell("num")} colSpan={3}>
                {curFull(data.monetaryGross)}
              </td>
              <td style={{ ...tdCell("num"), fontWeight: 700, color: C.soft }}>
                {curFull(data.monetaryGross * data.effectiveRate)}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdCell(), fontWeight: 700, color: C.danger }}>
                (−) الديون والالتزامات المخصومة
              </td>
              <td style={{ ...tdCell("num"), color: C.danger }} colSpan={3}>
                {curFull(data.debts)}
              </td>
              <td style={{ ...tdCell("num"), color: C.danger, fontWeight: 700 }}>
                − {curFull(data.debts * data.effectiveRate)}
              </td>
            </tr>
            <tr>
              <td
                style={{ ...tdCell(), fontWeight: 800, background: C.goldLight, color: C.primary }}
              >
                = الوعاء النقدي الصافي
              </td>
              <td
                style={{
                  ...tdCell("num"),
                  background: C.goldLight,
                  fontWeight: 800,
                  color: C.primary,
                }}
                colSpan={3}
              >
                {curFull(data.monetaryBase)}
              </td>
              <td
                style={{
                  ...tdCell("num"),
                  background: C.primary,
                  color: "white",
                  fontWeight: 900,
                  fontSize: "12pt",
                }}
              >
                {curFull(data.totalZakat)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ملخّص الإجماليات حسب كل نوع — يجمع الزكاة التقديرية لكل بند مع الإجمالي النهائي */}
        <div
          style={{
            marginTop: "10pt",
            padding: "10pt 12pt",
            background: C.cream,
            border: `0.4pt solid ${C.softBorder}`,
            borderRight: `3pt solid ${C.gold}`,
            borderRadius: "5pt",
            fontSize: "9.5pt",
            lineHeight: 1.9,
          }}
        >
          <div
            style={{ fontWeight: 800, color: C.primary, marginBottom: "5pt", fontSize: "10.5pt" }}
          >
            ملخّص الإجماليات حسب نوع الزكاة
          </div>
          {sortedRows
            .filter((r) => r.gross > 0)
            .map((r, i) => {
              const isPooled = r.zakat === 0 && r.eligible;
              const z = isPooled ? r.gross * data.effectiveRate : r.zakat;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: `0.3pt dashed ${C.softBorder}`,
                    padding: "2pt 0",
                  }}
                >
                  <span style={{ color: C.text }}>{r.label}</span>
                  <span
                    className="num"
                    style={{ fontWeight: 700, color: z > 0 ? C.primary : C.soft }}
                  >
                    {curFull(z)}
                    {isPooled && (
                      <span
                        style={{
                          fontSize: "7.5pt",
                          color: C.soft,
                          fontWeight: 400,
                          marginInlineStart: "4pt",
                        }}
                      >
                        (تقديري)
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "6pt",
              paddingTop: "6pt",
              borderTop: `1pt solid ${C.gold}`,
            }}
          >
            <span style={{ fontWeight: 800, color: C.primary }}>
              الإجمالي النهائي للزكاة المستحقة (بعد خصم الديون)
            </span>
            <span className="num" style={{ fontWeight: 900, color: C.primary, fontSize: "12pt" }}>
              {curFull(data.totalZakat)}
            </span>
          </div>
        </div>
      </div>

      {/* ⑤ تفصيل الديون المخصومة (إن وُجد) */}
      {data.debtsBreakdown &&
        data.debtsBreakdown.current +
          data.debtsBreakdown.longTerm +
          data.debtsBreakdown.installmentsDueInHawl >
          0 && (
          <div className="print-avoid-break" style={cardStyle(C)}>
            <div style={titleStyle(C)}>⑤ تفصيل الديون والالتزامات المخصومة</div>
            <div style={{ fontSize: "9pt", color: C.soft, marginBottom: "6pt" }}>
              ضابط شرعي: <b>لا يُخصم كلُّ دين</b>. يُخصم الدين الحالّ، وأقساط الديون طويلة الأجل
              المستحقة خلال الحول فقط — وفق ترجيح كثير من المعاصرين ومجمع الفقه الإسلامي الدولي.
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle(C)}>نوع الالتزام</th>
                  <th style={thStyle(C)}>المبلغ</th>
                  <th style={thStyle(C)}>المعالجة</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdCell()}>ديون حالّة الأداء</td>
                  <td style={tdCell("num")}>{curFull(data.debtsBreakdown.current)}</td>
                  <td style={{ ...tdCell("center"), color: C.success, fontWeight: 700 }}>
                    تُخصم بالكامل
                  </td>
                </tr>
                <tr style={{ background: C.cream }}>
                  <td style={tdCell()}>أقساط مستحقة خلال الحول</td>
                  <td style={tdCell("num")}>
                    {curFull(data.debtsBreakdown.installmentsDueInHawl)}
                  </td>
                  <td style={{ ...tdCell("center"), color: C.success, fontWeight: 700 }}>تُخصم</td>
                </tr>
                <tr>
                  <td style={tdCell()}>ديون طويلة الأجل (ما بعد الحول)</td>
                  <td style={tdCell("num")}>{curFull(data.debtsBreakdown.longTerm)}</td>
                  <td style={{ ...tdCell("center"), color: C.warn, fontWeight: 700 }}>لا تُخصم</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      {/* ⑥ مقارنة الوعاء بالنصاب وخيار المُزكِّي */}
      <div
        className="print-avoid-break"
        style={{
          ...cardStyle(C),
          background: reachedGoldNisab ? "#eaf5ee" : "#fff8e6",
        }}
      >
        <div style={titleStyle(C)}>⑥ مقارنة الوعاء بالنصاب وخيار المُزكِّي</div>

        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thLabel(C)}>الوعاء الصافي المحسوب</td>
              <td style={{ ...tdCell("num"), fontWeight: 800, color: C.primary }}>
                {curFull(data.monetaryBase)}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>نصاب الذهب (الأشدّ)</td>
              <td style={tdCell("num")}>{goldNisabValue > 0 ? curFull(goldNisabValue) : "—"}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>نصاب الفضة (الأنفع للفقراء)</td>
              <td style={tdCell("num")}>
                {silverNisabValue > 0 ? curFull(silverNisabValue) : "—"}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>النتيجة مقارنةً بنصاب الذهب</td>
              <td
                style={{
                  ...tdCell(),
                  fontWeight: 800,
                  color: reachedGoldNisab ? C.success : C.danger,
                }}
              >
                {reachedGoldNisab ? "✓ بلغ الوعاءُ نصابَ الذهب" : "✗ لم يبلغ الوعاءُ نصابَ الذهب"}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>النتيجة مقارنةً بنصاب الفضة</td>
              <td
                style={{
                  ...tdCell(),
                  fontWeight: 800,
                  color: reachedSilverNisab ? C.success : C.danger,
                }}
              >
                {reachedSilverNisab ? "✓ بلغ الوعاءُ نصابَ الفضة" : "✗ لم يبلغ نصابَ الفضة"}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            marginTop: "8pt",
            padding: "10pt 12pt",
            borderRadius: "5pt",
            background: reachedGoldNisab ? C.success : C.goldDark,
            color: "white",
            fontSize: "10pt",
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "11pt", marginBottom: "4pt" }}>
            ◆ خيارات المُزكِّي وفق المذاهب الفقهية:
          </div>
          {reachedGoldNisab ? (
            <>
              بلغ الوعاء النقدي الصافي ({curFull(data.monetaryBase)}) نصابَ الذهب — تجب الزكاة قطعاً
              بمبلغ <b>{curFull(data.totalZakat)}</b>.
            </>
          ) : reachedSilverNisab ? (
            <>
              <b>للمُزكِّي الاختيار بين ثلاثة مذاهب:</b>
              <ol style={{ margin: "4pt 18pt 0", padding: 0 }}>
                <li>
                  <b>اعتماد نصاب الذهب:</b> لا تجب الزكاة هذا العام لعدم بلوغ النصاب الأشدّ.
                </li>
                <li>
                  <b>اعتماد نصاب الفضة:</b> تجب الزكاة بمبلغ <b>{curFull(data.totalZakat)}</b>.
                </li>
                <li>
                  <b>اعتماد الأنفع للفقراء:</b> ترجيح إخراج الزكاة لما فيه من النفع للمستحقّين
                  وبراءة الذمّة.
                </li>
              </ol>
            </>
          ) : (
            <>
              <b>لم يبلغ الوعاء النصاب الشرعي</b> لا الذهب ولا الفضة — فلا تجب الزكاة هذا العام،
              ويُستحبّ التصدّق بما تيسّر.
            </>
          )}
        </div>
      </div>

      {/* ⑦ زكاة الأنعام */}
      {data.livestock.show &&
        (data.livestock.camels > 0 || data.livestock.cows > 0 || data.livestock.sheep > 0) && (
          <div className="print-avoid-break" style={cardStyle(C)}>
            <div style={titleStyle(C)}>⑦ زكاة الأنعام (تُؤدَّى عيناً لا قيمةً)</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle(C)}>النوع</th>
                  <th style={thStyle(C)}>العدد</th>
                  <th style={thStyle(C)}>الواجب الشرعي</th>
                </tr>
              </thead>
              <tbody>
                {data.livestock.camels > 0 && (
                  <tr>
                    <td style={tdCell()}>الإبل</td>
                    <td style={tdCell("center")}>{data.livestock.camels}</td>
                    <td style={tdCell()}>{camelZakat(data.livestock.camels)}</td>
                  </tr>
                )}
                {data.livestock.cows > 0 && (
                  <tr>
                    <td style={tdCell()}>البقر</td>
                    <td style={tdCell("center")}>{data.livestock.cows}</td>
                    <td style={tdCell()}>{cowZakat(data.livestock.cows)}</td>
                  </tr>
                )}
                {data.livestock.sheep > 0 && (
                  <tr>
                    <td style={tdCell()}>الغنم</td>
                    <td style={tdCell("center")}>{data.livestock.sheep}</td>
                    <td style={tdCell()}>{sheepZakat(data.livestock.sheep)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      {/* ⑧ مقارنة سنوية */}
      {prevYear > 0 && (
        <div className="print-avoid-break" style={cardStyle(C)}>
          <div style={titleStyle(C)}>⑧ المقارنة السنوية</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle(C)}>البيان</th>
                <th style={thStyle(C)}>العام السابق</th>
                <th style={thStyle(C)}>العام الحالي</th>
                <th style={thStyle(C)}>الفرق</th>
                <th style={thStyle(C)}>نسبة التغير</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdCell()}>إجمالي الزكاة المستحقة</td>
                <td style={tdCell("num")}>{curFull(prevYear)}</td>
                <td style={tdCell("num")}>{curFull(data.totalZakat)}</td>
                <td
                  style={{
                    ...tdCell("num"),
                    color: diff >= 0 ? C.primary : C.danger,
                    fontWeight: 700,
                  }}
                >
                  {diff >= 0 ? "+" : ""}
                  {curFull(diff)}
                </td>
                <td
                  style={{
                    ...tdCell("num"),
                    color: diff >= 0 ? C.primary : C.danger,
                    fontWeight: 700,
                  }}
                >
                  {diff >= 0 ? "+" : ""}
                  {diffPct.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ⑨ تفاصيل المعالجة الزكوية */}
      <div className="print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>⑨ تفاصيل المعالجة الزكوية</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle(C)}>البند</th>
              <th style={thStyle(C)}>المعالجة</th>
              <th style={thStyle(C)}>السبب الشرعي / المرجع الفقهي</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "الذهب للزينة والاستعمال",
                "غير خاضع",
                "وفق رأي الجمهور (مالك والشافعي وأحمد) إذا لم يكن للادخار",
              ],
              ["الذهب للادخار وحفظ القيمة", "خاضع للزكاة", "إجماع الفقهاء عند بلوغ النصاب (85 جم)"],
              ["الفضة (مشغولات وسبائك)", "خاضعة", "حسب غرض الاقتناء — نصاب 595 جم"],
              ["النقد والحسابات البنكية والمحافظ الرقمية", "خاضع", "أصول نقدية نامية بالقوة"],
              ["الأسهم والأوراق المالية", "خاضعة", "أصول نامية — قرار مجمع الفقه الإسلامي رقم 28"],
              [
                "وثائق التأمين التكافلي",
                "خاضعة بقيمتها الاستردادية",
                "AAOIFI رقم 26 — جزء نقدي مملوك",
              ],
              ["الأوراق التجارية (الكمبيالات)", "خاضعة", "ديون مرجوّة في حكم الحاضر"],
              [
                "عروض التجارة والمستغلات",
                "خاضعة بالقيمة السوقية",
                "إجماع الفقهاء — قيمة عرض البيع",
              ],
              [
                "الدين الحالّ (واجب السداد)",
                "يُخصم من الوعاء",
                "اتفاق الفقهاء — مستحق في ذمة المُزكِّي",
              ],
              [
                "الدين طويل الأجل / المؤجل",
                "يُخصم قسط السنة فقط",
                "الفتوى المعاصرة — الباقي غير حالٍّ",
              ],
              ["النفقة الواجبة إذا صارت ديناً", "تُخصم", "حنابلة + قول معاصر — صارت ديناً مستقراً"],
              [
                "الزروع والثمار",
                "خاضعة عند بلوغ النصاب",
                "5% بالكلفة أو 10% بدونها — نص حديث صحيح",
              ],
            ].map(([item, treat, why], i) => (
              <tr key={i}>
                <td style={tdCell()}>
                  <b>{item}</b>
                </td>
                <td
                  style={{
                    ...tdCell("center"),
                    color: treat.startsWith("غير") ? C.warn : C.primary,
                    fontWeight: 700,
                  }}
                >
                  {treat}
                </td>
                <td style={{ ...tdCell(), fontSize: "9pt", color: C.soft }}>{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ⑩ النتيجة الشرعية التقديرية */}
      <div className="print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>⑩ النتيجة الشرعية التقديرية</div>
        <div
          style={{
            background: C.cream,
            borderRadius: "4pt",
            padding: "10pt 13pt",
            fontSize: "10pt",
            fontWeight: 600,
            color: C.primary,
            marginBottom: "6pt",
            lineHeight: 1.8,
          }}
        >
          {OPINION_LABELS[data.opinionType]}
        </div>
        {data.accountantOpinion && (
          <div
            style={{
              fontSize: "10pt",
              lineHeight: 1.75,
              whiteSpace: "pre-line",
              textAlign: "justify",
              color: C.text,
            }}
          >
            {data.accountantOpinion}
          </div>
        )}

        {/* التوقيع الرقمي والـ Hash */}
        <div
          className="print-avoid-break"
          style={{
            marginTop: "14pt",
            padding: "10pt 12pt",
            borderRadius: "6pt",
            background: C.cream,
            border: `0.6pt solid ${C.softBorder}`,
          }}
        >
          <div style={{ fontSize: "9pt", color: C.primary, fontWeight: 800, marginBottom: "4pt" }}>
            ◆ التوقيع الرقمي والاعتماد الإلكتروني
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4pt 12pt",
              fontSize: "9pt",
            }}
          >
            <span style={{ color: C.soft }}>بصمة التوثيق (SHA‑256):</span>
            <span
              style={{
                fontFamily: "monospace",
                color: C.goldDark,
                fontWeight: 700,
                wordBreak: "break-all",
              }}
            >
              {docHash}
            </span>
            <span style={{ color: C.soft }}>رابط التحقق:</span>
            <a
              href={verifyUrl}
              style={{
                fontFamily: "monospace",
                color: C.primaryLight,
                fontSize: "8.5pt",
                wordBreak: "break-all",
              }}
            >
              {verifyUrl || "—"}
            </a>
          </div>
        </div>

        <div
          style={{
            marginTop: "16pt",
            display: "flex",
            justifyContent: "space-between",
            gap: "30pt",
            fontSize: "9pt",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                borderTop: `0.8pt solid ${C.primary}`,
                paddingTop: "3pt",
                textAlign: "center",
                color: C.primary,
                fontWeight: 700,
              }}
            >
              توقيع المُزكِّي
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                borderTop: `0.8pt solid ${C.primary}`,
                paddingTop: "3pt",
                textAlign: "center",
                color: C.primary,
                fontWeight: 700,
              }}
            >
              ختم وتوقيع المحاسب
              {data.accountantName && (
                <div
                  style={{ fontSize: "8.5pt", color: C.soft, marginTop: "2pt", fontWeight: 500 }}
                >
                  {data.accountantName}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ملحق المراجعة والتدقيق الشرعي (اختياري) */}
      {/* ============================================================ */}
      {data.auditEntries && data.auditEntries.length > 0 && (
        <>
          <div className="print-page-break" />
          <div
            className="print-avoid-break"
            style={{
              background: C.primary,
              color: "white",
              padding: "12pt 16pt",
              borderRadius: "8pt",
              marginBottom: "12pt",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "9pt", color: C.goldLight, letterSpacing: "3pt", fontWeight: 700 }}
            >
              ◆ SHARIA AUDIT TRAIL ◆
            </div>
            <div style={{ fontSize: "18pt", fontWeight: 900, marginTop: "4pt" }}>
              ملحق المراجعة والتدقيق الشرعي
            </div>
            <div style={{ fontSize: "9.5pt", opacity: 0.85, marginTop: "2pt" }}>
              سلسلة عمليات الحساب والحفظ الموثقة ببصمة فريدة والمراجع الشرعية المستخدمة
            </div>
          </div>

          <div style={cardStyle(C)}>
            <div style={titleStyle(C)}>سجل العمليات السابقة ({data.auditEntries.length})</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle(C)}>#</th>
                  <th style={thStyle(C)}>تاريخ العملية</th>
                  <th style={thStyle(C)}>نوع العملية</th>
                  <th style={thStyle(C)}>بصمة التوثيق</th>
                  <th style={thStyle(C)}>المراجع الشرعية</th>
                </tr>
              </thead>
              <tbody>
                {data.auditEntries.map((e, i) => (
                  <tr key={e.id} style={i % 2 ? { background: C.cream } : undefined}>
                    <td style={tdCell("center")}>{i + 1}</td>
                    <td style={tdCell()}>
                      {(() => {
                        try {
                          return new Date(e.created_at).toLocaleString("ar-EG");
                        } catch {
                          return e.created_at;
                        }
                      })()}
                    </td>
                    <td style={tdCell()}>
                      {e.action === "create_zakat_record" ? "إنشاء سجل زكاة" : e.action}
                    </td>
                    <td
                      style={{
                        ...tdCell(),
                        fontFamily: "monospace",
                        fontSize: "8.5pt",
                        color: C.goldDark,
                        wordBreak: "break-all",
                      }}
                    >
                      {e.fingerprint || "—"}
                    </td>
                    <td style={{ ...tdCell(), fontSize: "8.5pt" }}>
                      {e.sharia_refs && e.sharia_refs.length > 0 ? e.sharia_refs.join("، ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                marginTop: "10pt",
                padding: "8pt 10pt",
                background: C.goldLight,
                borderRight: `3pt solid ${C.gold}`,
                borderRadius: "5pt",
                fontSize: "9pt",
                color: C.soft,
                lineHeight: 1.7,
              }}
            >
              <b style={{ color: C.primary }}>ملاحظة:</b> يُسجَّل في هذا الملحق كل حساب أو حفظ ببصمة
              فريدة (SHA‑256) مع المراجع الشرعية المعتمدة (AAOIFI، قرارات المجامع الفقهية) لضمان
              الشفافية وإمكانية المراجعة لاحقاً.
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* صفحة 3 — مصارف الزكاة */}
      {/* ============================================================ */}
      <div className="print-page-break" />

      <div
        className="print-avoid-break"
        style={{
          textAlign: "center",
          marginBottom: "8pt",
          fontSize: "10pt",
          color: C.goldDark,
          letterSpacing: "4pt",
          fontWeight: 700,
        }}
      >
        ❖ ✦ ❖ ✦ ❖
      </div>

      <div
        className="print-avoid-break"
        style={{
          background: C.gold,
          color: C.primaryDark,
          padding: "16pt 18pt",
          borderRadius: "8pt",
          marginBottom: "12pt",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT_QURAN,
            fontSize: "20pt",
            fontWeight: 700,
            marginBottom: "6pt",
            lineHeight: 1.4,
          }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
        <div style={{ fontSize: "22pt", fontWeight: 900, lineHeight: 1.2 }}>
          مصارف الزكاة الثمانية الشرعية
        </div>
        <div style={{ fontSize: "9.5pt", marginTop: "4pt", opacity: 0.9 }}>
          المُستحقّون شرعاً لأخذ الزكاة وفق نصّ القرآن الكريم
        </div>
      </div>

      <div
        className="print-avoid-break"
        style={{
          background: C.primary,
          color: "white",
          padding: "14pt 16pt",
          borderRadius: "6pt",
          textAlign: "center",
          marginBottom: "12pt",
        }}
      >
        <div style={{ fontSize: "9pt", color: C.goldLight, marginBottom: "6pt" }}>قال تعالى:</div>
        <div
          style={{
            fontSize: "14pt",
            fontWeight: 700,
            color: C.goldLight,
            fontFamily: FONT_QURAN,
            lineHeight: 2,
          }}
        >
          ﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا
          وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ
          وَابْنِ السَّبِيلِ ۖ فَرِيضَةً مِّنَ اللَّهِ ۗ وَاللَّهُ عَلِيمٌ حَكِيمٌ﴾
        </div>
        <div style={{ fontSize: "8.5pt", marginTop: "4pt", opacity: 0.9 }}>[سورة التوبة: 60]</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9pt" }}>
        {ZAKAT_RECIPIENTS.map((r, i) => (
          <div
            key={i}
            className="print-avoid-break"
            style={{
              background: "white",
              border: `0.6pt solid ${C.softBorder}`,
              borderRadius: "6pt",
              padding: "10pt 12pt",
              display: "flex",
              gap: "10pt",
              alignItems: "flex-start",
              borderRight: `3pt solid ${C.gold}`,
            }}
          >
            <div
              style={{
                background: C.primary,
                color: "white",
                fontWeight: 900,
                width: "26pt",
                height: "26pt",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 800,
                  color: C.primary,
                  fontSize: "10.5pt",
                  marginBottom: "3pt",
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: "9pt", color: C.soft, lineHeight: 1.65 }}>
                {r.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="print-avoid-break"
        style={{
          textAlign: "center",
          margin: "12pt 0 6pt",
          fontSize: "9pt",
          color: C.goldDark,
          letterSpacing: "4pt",
        }}
      >
        ❖ ✦ ❖ ✦ ❖
      </div>

      {/* تذييل قانوني خفيف + branding */}
      <div
        style={{
          marginTop: "8pt",
          padding: "10pt 14pt",
          borderRadius: "6pt",
          background: C.deepCream,
          fontSize: "8.5pt",
          color: C.soft,
          lineHeight: 1.7,
          textAlign: "justify",
        }}
      >
        هذا التقرير وثيقة <b>استرشادية فقهية‑محاسبية</b> تستند إلى مدخلات المستخدم، ولا يُعدّ فتوى
        ملزمة. تظلّ المسؤولية الشرعية على عاتق المُزكِّي.
        <div
          style={{
            marginTop: "8pt",
            paddingTop: "6pt",
            borderTop: `0.6pt solid ${C.gold}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10pt",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8pt" }}>
            <img
              src={logoUrl}
              alt=""
              style={{ width: "30pt", height: "30pt", objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: 900, color: C.primary, fontSize: "11pt" }}>
                {PLATFORM_NAME_AR}
              </div>
              <div style={{ fontSize: "7.5pt", color: C.goldDark }}>{PLATFORM_TAGLINE}</div>
            </div>
          </div>
          <div style={{ textAlign: "left", fontSize: "8pt", color: C.primary }}>
            <div>© {(issueDate ?? new Date()).getFullYear()} جميع الحقوق محفوظة</div>
            <div>
              التقرير:{" "}
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.goldDark }}>
                {reportId}
              </span>
            </div>
            <div style={{ fontSize: "7pt" }}>
              بصمة: <span style={{ fontFamily: "monospace" }}>{docHash.slice(0, 16)}…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== أنماط مساعدة (إطارات أنحف، محاذاة أرقام أدق) =====
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "10pt",
};

function cardStyle(C: any): React.CSSProperties {
  return {
    background: "white",
    border: `0.3pt solid ${C.softBorder}`,
    borderRadius: "8pt",
    padding: "14pt 16pt",
    marginBottom: "12pt",
    boxShadow: "0 1pt 3pt rgba(14,59,42,0.04)",
  };
}
function titleStyle(C: any): React.CSSProperties {
  return {
    fontSize: "13pt",
    fontWeight: 800,
    color: C.primary,
    paddingBottom: "6pt",
    marginBottom: "10pt",
    borderBottom: `0.6pt solid ${C.gold}`,
    letterSpacing: "-0.2pt",
  };
}
function thStyle(C: any): React.CSSProperties {
  return {
    border: `0.3pt solid ${C.softBorder}`,
    padding: "7pt 9pt",
    textAlign: "right",
    background: C.primary,
    color: "white",
    fontWeight: 700,
    fontSize: "9.5pt",
    letterSpacing: "0.1pt",
  };
}
function thLabel(C: any): React.CSSProperties {
  return {
    border: `0.3pt solid ${C.softBorder}`,
    padding: "7pt 9pt",
    textAlign: "right",
    background: C.cream,
    fontWeight: 700,
    color: C.primary,
    width: "25%",
    fontSize: "9.75pt",
  };
}
function tdCell(kind?: "num" | "center"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "0.3pt solid #e7e1c8",
    padding: "6pt 9pt",
    textAlign: "right",
    fontSize: "10pt",
    lineHeight: 1.6,
  };
  if (kind === "num")
    return {
      ...base,
      textAlign: "left",
      direction: "ltr",
      fontVariantNumeric: "tabular-nums",
      fontFeatureSettings: '"tnum","lnum"',
      fontWeight: 600,
      letterSpacing: 0,
    };
  if (kind === "center") return { ...base, textAlign: "center" };
  return base;
}
