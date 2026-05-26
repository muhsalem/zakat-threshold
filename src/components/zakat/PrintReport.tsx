import { useEffect, useState } from "react";
import { currency as fmtCurrency, camelZakat, cowZakat, sheepZakat, ZAKAT_RECIPIENTS, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS } from "@/lib/zakat";
import logoUrl from "@/assets/zakat-logo.png";

/**
 * تقرير زكوي احترافي للطباعة (A4) — مكون من صفحتين:
 *   ص1: الترويسة + بيانات المزكي + تحديد الوعاء الزكوي + المقارنة + الرأي المهني + التوقيع
 *   ص2: مصارف الزكاة الثمانية + الإهداء + التذييل القانوني
 */

export interface PrintReportRow {
  label: string;
  gross: number;
  nisab?: number;
  eligible: boolean;
  zakat: number;
}

export interface PrintReportData {
  // بيانات المزكي
  name: string;
  profession: string;
  countryCode: string;
  currencyName: string; // اختصار
  calendarBasis: "hijri" | "gregorian";
  effectiveRate: number;

  // البنود
  rows: PrintReportRow[];
  livestock: { camels: number; cows: number; sheep: number; show: boolean };

  // الإجماليات
  monetaryGross: number;
  debts: number;
  monetaryBase: number;
  moneyNisab: number;
  totalZakat: number;
  hawlComplete: boolean | null;
  hawlDate?: string;

  // أسعار النصاب (للإيضاح)
  goldPricePerGram?: number;
  silverPricePerGram?: number;

  // المحاسب
  accountantName: string;
  accountantLicense: string;
  accountantPreamble: string;
  accountantOpinion: string;
  opinionType: "clean" | "qualified" | "adverse";

  // المقارنة
  previousYearZakat: string;
}

// ===== خرائط مساعدة للأسماء الكاملة =====
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
  return `ZK-${seed}-${ts}-${rand}`;
}

// ===== ترتيب البنود وفق المطلوب =====
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

