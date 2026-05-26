import { useEffect, useState } from "react";
import { currency as fmtCurrency, camelZakat, cowZakat, sheepZakat } from "@/lib/zakat";

/**
 * تقرير زكوي احترافي للطباعة (A4)
 * - يُعرض فقط أثناء الطباعة (#print-report عبر CSS)
 * - يحتوي: ترويسة + بيانات المزكي + ميزان مراجعة الزكاة + التفصيل + المقارنة + الرأي المهني + المصادر + التذييل القانوني
 */

export interface PrintReportData {
  // بيانات المزكي
  name: string;
  profession: string;
  countryCode: string;
  currencyName: string;
  calendarBasis: "hijri" | "gregorian";
  effectiveRate: number;

  // ميزان المراجعة
  rows: Array<{ label: string; gross: number; nisab?: number; eligible: boolean; zakat: number }>;
  livestock: { camels: number; cows: number; sheep: number; show: boolean };

  // الإجماليات
  monetaryGross: number;
  debts: number;
  monetaryBase: number;
  moneyNisab: number;
  totalZakat: number;
  hawlComplete: boolean | null;
  hawlDate?: string;

  // المحاسب
  accountantName: string;
  accountantLicense: string;
  accountantPreamble: string;
  accountantOpinion: string;
  opinionType: "clean" | "qualified" | "adverse";

  // المقارنة
  previousYearZakat: string;
}

const SCHOLARLY_SOURCES = [
  "المعيار الشرعي رقم (35) — هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (AAOIFI).",
  "قرارات مجمع الفقه الإسلامي الدولي بشأن زكاة الأسهم والديون والمستغلات.",
  "فتاوى وقرارات الهيئة الشرعية لبيت الزكاة الكويتي (الدليل الإرشادي لفريضة الزكاة).",
  "فتاوى دار الإفتاء المصرية ولجان الفتوى بالأزهر الشريف في معاملات الزكاة المعاصرة.",
  "كتاب فقه الزكاة — د. يوسف القرضاوي (مرجع تأصيلي).",
];

const OPINION_LABELS: Record<PrintReportData["opinionType"], string> = {
  clean: "رأي نظيف غير متحفظ — التقرير يعبّر بصدق وعدالة عن الوعاء الزكوي.",
  qualified: "رأي متحفظ — توجد بنود استرشادية تحتاج لمراجعة فقهية تخصصية.",
  adverse: "رأي معاكس — البيانات المُدخلة غير كافية أو يشوبها لبس يحول دون الجزم بالنتيجة.",
};

function generateReportId(name: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const seed = (name || "ZK").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "ZK";
  return `ZK-${seed}-${ts}-${rand}`;
}

