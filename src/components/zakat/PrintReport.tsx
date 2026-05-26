import { useEffect, useState } from "react";
import { currency as fmtCurrency, camelZakat, cowZakat, sheepZakat, ZAKAT_RECIPIENTS, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, HAWL_DAYS_HIJRI } from "@/lib/zakat";
import logoUrl from "@/assets/zakat-logo.png";

/**
 * تقرير زكوي احترافي للطباعة (A4) — صفحتان:
 *   ص1: ترويسة + بيانات المزكي + الأنصبة + الوعاء + المقارنة + الرأي المهني
 *   ص2: مصارف الزكاة الثمانية (صفحة مستقلة بفواصل مميزة)
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
  livestock: { camels: number; cows: number; sheep: number; show: boolean };
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
}

const COUNTRY_FULL: Record<string, string> = {
  EG: "جمهورية مصر العربية", SA: "المملكة العربية السعودية", AE: "الإمارات العربية المتحدة",
  KW: "دولة الكويت", QA: "دولة قطر", BH: "مملكة البحرين", OM: "سلطنة عُمان",
  JO: "المملكة الأردنية الهاشمية", MA: "المملكة المغربية", DZ: "الجمهورية الجزائرية",
  TN: "الجمهورية التونسية", IQ: "جمهورية العراق", SY: "الجمهورية العربية السورية",
  LB: "الجمهورية اللبنانية", YE: "الجمهورية اليمنية", SD: "جمهورية السودان",
  LY: "دولة ليبيا", PS: "دولة فلسطين", TR: "الجمهورية التركية",
  US: "الولايات المتحدة الأمريكية", EU: "الاتحاد الأوروبي", GB: "المملكة المتحدة",
};
const CURRENCY_FULL: Record<string, string> = {
  EG: "جنيه مصري", SA: "ريال سعودي", AE: "درهم إماراتي", KW: "دينار كويتي",
  QA: "ريال قطري", BH: "دينار بحريني", OM: "ريال عُماني", JO: "دينار أردني",
  MA: "درهم مغربي", DZ: "دينار جزائري", TN: "دينار تونسي", IQ: "دينار عراقي",
  SY: "ليرة سورية", LB: "ليرة لبنانية", YE: "ريال يمني", SD: "جنيه سوداني",
  LY: "دينار ليبي", PS: "شيكل إسرائيلي جديد", TR: "ليرة تركية",
  US: "دولار أمريكي", EU: "يورو", GB: "جنيه إسترليني",
};

const OPINION_LABELS: Record<PrintReportData["opinionType"], string> = {
  clean: "رأي نظيف غير متحفظ — التقرير يعبّر بصدق وعدالة عن الوعاء الزكوي.",
  qualified: "رأي متحفظ — توجد بنود استرشادية تحتاج لمراجعة فقهية تخصصية.",
  adverse: "رأي معاكس — البيانات المُدخلة غير كافية أو يشوبها لبس يحول دون الجزم بالنتيجة.",
};

function generateReportId(name: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const seed = (name || "ZK").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZK";
  return `NS-${seed}-${ts}-${rand}`;
}

const ORDER_PRIORITY = [
  "زكاة الذهب", "زكاة الفضة",
  "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية", "النقدية والبنوك",
  "زكاة الأوراق المالية ووثائق التأمين", "الأوراق المالية والاستثمارات",
  "زكاة الأوراق التجارية", "كمبيالات وأوراق قبض",
  "زكاة الدخل وعروض التجارة والمستغلات", "عروض التجارة والديون المرجوّة",
  "العقار والمستغلات (صافي)", "زكاة الزروع والثمار",
];
function rowOrder(label: string) {
  const i = ORDER_PRIORITY.findIndex((p) => label.includes(p) || p.includes(label));
  return i === -1 ? 999 : i;
}

function fmtHijri(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
    }).format(d) + " هـ";
  } catch {
    return "";
  }
}
function fmtGregorian(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(d) + " م";
  } catch {
    return d.toDateString();
  }
}
function fmtTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

export function PrintReport({ data }: { data: PrintReportData }) {
  const currencyLong = CURRENCY_FULL[data.countryCode] ?? data.currencyName;
  const countryLong = COUNTRY_FULL[data.countryCode] ?? data.countryCode;
  const curFull = (n: number) => fmtCurrency(n, currencyLong);

  // كل القيم المتغيرة (الوقت/التاريخ/المعرّف/الرابط) تُحسب بعد التحميل لتفادي أخطاء الـ SSR/Hydration
  const [reportId, setReportId] = useState<string>("NS-PENDING");
  const [issueDate, setIssueDate] = useState<Date | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string>("");

  useEffect(() => {
    const id = generateReportId(data.name);
    setReportId(id);
    const now = new Date();
    setIssueDate(now);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setVerifyUrl(`${origin}/?verify=${id}`);
  }, [data.name]);

  // التواريخ المعروضة (الميلادي + الهجري + الوقت + حولان الحول)
  const issueGregorian = issueDate ? fmtGregorian(issueDate) : "";
  const issueHijri = issueDate ? fmtHijri(issueDate) : "";
  const issueTime = issueDate ? fmtTime(issueDate) : "";

  // تاريخ حولان الحول القادم: من تاريخ بدء الحول الحالي + 354 يوماً (هجري) أو من تاريخ الإصدار
  const baseHawl = data.hawlDate ? new Date(data.hawlDate) : (issueDate ?? null);
  const nextHawl = baseHawl ? new Date(baseHawl.getTime() + HAWL_DAYS_HIJRI * 86400000) : null;
  const nextHawlGreg = nextHawl ? fmtGregorian(nextHawl) : "";
  const nextHawlHijri = nextHawl ? fmtHijri(nextHawl) : "";

  const qrPayload = verifyUrl || reportId;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(qrPayload)}`;

  const prevYear = parseFloat(data.previousYearZakat || "0") || 0;
  const diff = data.totalZakat - prevYear;
  const diffPct = prevYear > 0 ? (diff / prevYear) * 100 : 0;

  const sortedRows = [...data.rows].sort((a, b) => rowOrder(a.label) - rowOrder(b.label));

  // مقارنة الوعاء الصافي بنصاب الذهب
  const goldNisabValue = (data.goldPricePerGram ?? 0) * GOLD_NISAB_GRAMS;
  const silverNisabValue = (data.silverPricePerGram ?? 0) * SILVER_NISAB_GRAMS;
  const reachedGoldNisab = goldNisabValue > 0 && data.monetaryBase >= goldNisabValue;
  const reachedSilverNisab = silverNisabValue > 0 && data.monetaryBase >= silverNisabValue;
  // الأنفع للفقير = أدنى النصابين (عادةً الفضة) فيكون أيسر للوجوب
  const benefactorNisab = (silverNisabValue > 0 && goldNisabValue > 0)
    ? Math.min(silverNisabValue, goldNisabValue)
    : Math.max(silverNisabValue, goldNisabValue);

  const C = {
    primary: "#0e3b2a",
    primaryLight: "#1e6b4a",
    primaryDark: "#072a1d",
    gold: "#c9a84c",
    goldDark: "#9b8030",
    goldLight: "#f3e8c4",
    cream: "#faf7ee",
    deepCream: "#f0ede0",
    border: "#bda867",
    text: "#1a1a1a",
    soft: "#4a5246",
    danger: "#a33",
    success: "#1f7a4d",
  };

  return (
    <div id="print-report" dir="rtl" style={{ fontFamily: "Tajawal, Amiri, sans-serif", color: C.text, fontSize: "10pt" }}>
      {/* ============================================================ */}
      {/* صفحة 1 — تقرير حساب زكاة الأفراد */}
      {/* ============================================================ */}

      {/* ====== شريط الهوية العلوي (لاتيني فقط لتفادي كسر اتصال الحروف) ====== */}
      <div className="print-avoid-break" style={{
        textAlign: "center",
        padding: "5pt 0 7pt",
        borderBottom: `2pt double ${C.gold}`,
        marginBottom: "10pt",
        fontSize: "8.5pt",
        color: C.goldDark,
        fontWeight: 700,
        letterSpacing: "2pt",
      }}>
        ◆ NISAB · CERTIFIED ZAKAT CALCULATOR ◆
      </div>

      {/* ====== الترويسة الفاخرة (خلفية صلبة بدل التدرج لتفادي مشاكل html2canvas) ====== */}
      <div className="print-avoid-break" style={{
        background: C.primary,
        color: "white",
        padding: "16pt 18pt",
        borderRadius: "8pt",
        marginBottom: "10pt",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14pt",
        border: `1.5pt solid ${C.gold}`,
      }}>
        {/* لوجو كبير */}
        <div style={{
          width: "115pt", height: "115pt", flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          border: `1pt solid ${C.gold}`,
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "6pt",
        }}>
          <img src={logoUrl} alt={`شعار ${PLATFORM_NAME_AR}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* العنوان والبسملة (بدون letter-spacing لحماية اتصال الحروف) */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Amiri', 'Tajawal', serif",
            fontSize: "22pt",
            fontWeight: 700,
            color: C.goldLight,
            lineHeight: 1.4,
            padding: "4pt 14pt",
            borderTop: `0.6pt solid ${C.gold}`,
            borderBottom: `0.6pt solid ${C.gold}`,
            display: "inline-block",
          }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </div>
          <div style={{
            fontSize: "22pt", fontWeight: 900, marginTop: "8pt",
            fontFamily: "'Tajawal', sans-serif",
            color: "white",
            lineHeight: 1.2,
          }}>
            تقرير حساب زكاة الأفراد
          </div>
          <div style={{ fontSize: "9pt", opacity: 0.92, marginTop: "3pt", color: C.goldLight }}>
            وفق المعايير الشرعية والمحاسبية الدولية (AAOIFI)
          </div>
        </div>

        {/* QR + رابط التحقق */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <img src={qrSrc} alt="QR"
            style={{ width: "82pt", height: "82pt", background: "white", padding: "3pt", borderRadius: "5pt" }} />
          <div style={{ fontSize: "7pt", marginTop: "3pt", opacity: 0.9 }}>امسح للتحقق</div>
        </div>
      </div>

      {/* ====== شريط معلومات الإصدار ====== */}
      <div className="print-avoid-break" style={{
        background: C.deepCream,
        border: `0.6pt solid ${C.border}`, borderRadius: "5pt",
        padding: "8pt 12pt", marginBottom: "10pt", fontSize: "8.5pt",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5pt 16pt",
      }}>
        <span><b style={{ color: C.primary }}>رقم التقرير:</b> <span style={{ fontFamily: "monospace", color: C.goldDark, fontWeight: 700 }}>{reportId}</span></span>
        <span><b style={{ color: C.primary }}>التقويم المعتمد:</b> {data.calendarBasis === "hijri" ? "هجري (354 يوم)" : "ميلادي (365 يوم)"}</span>
        <span><b style={{ color: C.primary }}>التاريخ الميلادي:</b> {issueGregorian}</span>
        <span><b style={{ color: C.primary }}>التاريخ الهجري:</b> {issueHijri}</span>
        <span><b style={{ color: C.primary }}>وقت الإصدار:</b> {issueTime}</span>
        {nextHawl && (
          <span><b style={{ color: C.primary }}>حلول الحول القادم:</b> {nextHawlGreg} — {nextHawlHijri}</span>
        )}
        <span style={{ gridColumn: "1 / -1", borderTop: `0.4pt dashed ${C.border}`, paddingTop: "4pt", marginTop: "2pt" }}>
          <b style={{ color: C.primary }}>رابط التحقق / إعادة الطباعة:</b>{" "}
          <a href={verifyUrl} style={{ color: C.primaryLight, textDecoration: "underline", wordBreak: "break-all", fontFamily: "monospace", fontSize: "8pt" }}>{verifyUrl || "—"}</a>
        </span>
      </div>

      {/* ====== مقدمة المحاسب (بدون عنوان "ديباجة محاسب الزكاة") ====== */}
      {(data.accountantPreamble || data.accountantName) && (
        <div className="print-card print-avoid-break" style={cardStyle(C, C.gold)}>
          {data.accountantPreamble && (
            <div style={{
              fontSize: "9.5pt", lineHeight: 1.85, whiteSpace: "pre-line",
              textAlign: "justify", fontStyle: "italic", color: C.soft,
              borderRight: `3pt solid ${C.gold}`, paddingRight: "10pt",
            }}>
              {data.accountantPreamble}
            </div>
          )}
          {(data.accountantName || data.accountantLicense) && (
            <div style={{ marginTop: "7pt", fontSize: "9pt", display: "flex", gap: "20pt", color: C.primary, flexWrap: "wrap" }}>
              {data.accountantName && <div><b>المحاسب المعتمد:</b> {data.accountantName}</div>}
              {data.accountantLicense && <div><b>رقم القيد/الترخيص:</b> {data.accountantLicense}</div>}
            </div>
          )}
        </div>
      )}

      {/* ====== بيانات المزكي ====== */}
      <div className="print-card print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>① بيانات المُزكِّي</div>
        <table className="print-table" style={tableStyle}>
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
                {data.hawlComplete === null ? "غير محدد" : data.hawlComplete ? "✓ مكتمل" : "⏳ لم يكتمل"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ====== أنصبة الذهب والفضة ====== */}
      <div className="print-card print-avoid-break" style={{ ...cardStyle(C, C.gold), background: `linear-gradient(180deg, ${C.goldLight} 0%, #fffdf5 100%)` }}>
        <div style={titleStyle(C)}>② الأنصبة الشرعية المرجعية</div>
        <table className="print-table" style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle(C)}>الصنف</th>
              <th style={thStyle(C)}>النصاب الشرعي</th>
              <th style={thStyle(C)}>سعر الجرام</th>
              <th style={thStyle(C)}>قيمة النصاب بالعملة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell()}><b>الذهب</b> (عيار 24)</td>
              <td style={tdCell("center")}>{GOLD_NISAB_GRAMS} جرام (20 مثقالاً)</td>
              <td style={tdCell("num")}>{data.goldPricePerGram ? curFull(data.goldPricePerGram) : "—"}</td>
              <td style={tdCell("num")}>{data.goldPricePerGram ? curFull(goldNisabValue) : "—"}</td>
            </tr>
            <tr>
              <td style={tdCell()}><b>الفضة</b></td>
              <td style={tdCell("center")}>{SILVER_NISAB_GRAMS} جرام (200 درهم)</td>
              <td style={tdCell("num")}>{data.silverPricePerGram ? curFull(data.silverPricePerGram) : "—"}</td>
              <td style={tdCell("num")}>{data.silverPricePerGram ? curFull(silverNisabValue) : "—"}</td>
            </tr>
            <tr style={{ background: C.cream }}>
              <td style={{ ...tdCell(), fontWeight: 700, color: C.primary }} colSpan={3}>نصاب المال المعتمد في الحساب (الأنفع للفقراء)</td>
              <td style={{ ...tdCell("num"), fontWeight: 800, color: C.primary }}>{curFull(data.moneyNisab)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ====== تحديد الوعاء الزكوي ====== */}
      <div className="print-card" style={cardStyle(C)}>
        <div style={titleStyle(C)}>③ تحديد الوعاء الزكوي</div>
        <table className="print-table" style={tableStyle}>
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
            {sortedRows.map((r, i) => (
              <tr key={i} style={i % 2 ? { background: C.cream } : undefined}>
                <td style={tdCell()}>{r.label}</td>
                <td style={tdCell("num")}>{curFull(r.gross)}</td>
                <td style={tdCell("num")}>{r.nisab !== undefined ? curFull(r.nisab) : "—"}</td>
                <td style={{ ...tdCell("center"), color: r.eligible ? C.success : C.danger, fontWeight: 700 }}>
                  {r.eligible ? "✓" : "✗"}
                </td>
                <td style={{ ...tdCell("num"), fontWeight: 700, color: r.zakat > 0 ? C.primary : C.soft }}>
                  {curFull(r.zakat)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...tdCell(), fontWeight: 700 }}>إجمالي الوعاء النقدي قبل الخصم</td>
              <td style={tdCell("num")} colSpan={3}>{curFull(data.monetaryGross)}</td>
              <td style={tdCell()}></td>
            </tr>
            <tr>
              <td style={{ ...tdCell(), fontWeight: 700, color: C.danger }}>(−) الديون والالتزامات المخصومة</td>
              <td style={{ ...tdCell("num"), color: C.danger }} colSpan={3}>{curFull(data.debts)}</td>
              <td style={tdCell()}></td>
            </tr>
            <tr>
              <td style={{ ...tdCell(), fontWeight: 800, background: C.goldLight, color: C.primary }}>= الوعاء النقدي الصافي</td>
              <td style={{ ...tdCell("num"), background: C.goldLight, fontWeight: 800, color: C.primary }} colSpan={3}>
                {curFull(data.monetaryBase)}
              </td>
              <td style={{
                ...tdCell("num"),
                background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
                color: "white", fontWeight: 900, fontSize: "11pt",
              }}>
                {curFull(data.totalZakat)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ====== مقارنة الوعاء بالنصاب وخيار المُزكِّي ====== */}
      <div className="print-card print-avoid-break" style={{
        ...cardStyle(C, C.gold),
        background: reachedGoldNisab
          ? `linear-gradient(180deg, #eaf5ee, #ffffff)`
          : `linear-gradient(180deg, #fff8e6, #ffffff)`,
      }}>
        <div style={titleStyle(C)}>④ مقارنة الوعاء بالنصاب وخيار المُزكِّي</div>

        <table className="print-table" style={tableStyle}>
          <tbody>
            <tr>
              <td style={thLabel(C)}>الوعاء الصافي المحسوب</td>
              <td style={{ ...tdCell("num"), fontWeight: 800, color: C.primary }}>{curFull(data.monetaryBase)}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>نصاب الذهب (الأشد)</td>
              <td style={tdCell("num")}>{goldNisabValue > 0 ? curFull(goldNisabValue) : "—"}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>نصاب الفضة (الأنفع للفقراء)</td>
              <td style={tdCell("num")}>{silverNisabValue > 0 ? curFull(silverNisabValue) : "—"}</td>
            </tr>
            <tr>
              <td style={thLabel(C)}>النتيجة مقارنةً بنصاب الذهب</td>
              <td style={{ ...tdCell(), fontWeight: 800, color: reachedGoldNisab ? C.success : C.danger }}>
                {reachedGoldNisab ? "✓ بلغ الوعاءُ نصابَ الذهب — الزكاة واجبة قطعاً" : "✗ لم يبلغ الوعاءُ نصابَ الذهب"}
              </td>
            </tr>
            <tr>
              <td style={thLabel(C)}>النتيجة مقارنةً بنصاب الفضة</td>
              <td style={{ ...tdCell(), fontWeight: 800, color: reachedSilverNisab ? C.success : C.danger }}>
                {reachedSilverNisab ? "✓ بلغ الوعاءُ نصابَ الفضة — يجب الإخراج على الراجح" : "✗ لم يبلغ نصابَ الفضة"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* الخيار المقدم للمزكي */}
        <div style={{
          marginTop: "8pt", padding: "8pt 12pt", borderRadius: "5pt",
          background: reachedGoldNisab ? `linear-gradient(135deg, #1f7a4d, #2d8a5c)` : `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
          color: "white", fontSize: "9.5pt", lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 800, fontSize: "10.5pt", marginBottom: "3pt" }}>
            {reachedGoldNisab ? "◆ الحكم المقترح:" : "◆ خيار المُزكِّي:"}
          </div>
          {reachedGoldNisab ? (
            <>
              بلغ الوعاء النقدي الصافي ({curFull(data.monetaryBase)}) نصابَ الذهب ({curFull(goldNisabValue)})،
              وعليه تجب الزكاة بنسبة {(data.effectiveRate * 100).toFixed(3)}% بمبلغ <b>{curFull(data.totalZakat)}</b>.
            </>
          ) : reachedSilverNisab ? (
            <>
              لم يبلغ الوعاء نصابَ الذهب، لكنه بلغ نصابَ الفضة ({curFull(silverNisabValue)}).
              <br />
              <b>للمُزكِّي الاختيار بين أمرين:</b>
              <ol style={{ margin: "4pt 18pt 0", padding: 0 }}>
                <li><b>الأخذ بالأنفع للفقراء</b> (مذهب جمهور الفقهاء في النقود اليوم): إخراج زكاة قدرها {curFull(data.totalZakat)}.</li>
                <li><b>الأخذ بنصاب الذهب</b>: لا تجب الزكاة هذا العام لعدم بلوغ النصاب الأشد.</li>
              </ol>
              <div style={{ marginTop: "4pt", fontSize: "8.5pt", opacity: 0.95 }}>
                ⓘ المنصة توصي بالخيار الأول لما فيه من النفع لمستحقي الزكاة وبراءة الذمة.
              </div>
            </>
          ) : (
            <>
              <b>لم يبلغ الوعاء النصاب الشرعي</b> (لا الذهب ولا الفضة)، وعليه فلا تجب الزكاة في هذا العام،
              ويُستحب التصدق بما تيسّر دون لزوم.
            </>
          )}
        </div>
      </div>

      {/* ====== زكاة الأنعام ====== */}
      {data.livestock.show && (data.livestock.camels > 0 || data.livestock.cows > 0 || data.livestock.sheep > 0) && (
        <div className="print-card print-avoid-break" style={cardStyle(C)}>
          <div style={titleStyle(C)}>⑤ زكاة الأنعام (تُؤدَّى عيناً لا قيمةً)</div>
          <table className="print-table" style={tableStyle}>
            <thead><tr><th style={thStyle(C)}>النوع</th><th style={thStyle(C)}>العدد</th><th style={thStyle(C)}>الواجب الشرعي</th></tr></thead>
            <tbody>
              {data.livestock.camels > 0 && <tr><td style={tdCell()}>الإبل</td><td style={tdCell("center")}>{data.livestock.camels}</td><td style={tdCell()}>{camelZakat(data.livestock.camels)}</td></tr>}
              {data.livestock.cows > 0 && <tr><td style={tdCell()}>البقر</td><td style={tdCell("center")}>{data.livestock.cows}</td><td style={tdCell()}>{cowZakat(data.livestock.cows)}</td></tr>}
              {data.livestock.sheep > 0 && <tr><td style={tdCell()}>الغنم</td><td style={tdCell("center")}>{data.livestock.sheep}</td><td style={tdCell()}>{sheepZakat(data.livestock.sheep)}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== المقارنة السنوية ====== */}
      {prevYear > 0 && (
        <div className="print-card print-avoid-break" style={cardStyle(C)}>
          <div style={titleStyle(C)}>⑥ المقارنة السنوية</div>
          <table className="print-table" style={tableStyle}>
            <thead><tr><th style={thStyle(C)}>البيان</th><th style={thStyle(C)}>العام السابق</th><th style={thStyle(C)}>العام الحالي</th><th style={thStyle(C)}>الفرق</th><th style={thStyle(C)}>نسبة التغير</th></tr></thead>
            <tbody>
              <tr>
                <td style={tdCell()}>إجمالي الزكاة المستحقة</td>
                <td style={tdCell("num")}>{curFull(prevYear)}</td>
                <td style={tdCell("num")}>{curFull(data.totalZakat)}</td>
                <td style={{ ...tdCell("num"), color: diff >= 0 ? C.primary : C.danger, fontWeight: 700 }}>
                  {diff >= 0 ? "+" : ""}{curFull(diff)}
                </td>
                <td style={{ ...tdCell("num"), color: diff >= 0 ? C.primary : C.danger, fontWeight: 700 }}>
                  {diff >= 0 ? "+" : ""}{diffPct.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ====== الرأي المهني ====== */}
      <div className="print-card print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>⑦ الرأي المهني لمحاسب الزكاة</div>
        <div style={{
          background: C.goldLight, border: `0.6pt solid ${C.gold}`, borderRadius: "4pt",
          padding: "6pt 9pt", fontSize: "10pt", fontWeight: 700, color: C.primary, marginBottom: "6pt",
        }}>
          {OPINION_LABELS[data.opinionType]}
        </div>
        {data.accountantOpinion && (
          <div style={{ fontSize: "9.5pt", lineHeight: 1.7, whiteSpace: "pre-line", textAlign: "justify", color: C.text }}>
            {data.accountantOpinion}
          </div>
        )}
        <div style={{
          marginTop: "20pt", display: "flex", justifyContent: "space-between", gap: "30pt", fontSize: "9pt",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: `0.8pt solid ${C.primary}`, paddingTop: "3pt", textAlign: "center", color: C.primary, fontWeight: 700 }}>
              توقيع المُزكِّي
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: `0.8pt solid ${C.primary}`, paddingTop: "3pt", textAlign: "center", color: C.primary, fontWeight: 700 }}>
              توقيع وختم المحاسب
              {data.accountantName && <div style={{ fontSize: "8.5pt", color: C.soft, marginTop: "2pt", fontWeight: 500 }}>{data.accountantName}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* صفحة 2 — مصارف الزكاة الثمانية (مستقلة بفواصل مميزة) */}
      {/* ============================================================ */}
      <div className="print-page-break" />

      {/* فاصل علوي مميز */}
      <div className="print-avoid-break" style={{
        textAlign: "center", marginBottom: "8pt",
        fontSize: "10pt", color: C.goldDark, letterSpacing: "4pt", fontWeight: 700,
      }}>
        ❖ ✦ ❖ ✦ ❖
      </div>

      <div className="print-avoid-break" style={{
        background: C.gold,
        color: C.primaryDark, padding: "16pt 18pt", borderRadius: "8pt",
        marginBottom: "12pt", textAlign: "center",
        border: `1.5pt solid ${C.primary}`,
      }}>
        <div style={{
          fontFamily: "'Amiri', 'Tajawal', serif", fontSize: "20pt", fontWeight: 700,
          marginBottom: "6pt", lineHeight: 1.3,
        }}>
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
        <div style={{ fontSize: "22pt", fontWeight: 900, fontFamily: "'Tajawal', sans-serif", lineHeight: 1.2 }}>
          مصارف الزكاة الثمانية الشرعية
        </div>
        <div style={{ fontSize: "9.5pt", marginTop: "4pt", opacity: 0.9 }}>
          المُستحقّون شرعاً لأخذ الزكاة وفق نصّ القرآن الكريم
        </div>
      </div>

      <div className="print-card" style={{
        ...cardStyle(C, C.gold),
        background: C.cream,
      }}>
        <div className="print-avoid-break" style={{
          background: C.primary,
          color: "white", padding: "12pt 16pt",
          borderRadius: "6pt", textAlign: "center", fontSize: "11pt", lineHeight: 2,
          marginBottom: "12pt",
          border: `0.6pt solid ${C.gold}`,
        }}>
          <div style={{ fontSize: "9pt", color: C.goldLight, marginBottom: "4pt" }}>قال تعالى:</div>
          <div style={{ fontSize: "13pt", fontWeight: 700, color: C.goldLight, fontFamily: "'Amiri', 'Tajawal', serif", lineHeight: 1.9 }}>
            ﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ
            وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ ۖ
            فَرِيضَةً مِّنَ اللَّهِ ۗ وَاللَّهُ عَلِيمٌ حَكِيمٌ﴾
          </div>
          <div style={{ fontSize: "8.5pt", marginTop: "4pt", opacity: 0.9 }}>[سورة التوبة: 60]</div>
        </div>


        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9pt" }}>
          {ZAKAT_RECIPIENTS.map((r, i) => (
            <div key={i} className="print-avoid-break" style={{
              background: "white", border: `0.8pt solid ${C.gold}`, borderRadius: "6pt",
              padding: "9pt 11pt", display: "flex", gap: "9pt", alignItems: "flex-start",
              boxShadow: "0 1pt 3pt rgba(0,0,0,0.06)",
              borderRight: `3pt solid ${C.primary}`,
            }}>
              <div style={{
                background: C.gold,
                color: "white", fontWeight: 900, width: "24pt", height: "24pt",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12pt", flexShrink: 0,
                boxShadow: "0 1pt 2pt rgba(0,0,0,0.15)",
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: C.primary, fontSize: "10.5pt", marginBottom: "3pt" }}>
                  {r.name}
                </div>
                <div style={{ fontSize: "8.5pt", color: C.soft, lineHeight: 1.6 }}>
                  {r.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* فاصل سفلي مميز */}
      <div className="print-avoid-break" style={{
        textAlign: "center", margin: "10pt 0 6pt",
        fontSize: "9pt", color: C.goldDark, letterSpacing: "4pt",
      }}>
        ❖ ✦ ❖ ✦ ❖
      </div>

      {/* ====== التذييل القانوني + ختم الـ branding ====== */}
      <div style={{
        marginTop: "8pt", padding: "10pt 14pt", borderRadius: "6pt",
        background: `linear-gradient(180deg, ${C.deepCream}, ${C.cream})`,
        border: `0.6pt dashed ${C.border}`,
        fontSize: "8pt", color: C.soft, lineHeight: 1.65, textAlign: "justify",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "3pt", color: C.primary }}>إخلاء مسؤولية (Disclaimer):</div>
        هذا التقرير وثيقة <b>استرشادية فقهية‑محاسبية</b> تستند إلى البيانات التي أدخلها المستخدم،
        ولا يُعدّ فتوى شرعية ملزمة ولا تقريراً معتمداً من جهة رسمية حكومية. تظل المسؤولية الشرعية والمالية
        على عاتق المُزكِّي، ويُنصح بمراجعة مفتٍ معتمد للحالات الخاصة.

        <div style={{
          marginTop: "8pt", paddingTop: "6pt", borderTop: `0.6pt solid ${C.gold}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10pt", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6pt" }}>
            <img src={logoUrl} alt="" style={{ width: "26pt", height: "26pt", objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 900, color: C.primary, fontSize: "10pt", letterSpacing: "1pt" }}>{PLATFORM_NAME_AR}</div>
              <div style={{ fontSize: "7.5pt", color: C.goldDark }}>{PLATFORM_TAGLINE}</div>
            </div>
          </div>
          <div style={{ textAlign: "left", fontSize: "8pt", color: C.primary }}>
            <div>© {(issueDate ?? new Date()).getFullYear()} جميع الحقوق محفوظة</div>
            <div>رقم التقرير: <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.goldDark }}>{reportId}</span></div>
            {verifyUrl && <div style={{ fontSize: "7pt" }}>للتحقق أو إعادة الطباعة: <a href={verifyUrl} style={{ color: C.primaryLight }}>{verifyUrl}</a></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== أنماط مساعدة =====
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "9pt" };