export function PrintReport({ data }: { data: PrintReportData }) {
  const currencyLong = CURRENCY_FULL[data.countryCode] ?? data.currencyName;
  const countryLong = COUNTRY_FULL[data.countryCode] ?? data.countryCode;
  const curFull = (n: number) => fmtCurrency(n, currencyLong);

  const [reportId, setReportId] = useState<string>("ZK-PENDING");
  useEffect(() => { setReportId(generateReportId(data.name)); }, [data.name]);
  const [issueDate, setIssueDate] = useState<Date | null>(null);
  useEffect(() => { setIssueDate(new Date()); }, []);
  const issueDateAr = issueDate ? issueDate.toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }) : "";
  const issueDateIso = issueDate ? issueDate.toISOString().slice(0, 10) : "";

  const qrPayload = `ZakatReport|${reportId}|${data.name || "-"}|${data.totalZakat.toFixed(2)} ${currencyLong}|${issueDateIso}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(qrPayload)}`;

  const prevYear = parseFloat(data.previousYearZakat || "0") || 0;
  const diff = data.totalZakat - prevYear;
  const diffPct = prevYear > 0 ? (diff / prevYear) * 100 : 0;

  // فرز الصفوف وفق الترتيب المطلوب وتجاهل الصفوف الصفرية إن وُجد
  const sortedRows = [...data.rows].sort((a, b) => rowOrder(a.label) - rowOrder(b.label));

  // ألوان موضوعية
  const C = {
    primary: "#0e3b2a",
    primaryLight: "#1e6b4a",
    gold: "#c9a84c",
    goldLight: "#f3e8c4",
    cream: "#faf7ee",
    deepCream: "#f0ede0",
    border: "#bda867",
    text: "#1a1a1a",
    soft: "#4a5246",
  };

  return (
    <div id="print-report" dir="rtl" style={{ fontFamily: "Tajawal, Amiri, sans-serif", color: C.text }}>
      {/* ============================================================ */}
      {/* صفحة 1 */}
      {/* ============================================================ */}

      {/* ====== الترويسة الفاخرة ====== */}
      <div className="print-avoid-break" style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
        color: "white",
        padding: "14pt 16pt",
        borderRadius: "6pt",
        marginBottom: "10pt",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12pt",
        boxShadow: "0 2pt 6pt rgba(0,0,0,0.15)",
      }}>
        <img src={logoUrl} alt="شعار حاسبة الزكاة" style={{ width: "70pt", height: "70pt", objectFit: "contain", filter: "drop-shadow(0 1pt 2pt rgba(0,0,0,0.25))" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "13pt", color: C.goldLight, fontWeight: 700, letterSpacing: "1pt" }}>
            بسم الله الرحمن الرحيم
          </div>
          <div style={{ fontSize: "18pt", fontWeight: 900, marginTop: "2pt" }}>
            إقرار وتقرير زكوي معتمد
          </div>
          <div style={{ fontSize: "9pt", opacity: 0.85, marginTop: "1pt" }}>
            منصة حاسبة الزكاة الشاملة — وفق المعايير الشرعية الدولية
          </div>
        </div>
        <img src={qrSrc} alt="QR Verification" style={{ width: "62pt", height: "62pt", background: "white", padding: "3pt", borderRadius: "4pt" }} />
      </div>

      {/* شريط معلومات الإصدار */}
      <div className="print-avoid-break" style={{
        background: C.deepCream, border: `0.6pt solid ${C.border}`, borderRadius: "4pt",
        padding: "5pt 10pt", marginBottom: "9pt", fontSize: "8.5pt",
        display: "flex", justifyContent: "space-between", gap: "10pt", flexWrap: "wrap",
      }}>
        <span><b style={{ color: C.primary }}>رقم التقرير:</b> <span style={{ fontFamily: "monospace" }}>{reportId}</span></span>
        <span><b style={{ color: C.primary }}>تاريخ الإصدار:</b> {issueDateAr}</span>
        <span><b style={{ color: C.primary }}>التقويم:</b> {data.calendarBasis === "hijri" ? "هجري (354 يوم)" : "ميلادي (365 يوم)"}</span>
        {data.hawlDate && <span><b style={{ color: C.primary }}>تاريخ الحول:</b> {data.hawlDate}</span>}
      </div>

      {/* ====== ديباجة المحاسب (بدون عنوان "ديباجة") ====== */}
      {(data.accountantPreamble || data.accountantName) && (
        <div className="print-card print-avoid-break" style={cardStyle(C, C.gold)}>
          <div style={{
            fontSize: "10pt", lineHeight: 1.85, whiteSpace: "pre-line",
            textAlign: "justify", fontStyle: "italic", color: C.soft,
            borderRight: `3pt solid ${C.gold}`, paddingRight: "10pt",
          }}>
            {data.accountantPreamble}
          </div>
          {(data.accountantName || data.accountantLicense) && (
            <div style={{ marginTop: "7pt", fontSize: "9.5pt", display: "flex", gap: "20pt", color: C.primary }}>
              {data.accountantName && <div><b>المحاسب المعتمد:</b> {data.accountantName}</div>}
              {data.accountantLicense && <div><b>رقم القيد/الترخيص:</b> {data.accountantLicense}</div>}
            </div>
          )}
        </div>
      )}

      {/* ====== بيانات المزكي ====== */}
      <div className="print-card print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>بيانات المُزكِّي</div>
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

      {/* ====== إيضاح أنصبة الذهب والفضة ====== */}
      <div className="print-card print-avoid-break" style={{ ...cardStyle(C, C.gold), background: `linear-gradient(180deg, ${C.goldLight} 0%, #fffdf5 100%)` }}>
        <div style={titleStyle(C)}>أنصبة الذهب والفضة المرجعية</div>
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
              <td style={tdCell("num")}>{data.goldPricePerGram ? curFull(data.goldPricePerGram * GOLD_NISAB_GRAMS) : "—"}</td>
            </tr>
            <tr>
              <td style={tdCell()}><b>الفضة</b></td>
              <td style={tdCell("center")}>{SILVER_NISAB_GRAMS} جرام (200 درهم)</td>
              <td style={tdCell("num")}>{data.silverPricePerGram ? curFull(data.silverPricePerGram) : "—"}</td>
              <td style={tdCell("num")}>{data.silverPricePerGram ? curFull(data.silverPricePerGram * SILVER_NISAB_GRAMS) : "—"}</td>
            </tr>
            <tr style={{ background: C.cream }}>
              <td style={{ ...tdCell(), fontWeight: 700, color: C.primary }} colSpan={3}>نصاب المال المعتمد (الأنفع للفقراء)</td>
              <td style={{ ...tdCell("num"), fontWeight: 800, color: C.primary }}>{curFull(data.moneyNisab)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ====== تحديد الوعاء الزكوي ====== */}
      <div className="print-card print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>تحديد الوعاء الزكوي</div>
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
                <td style={{ ...tdCell("center"), color: r.eligible ? C.primaryLight : "#a33", fontWeight: 700 }}>
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
              <td style={{ ...tdCell(), fontWeight: 700, color: "#a33" }}>(−) إجمالي الديون والالتزامات المخصومة</td>
              <td style={{ ...tdCell("num"), color: "#a33" }} colSpan={3}>{curFull(data.debts)}</td>
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

      {/* ====== زكاة الأنعام (إن وُجدت) ====== */}
      {data.livestock.show && (data.livestock.camels > 0 || data.livestock.cows > 0 || data.livestock.sheep > 0) && (
        <div className="print-card print-avoid-break" style={cardStyle(C)}>
          <div style={titleStyle(C)}>زكاة الأنعام (تُؤدَّى عيناً لا قيمةً)</div>
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
          <div style={titleStyle(C)}>المقارنة السنوية</div>
          <table className="print-table" style={tableStyle}>
            <thead><tr><th style={thStyle(C)}>البيان</th><th style={thStyle(C)}>العام السابق</th><th style={thStyle(C)}>العام الحالي</th><th style={thStyle(C)}>الفرق</th><th style={thStyle(C)}>نسبة التغير</th></tr></thead>
            <tbody>
              <tr>
                <td style={tdCell()}>إجمالي الزكاة المستحقة</td>
                <td style={tdCell("num")}>{curFull(prevYear)}</td>
                <td style={tdCell("num")}>{curFull(data.totalZakat)}</td>
                <td style={{ ...tdCell("num"), color: diff >= 0 ? C.primary : "#a33", fontWeight: 700 }}>
                  {diff >= 0 ? "+" : ""}{curFull(diff)}
                </td>
                <td style={{ ...tdCell("num"), color: diff >= 0 ? C.primary : "#a33", fontWeight: 700 }}>
                  {diff >= 0 ? "+" : ""}{diffPct.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ====== الرأي المهني ====== */}
      <div className="print-card print-avoid-break" style={cardStyle(C)}>
        <div style={titleStyle(C)}>الرأي المهني لمحاسب الزكاة</div>
        <div style={{
          background: C.goldLight, border: `0.6pt solid ${C.gold}`, borderRadius: "4pt",
          padding: "6pt 9pt", fontSize: "10pt", fontWeight: 700, color: C.primary, marginBottom: "6pt",
        }}>
          {OPINION_LABELS[data.opinionType]}
        </div>
        {data.accountantOpinion && (
          <div style={{ fontSize: "10pt", lineHeight: 1.7, whiteSpace: "pre-line", textAlign: "justify", color: C.text }}>
            {data.accountantOpinion}
          </div>
        )}
        <div style={{
          marginTop: "22pt", display: "flex", justifyContent: "space-between", gap: "30pt", fontSize: "9.5pt",
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
      {/* صفحة 2 — مصارف الزكاة الثمانية */}
      {/* ============================================================ */}
      <div className="print-page-break" />

      <div className="print-avoid-break" style={{
        background: `linear-gradient(135deg, ${C.gold} 0%, #e6c673 100%)`,
        color: C.primary, padding: "12pt 16pt", borderRadius: "6pt",
        marginBottom: "10pt", textAlign: "center",
      }}>
        <div style={{ fontSize: "12pt", fontWeight: 700, marginBottom: "2pt" }}>
          بسم الله الرحمن الرحيم
        </div>
        <div style={{ fontSize: "16pt", fontWeight: 900 }}>
          مصارف الزكاة الثمانية الشرعية
        </div>
      </div>

      <div className="print-card print-avoid-break" style={{
        ...cardStyle(C, C.gold),
        background: `linear-gradient(180deg, #fffdf5 0%, ${C.cream} 100%)`,
      }}>
        <div style={{
          background: C.primary, color: "white", padding: "10pt 14pt",
          borderRadius: "4pt", textAlign: "center", fontSize: "11pt", lineHeight: 1.9,
          marginBottom: "10pt", fontFamily: "Amiri, Tajawal, serif",
        }}>
          قال تعالى:
          <div style={{ fontSize: "12pt", fontWeight: 700, marginTop: "3pt", color: C.goldLight }}>
            ﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ
            وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ ۖ
            فَرِيضَةً مِّنَ اللَّهِ ۗ وَاللَّهُ عَلِيمٌ حَكِيمٌ﴾
          </div>
          <div style={{ fontSize: "8.5pt", marginTop: "3pt", opacity: 0.9 }}>[سورة التوبة: 60]</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8pt" }}>
          {ZAKAT_RECIPIENTS.map((r, i) => (
            <div key={i} style={{
              background: "white", border: `0.8pt solid ${C.gold}`, borderRadius: "5pt",
              padding: "8pt 10pt", display: "flex", gap: "8pt", alignItems: "flex-start",
              boxShadow: "0 1pt 2pt rgba(0,0,0,0.05)",
            }}>
              <div style={{
                background: `linear-gradient(135deg, ${C.gold}, #b89a3e)`,
                color: "white", fontWeight: 900, width: "22pt", height: "22pt",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11pt", flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: C.primary, fontSize: "10pt", marginBottom: "2pt" }}>
                  {r.name}
                </div>
                <div style={{ fontSize: "8.5pt", color: C.soft, lineHeight: 1.55 }}>
                  {r.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== التذييل القانوني ====== */}
      <div style={{
        marginTop: "12pt", padding: "8pt 12pt", borderRadius: "4pt",
        background: C.deepCream, border: `0.6pt dashed ${C.border}`,
        fontSize: "8pt", color: C.soft, lineHeight: 1.6, textAlign: "justify",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "3pt", color: C.primary }}>إخلاء مسؤولية (Disclaimer):</div>
        هذا التقرير وثيقة <b>استرشادية فقهية‑محاسبية</b> تستند إلى البيانات التي أدخلها المستخدم،
        ولا يُعدّ فتوى شرعية ملزمة ولا تقريراً معتمداً من جهة رسمية حكومية. تظل المسؤولية الشرعية والمالية
        على عاتق المُزكِّي، ويُنصح بمراجعة مفتٍ معتمد للحالات الخاصة.
        <div style={{ marginTop: "4pt", textAlign: "center", fontWeight: 700, color: C.primary }}>
          © {(issueDate ?? new Date()).getFullYear()} منصة حاسبة الزكاة الشاملة — جميع الحقوق محفوظة.
          &nbsp;|&nbsp; رقم التقرير: <span style={{ fontFamily: "monospace" }}>{reportId}</span>
        </div>
      </div>
    </div>
  );
}

// ===== أنماط مساعدة =====
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" };

function cardStyle(C: any, accent?: string): React.CSSProperties {
  return {
    background: "white",
    border: `0.6pt solid ${accent ?? C.border}`,
    borderRadius: "5pt",
    padding: "10pt 12pt",
    marginBottom: "9pt",
    boxShadow: "0 1pt 3pt rgba(0,0,0,0.04)",
    borderRight: accent ? `3pt solid ${accent}` : `2pt solid ${C.primary}`,
  };
}
function titleStyle(C: any): React.CSSProperties {
  return {
    fontSize: "11.5pt", fontWeight: 800, color: C.primary,
    paddingBottom: "5pt", marginBottom: "7pt",
    borderBottom: `0.8pt solid ${C.gold}`,
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
    background: C.cream, fontWeight: 700, color: C.primary, width: "20%",
  };
}
function tdCell(kind?: "num" | "center"): React.CSSProperties {
  const base: React.CSSProperties = { border: "0.5pt solid #c9bf9a", padding: "4pt 7pt", textAlign: "right" };
  if (kind === "num") return { ...base, textAlign: "left", fontFamily: "monospace" };
  if (kind === "center") return { ...base, textAlign: "center" };
  return base;
}