export function PrintReport({ data }: { data: PrintReportData }) {
  const cur = (n: number) => fmtCurrency(n, data.currencyName);
  // توليد على العميل فقط لتفادي عدم تطابق SSR
  const [reportId, setReportId] = useState<string>("ZK-PENDING");
  useEffect(() => { setReportId(generateReportId(data.name)); }, [data.name]);
  const [issueDate, setIssueDate] = useState<Date | null>(null);
  useEffect(() => { setIssueDate(new Date()); }, []);
  const issueDateAr = issueDate ? issueDate.toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }) : "";
  const issueDateIso = issueDate ? issueDate.toISOString().slice(0, 10) : "";

  // QR Code يحوي معرّف التقرير وملخص النتيجة
  const qrPayload = `ZakatReport|${reportId}|${data.name || "-"}|${data.totalZakat.toFixed(2)} ${data.currencyName}|${issueDateIso}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(qrPayload)}`;

  const prevYear = parseFloat(data.previousYearZakat || "0") || 0;
  const diff = data.totalZakat - prevYear;
  const diffPct = prevYear > 0 ? (diff / prevYear) * 100 : 0;

  return (
    <div id="print-report" dir="rtl" style={{ fontFamily: "Tajawal, Amiri, sans-serif" }}>
      {/* ====== الترويسة الرئيسية ====== */}
      <div className="print-avoid-break" style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        borderBottom: "2pt solid #c9a84c", paddingBottom: "8pt", marginBottom: "10pt",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16pt", fontWeight: 900, color: "#0e3b2a" }}>
            إقرار وتقرير زكوي معتمد
          </div>
          <div style={{ fontSize: "9pt", color: "#555", marginTop: "2pt" }}>
            Zakat Declaration &amp; Calculation Report
          </div>
          <div style={{ fontSize: "9pt", color: "#555", marginTop: "6pt" }}>
            صادر عن: <b>منصة حاسبة الزكاة الشاملة</b> — وفق المعايير الشرعية الدولية
          </div>
        </div>
        <div style={{ textAlign: "left", fontSize: "8.5pt", lineHeight: 1.7 }}>
          <div><b>رقم التقرير:</b> <span style={{ fontFamily: "monospace" }}>{reportId}</span></div>
          <div><b>تاريخ الإصدار:</b> {issueDateAr}</div>
          <div><b>التقويم المعتمد:</b> {data.calendarBasis === "hijri" ? "هجري (354 يوم)" : "ميلادي (365 يوم)"}</div>
          {data.hawlDate && <div><b>تاريخ الحول:</b> {data.hawlDate}</div>}
        </div>
        <img src={qrSrc} alt="QR Verification" style={{ width: "70pt", height: "70pt", marginInlineStart: "10pt", border: "0.4pt solid #ddd" }} />
      </div>

      {/* ====== ديباجة المحاسب ====== */}
      {(data.accountantPreamble || data.accountantName) && (
        <div className="print-card print-avoid-break">
          <div className="print-card-title">ديباجة محاسب الزكاة</div>
          {data.accountantPreamble && (
            <div style={{ fontSize: "10pt", lineHeight: 1.7, whiteSpace: "pre-line", textAlign: "justify" }}>
              {data.accountantPreamble}
            </div>
          )}
          {(data.accountantName || data.accountantLicense) && (
            <div style={{ marginTop: "6pt", fontSize: "9.5pt", display: "flex", gap: "20pt" }}>
              {data.accountantName && <div><b>المحاسب المعتمد:</b> {data.accountantName}</div>}
              {data.accountantLicense && <div><b>رقم القيد/الترخيص:</b> {data.accountantLicense}</div>}
            </div>
          )}
        </div>
      )}

      {/* ====== بيانات المزكي ====== */}
      <div className="print-card print-avoid-break">
        <div className="print-card-title">بيانات المزكي</div>
        <table className="print-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={tdStyle("th")}>الاسم</td>
              <td style={tdStyle()}>{data.name || "—"}</td>
              <td style={tdStyle("th")}>المهنة / النشاط</td>
              <td style={tdStyle()}>{data.profession || "—"}</td>
            </tr>
            <tr>
              <td style={tdStyle("th")}>الدولة</td>
              <td style={tdStyle()}>{data.countryCode}</td>
              <td style={tdStyle("th")}>عملة الإقرار</td>
              <td style={tdStyle()}>{data.currencyName}</td>
            </tr>
            <tr>
              <td style={tdStyle("th")}>نسبة الزكاة المطبقة</td>
              <td style={tdStyle()}>{(data.effectiveRate * 100).toFixed(3)}%</td>
              <td style={tdStyle("th")}>حالة الحول</td>
              <td style={tdStyle()}>
                {data.hawlComplete === null ? "غير محدد" : data.hawlComplete ? "✓ مكتمل" : "⏳ لم يكتمل"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ====== ميزان مراجعة الزكاة ====== */}
      <div className="print-card print-avoid-break">
        <div className="print-card-title">ميزان مراجعة الزكاة — Trial Balance</div>
        <table className="print-table" style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>البند</th>
              <th style={thStyle}>الوعاء الإجمالي</th>
              <th style={thStyle}>النصاب المرجعي</th>
              <th style={thStyle}>بلوغ النصاب</th>
              <th style={thStyle}>الزكاة المستحقة</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                <td style={tdStyle()}>{r.label}</td>
                <td style={tdStyle("num")}>{cur(r.gross)}</td>
                <td style={tdStyle("num")}>{r.nisab !== undefined ? cur(r.nisab) : "—"}</td>
                <td style={tdStyle("center")}>{r.eligible ? "✓" : "✗"}</td>
                <td style={tdStyle("num")}>{cur(r.zakat)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...tdStyle(), fontWeight: 700 }}>إجمالي الوعاء النقدي قبل الخصم</td>
              <td style={tdStyle("num")} colSpan={3}>{cur(data.monetaryGross)}</td>
              <td style={tdStyle()}></td>
            </tr>
            <tr>
              <td style={{ ...tdStyle(), fontWeight: 700 }}>(−) إجمالي الديون والالتزامات المخصومة</td>
              <td style={tdStyle("num")} colSpan={3}>{cur(data.debts)}</td>
              <td style={tdStyle()}></td>
            </tr>
            <tr>
              <td style={{ ...tdStyle(), fontWeight: 700, background: "#f7f5ef" }}>= الوعاء النقدي الصافي</td>
              <td style={{ ...tdStyle("num"), background: "#f7f5ef", fontWeight: 700 }} colSpan={3}>{cur(data.monetaryBase)}</td>
              <td style={{ ...tdStyle("num"), background: "#0e3b2a", color: "white", fontWeight: 800 }}>
                {cur(data.totalZakat)}
              </td>
            </tr>
          </tfoot>
        </table>
        <div style={{ fontSize: "8.5pt", color: "#666", marginTop: "4pt" }}>
          نصاب المال المعتمد (الأنفع للفقراء): <b>{cur(data.moneyNisab)}</b>
        </div>
      </div>

      {/* ====== زكاة الأنعام (إن وُجدت) ====== */}
      {data.livestock.show && (data.livestock.camels > 0 || data.livestock.cows > 0 || data.livestock.sheep > 0) && (
        <div className="print-card print-avoid-break">
          <div className="print-card-title">زكاة الأنعام (تُؤدَّى عيناً لا قيمةً)</div>
          <table className="print-table" style={tableStyle}>
            <thead><tr><th style={thStyle}>النوع</th><th style={thStyle}>العدد</th><th style={thStyle}>الواجب الشرعي</th></tr></thead>
            <tbody>
              {data.livestock.camels > 0 && <tr><td style={tdStyle()}>الإبل</td><td style={tdStyle("center")}>{data.livestock.camels}</td><td style={tdStyle()}>{camelZakat(data.livestock.camels)}</td></tr>}
              {data.livestock.cows > 0 && <tr><td style={tdStyle()}>البقر</td><td style={tdStyle("center")}>{data.livestock.cows}</td><td style={tdStyle()}>{cowZakat(data.livestock.cows)}</td></tr>}
              {data.livestock.sheep > 0 && <tr><td style={tdStyle()}>الغنم</td><td style={tdStyle("center")}>{data.livestock.sheep}</td><td style={tdStyle()}>{sheepZakat(data.livestock.sheep)}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ====== المقارنة بالعام السابق ====== */}
      {prevYear > 0 && (
        <div className="print-card print-avoid-break">
          <div className="print-card-title">مقارنة سنوية</div>
          <table className="print-table" style={tableStyle}>
            <thead><tr><th style={thStyle}>البيان</th><th style={thStyle}>العام السابق</th><th style={thStyle}>العام الحالي</th><th style={thStyle}>الفرق</th><th style={thStyle}>نسبة التغير</th></tr></thead>
            <tbody>
              <tr>
                <td style={tdStyle()}>إجمالي الزكاة المستحقة</td>
                <td style={tdStyle("num")}>{cur(prevYear)}</td>
                <td style={tdStyle("num")}>{cur(data.totalZakat)}</td>
                <td style={{ ...tdStyle("num"), color: diff >= 0 ? "#0e3b2a" : "#a33" }}>
                  {diff >= 0 ? "+" : ""}{cur(diff)}
                </td>
                <td style={{ ...tdStyle("num"), color: diff >= 0 ? "#0e3b2a" : "#a33" }}>
                  {diff >= 0 ? "+" : ""}{diffPct.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ====== الرأي المهني للمحاسب ====== */}
      <div className="print-card print-avoid-break">
        <div className="print-card-title">الرأي المهني لمحاسب الزكاة</div>
        <div style={{ fontSize: "10pt", fontWeight: 700, marginBottom: "4pt", color: "#0e3b2a" }}>
          صنف الرأي: {OPINION_LABELS[data.opinionType]}
        </div>
        {data.accountantOpinion && (
          <div style={{ fontSize: "10pt", lineHeight: 1.7, whiteSpace: "pre-line", textAlign: "justify" }}>
            {data.accountantOpinion}
          </div>
        )}
        {/* مساحة التوقيع */}
        <div style={{
          marginTop: "20pt", display: "flex", justifyContent: "space-between", gap: "30pt",
          fontSize: "9.5pt",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: "0.6pt solid #333", paddingTop: "3pt", textAlign: "center" }}>
              توقيع المزكي
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: "0.6pt solid #333", paddingTop: "3pt", textAlign: "center" }}>
              توقيع وختم المحاسب
              {data.accountantName && <div style={{ fontSize: "8.5pt", color: "#555", marginTop: "2pt" }}>{data.accountantName}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ====== المصادر الفقهية ====== */}
      <div className="print-card print-avoid-break">
        <div className="print-card-title">المصادر والمراجع الفقهية المعتمدة</div>
        <ol style={{ fontSize: "9pt", lineHeight: 1.7, paddingInlineStart: "18pt", margin: 0 }}>
          {SCHOLARLY_SOURCES.map((s, i) => <li key={i} style={{ marginBottom: "2pt" }}>{s}</li>)}
        </ol>
      </div>

      {/* ====== التذييل القانوني ====== */}
      <div style={{
        marginTop: "10pt", paddingTop: "6pt", borderTop: "0.6pt dashed #999",
        fontSize: "8pt", color: "#555", lineHeight: 1.6, textAlign: "justify",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "3pt", color: "#333" }}>إخلاء مسؤولية (Disclaimer):</div>
        هذا التقرير وثيقة <b>استرشادية فقهية‑محاسبية</b> تستند إلى البيانات التي أدخلها المستخدم،
        ولا يُعدّ فتوى شرعية ملزمة ولا تقريراً معتمداً من جهة رسمية حكومية. تظل المسؤولية الشرعية والمالية
        على عاتق المزكي، ويُنصح بمراجعة عالم أو مفتٍ معتمد وهيئة الفتوى المحلية للحالات الخاصة.
        تحتفظ منصة «حاسبة الزكاة» بحقوق الملكية الفكرية للنموذج والتصميم والمعادلات الحسابية.
        <div style={{ marginTop: "4pt", textAlign: "center", fontWeight: 700 }}>
          © {(issueDate ?? new Date()).getFullYear()} منصة حاسبة الزكاة الشاملة — جميع الحقوق محفوظة.
          &nbsp;|&nbsp; رقم التقرير: <span style={{ fontFamily: "monospace" }}>{reportId}</span>
        </div>
      </div>
    </div>
  );
}

// ===== أنماط مشتركة للجداول =====
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" };
const thStyle: React.CSSProperties = {
  border: "0.6pt solid #999", padding: "5pt 7pt", textAlign: "right",
  background: "#f0ede4", color: "#1a1a1a", fontWeight: 700,
};
function tdStyle(kind?: "num" | "center" | "th"): React.CSSProperties {
  const base: React.CSSProperties = { border: "0.6pt solid #999", padding: "4pt 7pt", textAlign: "right" };
  if (kind === "num") return { ...base, textAlign: "left", fontFamily: "monospace" };
  if (kind === "center") return { ...base, textAlign: "center" };
  if (kind === "th") return { ...base, background: "#f7f5ef", fontWeight: 700, width: "20%" };
  return base;
}