function cardStyle(C: any, accent?: string): React.CSSProperties {
  return {
    background: "white",
    border: `0.6pt solid ${accent ?? C.border}`,
    borderRadius: "6pt",
    padding: "10pt 12pt",
    marginBottom: "9pt",
    boxShadow: "0 1pt 3pt rgba(0,0,0,0.05)",
    borderRight: accent ? `3pt solid ${accent}` : `2pt solid ${C.primary}`,
  };
}
function titleStyle(C: any): React.CSSProperties {
  return {
    fontSize: "11.5pt", fontWeight: 800, color: C.primary,
    paddingBottom: "5pt", marginBottom: "7pt",
    borderBottom: `0.8pt solid ${C.gold}`,
    fontFamily: "Amiri, Tajawal, serif",
  };
}
function thStyle(C: any): React.CSSProperties {
  return {
    border: `0.6pt solid ${C.border}`, padding: "5pt 7pt", textAlign: "right",
    background: `linear-gradient(180deg, ${C.primary}, ${C.primaryLight})`,
    color: "white", fontWeight: 700, fontSize: "9pt",
  };
}
function thLabel(C: any): React.CSSProperties {
  return {
    border: `0.6pt solid ${C.border}`, padding: "5pt 7pt", textAlign: "right",
    background: C.cream, fontWeight: 700, color: C.primary, width: "25%",
  };
}
function tdCell(kind?: "num" | "center"): React.CSSProperties {
  const base: React.CSSProperties = { border: "0.5pt solid #c9bf9a", padding: "4pt 7pt", textAlign: "right" };
  if (kind === "num") return { ...base, textAlign: "left", fontFamily: "monospace" };
  if (kind === "center") return { ...base, textAlign: "center" };
  return base;
}
