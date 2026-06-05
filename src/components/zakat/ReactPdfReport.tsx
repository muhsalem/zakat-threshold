import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
  Image,
} from "@react-pdf/renderer";
import cairoRegular from "@/assets/fonts/Cairo-Regular.ttf";
import cairoBold from "@/assets/fonts/Cairo-Bold.ttf";
import logoUrl from "@/assets/zakat-logo.png";
import { currency as fmtCurrency, ZAKAT_RECIPIENTS, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS } from "@/lib/zakat";
import { SHARIA_REFERENCES, RULING_LEVEL_LABELS } from "@/lib/shariaReferences";
import type { PrintReportData } from "./PrintReport";

// تسجيل خط Cairo لدعم العربية
Font.register({
  family: "Cairo",
  fonts: [
    { src: cairoRegular, fontWeight: 400, fontStyle: "normal" },
    { src: cairoRegular, fontWeight: 400, fontStyle: "italic" },
    { src: cairoBold, fontWeight: 700, fontStyle: "normal" },
    { src: cairoBold, fontWeight: 700, fontStyle: "italic" },
  ],
});
// منع كسر الكلمات العربية
Font.registerHyphenationCallback((word) => [word]);

const C = {
  primary: "#0e3b2a",
  primaryLight: "#2d6a52",
  gold: "#c9a14a",
  goldDark: "#8a6a1a",
  cream: "#f8f5ec",
  text: "#1a2622",
  muted: "#5a6660",
  border: "#d4cbb0",
  bgAlt: "#f3efe2",
};

const BASE_TEXT = {
  fontFamily: "Cairo",
  direction: "rtl" as const,
  textAlign: "right" as const,
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Cairo",
    fontSize: 10,
    color: C.text,
    lineHeight: 1.6,
  },
  text: { ...BASE_TEXT, fontSize: 10 },
  small: { ...BASE_TEXT, fontSize: 8, color: C.muted },
  // الغلاف
  coverWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: C.cream,
    borderRadius: 8,
    padding: 24,
    border: `1pt solid ${C.gold}`,
  },
  ribbon: {
    ...BASE_TEXT,
    textAlign: "center",
    fontSize: 9,
    color: C.goldDark,
    letterSpacing: 2,
    fontWeight: 700,
    marginBottom: 12,
  },
  logoBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "white",
    border: `2pt solid ${C.gold}`,
    padding: 8,
    marginVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 120, height: 120, objectFit: "contain" },
  bism: {
    ...BASE_TEXT,
    textAlign: "center",
    fontSize: 22,
    color: C.primary,
    marginTop: 10,
    fontWeight: 700,
  },
  brand: {
    ...BASE_TEXT,
    textAlign: "center",
    fontSize: 28,
    color: C.primary,
    fontWeight: 700,
    marginTop: 22,
    lineHeight: 1.5,
    paddingHorizontal: 8,
  },
  tagline: {
    ...BASE_TEXT,
    textAlign: "center",
    fontSize: 11,
    color: C.goldDark,
    fontWeight: 700,
    marginTop: 14,
    lineHeight: 1.5,
  },
  // الأقسام
  h1: {
    ...BASE_TEXT,
    fontSize: 14,
    fontWeight: 700,
    color: C.primary,
    marginTop: 14,
    marginBottom: 8,
    borderBottom: `1pt solid ${C.gold}`,
    paddingBottom: 4,
  },
  h2: {
    ...BASE_TEXT,
    fontSize: 11,
    fontWeight: 700,
    color: C.primaryLight,
    marginTop: 8,
    marginBottom: 4,
  },
  // البطاقات
  card: {
    backgroundColor: "white",
    border: `1pt solid ${C.border}`,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  cardAccent: {
    backgroundColor: C.bgAlt,
    border: `1pt solid ${C.gold}`,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  // الجدول
  table: {
    width: "100%",
    border: `1pt solid ${C.border}`,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  tr: { flexDirection: "row-reverse", borderBottom: `0.5pt solid ${C.border}` },
  trAlt: { backgroundColor: C.bgAlt },
  th: {
    ...BASE_TEXT,
    fontSize: 9,
    fontWeight: 700,
    color: "white",
    backgroundColor: C.primary,
    padding: 6,
    flex: 1,
  },
  td: { ...BASE_TEXT, fontSize: 9, padding: 6, flex: 1 },
  tdNum: {
    ...BASE_TEXT,
    fontSize: 9,
    padding: 6,
    flex: 1,
    textAlign: "left",
    fontWeight: 700,
  },
  // النتيجة الرئيسية
  hero: {
    backgroundColor: C.primary,
    borderRadius: 6,
    padding: 16,
    alignItems: "center",
    marginVertical: 10,
  },
  heroLabel: {
    ...BASE_TEXT,
    textAlign: "center",
    color: "#cfe3d8",
    fontSize: 10,
    fontWeight: 700,
  },
  heroValue: {
    ...BASE_TEXT,
    textAlign: "center",
    color: C.gold,
    fontSize: 26,
    fontWeight: 700,
    marginVertical: 4,
  },
  heroRate: {
    ...BASE_TEXT,
    textAlign: "center",
    color: "white",
    fontSize: 11,
    fontWeight: 700,
  },
  // الصف الزوجي
  row2: { flexDirection: "row-reverse", gap: 8, marginBottom: 6 },
  col: { flex: 1 },
  kvLabel: { ...BASE_TEXT, fontSize: 8, color: C.muted, marginBottom: 2 },
  kvValue: { ...BASE_TEXT, fontSize: 10, fontWeight: 700, color: C.text },
  // التذييل
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    borderTop: `0.5pt solid ${C.border}`,
    paddingTop: 6,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  footerText: { ...BASE_TEXT, fontSize: 8, color: C.muted },
  // الإخلاء
  disclaimer: {
    ...BASE_TEXT,
    fontSize: 8,
    color: C.muted,
    backgroundColor: C.bgAlt,
    padding: 8,
    borderRadius: 4,
    border: `0.5pt solid ${C.border}`,
    marginTop: 8,
    lineHeight: 1.7,
  },
  recipient: {
    backgroundColor: "white",
    border: `1pt solid ${C.border}`,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  recipientTitle: { ...BASE_TEXT, fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 2 },
  recipientDesc: { ...BASE_TEXT, fontSize: 9, color: C.text, lineHeight: 1.6 },
  // العلامة المائية — صغيرة وفي الذيل لتفادي تداخلها مع المحتوى
  watermark: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: C.goldDark,
    opacity: 0.55,
    fontWeight: 700,
    letterSpacing: 3,
    fontFamily: "Cairo",
  },
  // بصمة التحقق
  hashBox: {
    backgroundColor: C.bgAlt,
    border: `0.5pt dashed ${C.goldDark}`,
    borderRadius: 4,
    padding: 6,
    marginTop: 6,
  },
  hashText: {
    fontFamily: "Courier",
    fontSize: 7,
    color: C.goldDark,
    textAlign: "center",
    letterSpacing: 1,
  },
  // مرجع شرعي
  refRow: {
    flexDirection: "row-reverse",
    borderBottom: `0.5pt solid ${C.border}`,
    padding: 6,
    gap: 6,
  },
  refTopic: { ...BASE_TEXT, fontSize: 9, fontWeight: 700, color: C.primary, flex: 1.2 },
  refRuling: { ...BASE_TEXT, fontSize: 8, color: C.text, flex: 2 },
  refSource: { ...BASE_TEXT, fontSize: 7, color: C.muted, flex: 1.5 },
  refBadge: {
    ...BASE_TEXT,
    fontSize: 7,
    color: "white",
    backgroundColor: C.goldDark,
    padding: 3,
    borderRadius: 3,
    textAlign: "center",
    flex: 0.6,
    fontWeight: 700,
  },
});

// بصمة بسيطة (FNV-1a 32-bit hex) — للتحقق من سلامة بيانات التقرير
function fingerprint(data: PrintReportData): string {
  const seed = [
    data.name, data.profession, data.countryCode, data.currencyName,
    data.calendarBasis, data.effectiveRate.toFixed(6),
    data.monetaryGross.toFixed(2), data.debts.toFixed(2),
    data.monetaryBase.toFixed(2), data.totalZakat.toFixed(2),
    data.goldPricePerGram?.toFixed(4) ?? "", data.silverPricePerGram?.toFixed(4) ?? "",
    ...data.rows.map((r) => `${r.label}|${r.gross.toFixed(2)}|${r.zakat.toFixed(2)}`),
  ].join("§");
  let h1 = 0x811c9dc5, h2 = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

const PLATFORM_NAME_AR = "نِصاب";
const PLATFORM_TAGLINE = "الحاسبة الشرعية المعتمدة للزكاة";

function nowAr(): string {
  return new Date().toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });
}

/**
 * يستبدل كلمة "الله" بحرف اللگاتشر U+FDF2 ﷲ لتفادي خطأ تكرار الحروف
 * في @react-pdf/renderer مع خط Cairo (lam-lam-ha shaping bug).
 */
function arSafe(text: string): string {
  return text.replace(/الله/g, "\uFDF2");
}

function makeReportId(name: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const seed = (name || "anon").replace(/\s+/g, "").slice(0, 4).toUpperCase();
  return `NSB-${seed}-${stamp}`;
}

function ReportFooter({ reportId, page, total }: { reportId: string; page: number; total: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{`${PLATFORM_NAME_AR} — ${PLATFORM_TAGLINE}`}</Text>
      <Text style={styles.footerText}>{`${reportId}  ·  صفحة ${page} من ${total}`}</Text>
    </View>
  );
}

export function ZakatPdfDocument({ data }: { data: PrintReportData }) {
  const reportId = makeReportId(data.name);
  const issued = nowAr();
  const cur = data.currencyName || "";
  const eligibleRows = data.rows.filter((r) => r.gross > 0 || r.zakat > 0);
  const monetaryZakat = data.totalZakat;
  const integrity = fingerprint(data);
  const hasAudit = !!(data.auditEntries && data.auditEntries.length > 0);
  const TOTAL_PAGES = hasAudit ? 5 : 4;
  const isSaudi = data.countryCode === "SA";

  return (
    <Document
      title={`تقرير زكاة — ${data.name || "بدون اسم"}`}
      author={PLATFORM_NAME_AR}
      language="ar"
    >
      {/* ========== صفحة 1 — الغلاف ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>استرشادي · INDICATIVE</Text>
        <View style={styles.coverWrap}>
          <Text style={styles.ribbon}>◆ NISAB · CERTIFIED ZAKAT CALCULATOR ◆</Text>


          <View style={styles.logoBox}>
            <Image src={logoUrl} style={styles.logo} />
          </View>

          <Text style={styles.bism}>بِسْمِ {"\uFDF2"}ِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          <Text style={styles.brand}>{PLATFORM_NAME_AR}</Text>
          <Text style={styles.tagline}>{PLATFORM_TAGLINE}</Text>

          <View style={{ marginTop: 24, alignItems: "center" }}>
            <Text style={[styles.text, { fontSize: 14, fontWeight: 700, color: C.primary, textAlign: "center" }]}>
              إقرار الزكاة الشرعي
            </Text>
            <Text style={[styles.small, { textAlign: "center", marginTop: 4 }]}>
              {`صادر بتاريخ: ${issued}`}
            </Text>
          </View>

          <View style={[styles.cardAccent, { marginTop: 20, width: "85%" }]}>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>المُزكِّي</Text>
                <Text style={styles.kvValue}>{data.name || "—"}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>المهنة / النشاط</Text>
                <Text style={styles.kvValue}>{data.profession || "—"}</Text>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>الدولة</Text>
                <Text style={styles.kvValue}>{data.countryCode}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>العملة</Text>
                <Text style={styles.kvValue}>{cur || "—"}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>التقويم</Text>
                <Text style={styles.kvValue}>
                  {data.calendarBasis === "hijri" ? "هجري (354 يوماً)" : "ميلادي (365 يوماً)"}
                </Text>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>رقم التقرير</Text>
                <Text style={[styles.kvValue, { color: C.goldDark }]}>{reportId}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.kvLabel}>بصمة التحقق (Integrity)</Text>
                <Text style={[styles.kvValue, { color: C.goldDark, fontSize: 9, fontFamily: "Courier" }]}>
                  {integrity}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            هذا التقرير أداة استرشاديّة لحساب الزكاة وفق المعايير الشرعية المعروفة (AAOIFI رقم 35
            وقرارات مجمع الفقه الإسلامي الدولي)، وهو مبني على البيانات المُدخلة من المُزكِّي.
            النتائج لا تُغني عن سؤال أهل العلم في الحالات الخاصة، ولا تُعدّ فتوى ملزمة. مَن أراد
            الاطمئنان فليراجع عالماً معتمداً. للتحقق من سلامة التقرير قارِن بصمة التحقق أعلاه برمز
            QR (إن وُجد) عبر منصة «نِصاب».
          </Text>
        </View>
        <ReportFooter reportId={reportId} page={1} total={TOTAL_PAGES} />
      </Page>


      {/* ========== صفحة 2 — الحسابات ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>استرشادي · INDICATIVE</Text>
        <Text style={styles.h1}>ملخص النتيجة</Text>


        <View style={styles.hero}>
          <Text style={styles.heroLabel}>إجمالي الزكاة الواجبة</Text>
          <Text style={styles.heroValue}>{fmtCurrency(data.totalZakat, cur)}</Text>
          <Text style={styles.heroRate}>
            {`نسبة الزكاة المطبَّقة: ${(data.effectiveRate * 100).toFixed(3)}%`}
          </Text>
        </View>

        <View style={styles.row2}>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.kvLabel}>نصاب الذهب (٨٥ جم)</Text>
            <Text style={styles.kvValue}>
              {fmtCurrency((data.goldPricePerGram || 0) * GOLD_NISAB_GRAMS, cur)}
            </Text>
            <Text style={styles.small}>
              {`سعر الجرام (24 ق): ${fmtCurrency(data.goldPricePerGram || 0, cur)}`}
            </Text>
          </View>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.kvLabel}>نصاب الفضة (٥٩٥ جم)</Text>
            <Text style={styles.kvValue}>
              {fmtCurrency((data.silverPricePerGram || 0) * SILVER_NISAB_GRAMS, cur)}
            </Text>
            <Text style={styles.small}>
              {`سعر الجرام: ${fmtCurrency(data.silverPricePerGram || 0, cur)}`}
            </Text>
          </View>
        </View>

        <Text style={styles.h2}>تفصيل الأوعية الزكوية</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, { flex: 2 }]}>الوعاء الزكوي</Text>
            <Text style={styles.th}>الإجمالي</Text>
            <Text style={styles.th}>النصاب</Text>
            <Text style={styles.th}>بلغ النصاب؟</Text>
            <Text style={styles.th}>الزكاة</Text>
          </View>
          {eligibleRows.map((r, i) => (
            <View
              key={i}
              style={[styles.tr, ...(i % 2 === 1 ? [styles.trAlt] : [])]}
              wrap={false}
            >
              <Text style={[styles.td, { flex: 2 }]}>{r.label}</Text>
              <Text style={styles.tdNum}>{fmtCurrency(r.gross, cur)}</Text>
              <Text style={styles.tdNum}>{r.nisab != null ? fmtCurrency(r.nisab, cur) : "—"}</Text>
              <Text style={styles.td}>{r.eligible ? "نعم" : "لا"}</Text>
              <Text style={styles.tdNum}>{fmtCurrency(r.zakat, cur)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>الوعاء النقدي والديون</Text>
        <View style={styles.card}>
          <View style={styles.row2}>
            <View style={styles.col}>
              <Text style={styles.kvLabel}>إجمالي الأصول النقدية</Text>
              <Text style={styles.kvValue}>{fmtCurrency(data.monetaryGross, cur)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.kvLabel}>الديون المخصومة</Text>
              <Text style={styles.kvValue}>{fmtCurrency(data.debts, cur)}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.kvLabel}>الوعاء الصافي</Text>
              <Text style={[styles.kvValue, { color: C.primary }]}>
                {fmtCurrency(data.monetaryBase, cur)}
              </Text>
            </View>
          </View>
        </View>

        {data.hawlComplete != null && (
          <View style={styles.card}>
            <Text style={styles.kvLabel}>اكتمال الحَوْل</Text>
            <Text style={styles.kvValue}>
              {data.hawlComplete ? "نعم — اكتمل الحَوْل" : "لم يكتمل الحَوْل بعد"}
            </Text>
            {data.hawlDate && (
              <Text style={styles.small}>{`تاريخ بداية الحَوْل: ${data.hawlDate}`}</Text>
            )}
          </View>
        )}

        {data.accountantOpinion && (
          <>
            <Text style={styles.h2}>الرأي الشرعي</Text>
            <View style={styles.card}>
              {data.accountantName && (
                <Text style={[styles.text, { fontWeight: 700, marginBottom: 4 }]}>
                  {`الباحث الشرعي: ${data.accountantName}`}
                  {data.accountantLicense ? `  ·  ${data.accountantLicense}` : ""}
                </Text>
              )}
              {data.accountantPreamble && (
                <Text style={[styles.text, { marginBottom: 4 }]}>{data.accountantPreamble}</Text>
              )}
              <Text style={styles.text}>{data.accountantOpinion}</Text>
            </View>
          </>
        )}

        <ReportFooter reportId={reportId} page={2} total={TOTAL_PAGES} />
      </Page>

      {/* ========== صفحة 3 — مصارف الزكاة ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>استرشادي · INDICATIVE</Text>
        <Text style={styles.h1}>مصارف الزكاة الثمانية</Text>
        <Text style={[styles.text, { color: C.muted, marginBottom: 8 }]}>
          قال تعالى: «إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ
          عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي
          سَبِيلِ {"\uFDF2"}ِ وَابْنِ السَّبِيلِ» — سورة التوبة (60).
        </Text>

        {ZAKAT_RECIPIENTS.map((r, i) => (
          <View key={i} style={styles.recipient} wrap={false}>
            <Text style={styles.recipientTitle}>{`${i + 1}. ${arSafe(r.name)}`}</Text>
            <Text style={styles.recipientDesc}>{arSafe(r.description)}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>
          هذا التقرير صالح لمدة سنة قمرية (354 يوماً) من تاريخ إصداره. للتحقق من صحة التقرير
          يُرجى الرجوع إلى منصة «نِصاب». لا يُعتبر هذا التقرير فتوى شرعية ملزمة وإنما أداة
          مساعدة في تقدير مقدار الزكاة بناءً على البيانات المُدخَلة.
        </Text>

        <ReportFooter reportId={reportId} page={3} total={TOTAL_PAGES} />
      </Page>

      {/* ========== صفحة 4 — المراجع والتدقيق الشرعي ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>استرشادي · INDICATIVE</Text>
        <Text style={styles.h1}>المراجع والتدقيق الشرعي (Sharia Audit Trail)</Text>
        <Text style={[styles.text, { color: C.muted, marginBottom: 6 }]}>
          فيما يلي قائمة المراجع الشرعية المعتمدة في كل حكم طُبِّق ضمن هذا التقرير. تستند الحاسبة
          إلى المعيار الشرعي AAOIFI رقم (35) للزكاة، وقرارات مجمع الفقه الإسلامي الدولي بجدة،
          وقرارات المجمع الفقهي الإسلامي بمكة المكرمة، والندوات المعاصرة لقضايا الزكاة.
        </Text>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, { flex: 1.2 }]}>الموضوع</Text>
            <Text style={[styles.th, { flex: 2 }]}>الحكم المُطبَّق</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>المرجع</Text>
            <Text style={[styles.th, { flex: 0.6 }]}>الدرجة</Text>
          </View>
          {SHARIA_REFERENCES.map((r, i) => (
            <View key={i} style={[styles.refRow, ...(i % 2 === 1 ? [styles.trAlt] : [])]} wrap={false}>
              <Text style={styles.refTopic}>{r.topic}</Text>
              <Text style={styles.refRuling}>{r.ruling}</Text>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.refSource}>{r.source}</Text>
                <Text style={[styles.refSource, { fontSize: 6, fontStyle: "italic" }]}>{r.citation}</Text>
              </View>
              <Text style={styles.refBadge}>{RULING_LEVEL_LABELS[r.level]}</Text>
            </View>
          ))}
        </View>

        {isSaudi && (
          <View style={[styles.cardAccent, { marginTop: 10 }]} wrap={false}>
            <Text style={[styles.h2, { marginTop: 0 }]}>ملاحظة ضريبية — المملكة العربية السعودية</Text>
            <Text style={styles.text}>
              يُرجى تقديم إقرار الزكاة عبر بوابة هيئة الزكاة والضريبة والجمارك (ZATCA)
              خلال 120 يوماً من نهاية السنة المالية للمنشأة، طبقاً للائحة جباية الزكاة
              الصادرة بقرار مجلس الوزراء رقم (61) لعام 1442هـ. هذا التقرير لا يُعدّ بديلاً
              عن الإقرار الرسمي لدى ZATCA.
            </Text>
            {data.zatcaQrDataUrl && (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginTop: 8 }}>
                <Image src={data.zatcaQrDataUrl} style={{ width: 80, height: 80 }} />
                <Text style={[styles.small, { flex: 1 }]}>
                  رمز QR متوافق مع المرحلة الأولى من ZATCA (TLV-Base64) — يحتوي على اسم المنصة،
                  المعرّف الضريبي، التاريخ، وإجمالي الزكاة.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.hashBox} wrap={false}>
          <Text style={[styles.small, { textAlign: "center", marginBottom: 2, color: C.goldDark, fontWeight: 700 }]}>
            بصمة التحقق الرقمية — Report Integrity Fingerprint
          </Text>
          <Text style={styles.hashText}>{integrity}</Text>
          <Text style={[styles.small, { textAlign: "center", marginTop: 4 }]}>
            رقم التقرير: {reportId}  ·  {issued}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          إعداد: منصة «نِصاب» للحوكمة الشرعية للزكاة. جميع المراجع المستخدمة في الحاسبة قابلة
          للمراجعة على المنصة. الدرجات: «إجماع» = إجماع الفقهاء، «قول الجمهور» = رأي ثلاثة من
          المذاهب الأربعة، «قرار مجمعي» = قرار من مجمع فقهي معتبر، «اجتهاد معاصر» = اجتهاد
          العلماء المعاصرين في النوازل.
        </Text>

        <ReportFooter reportId={reportId} page={4} total={TOTAL_PAGES} />
      </Page>

      {/* ========== صفحة 5 — ملحق سجل المراجعة والتدقيق ========== */}
      {hasAudit && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.watermark} fixed>استرشادي · INDICATIVE</Text>
          <Text style={styles.h1}>ملحق سجل المراجعة والتدقيق</Text>
          <Text style={[styles.text, { color: C.muted, marginBottom: 8 }]}>
            سلسلة العمليات الموثقة لهذا الحساب، تتضمن نوع العملية، التاريخ، بصمة التوثيق الفريدة،
            والمراجع الشرعية المعتمدة. تُستخدَم للتدقيق والمراجعة الداخلية.
          </Text>

          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={[styles.th, { flex: 0.4 }]}>#</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>التاريخ</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>نوع العملية</Text>
              <Text style={[styles.th, { flex: 1.6 }]}>بصمة التوثيق</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>المراجع الشرعية</Text>
            </View>
            {data.auditEntries!.map((e, i) => (
              <View key={e.id} style={[styles.tr, ...(i % 2 === 1 ? [styles.trAlt] : [])]} wrap={false}>
                <Text style={[styles.td, { flex: 0.4, textAlign: "center" }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: 1.4 }]}>
                  {(() => { try { return new Date(e.created_at).toLocaleString("ar-EG"); } catch { return e.created_at; } })()}
                </Text>
                <Text style={[styles.td, { flex: 1.2 }]}>
                  {e.action === "create_zakat_record" ? "إنشاء سجل زكاة" : e.action}
                </Text>
                <Text style={[styles.td, { flex: 1.6, fontFamily: "Courier", fontSize: 7, color: C.goldDark }]}>
                  {e.fingerprint || "—"}
                </Text>
                <Text style={[styles.td, { flex: 1.4, fontSize: 8 }]}>
                  {e.sharia_refs && e.sharia_refs.length > 0 ? e.sharia_refs.join("، ") : "—"}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.disclaimer}>
            يُسجَّل في هذا الملحق كل حساب أو حفظ ببصمة فريدة (SHA‑256) مع المراجع الشرعية
            المعتمدة (AAOIFI رقم 35، قرارات مجمع الفقه الإسلامي الدولي) لضمان الشفافية
            وإمكانية المراجعة لاحقاً. عدد العمليات المُسجَّلة: {data.auditEntries!.length}.
          </Text>

          <ReportFooter reportId={reportId} page={5} total={TOTAL_PAGES} />
        </Page>
      )}
    </Document>
  );
}


/**
 * توليد ملف PDF عبر @react-pdf/renderer وتنزيله للمستخدم.
 * يدعم العربية بشكل كامل عبر تسجيل خط Cairo و direction:rtl.
 */
export async function downloadZakatPdf(data: PrintReportData, filename = "zakat-report.pdf") {
  // توليد رمز QR ZATCA للسعودية تلقائيًا
  let enriched = data;
  if (data.countryCode === "SA" && !data.zatcaQrDataUrl) {
    try {
      const { buildZatcaTlvQr } = await import("@/lib/zatcaTlv");
      const QRCode = (await import("qrcode")).default;
      const tlv = buildZatcaTlvQr({
        sellerName: "منصة نِصاب",
        vatNumber: "NISAB-PLATFORM",
        timestampIso: new Date().toISOString(),
        invoiceTotal: data.totalZakat,
        vatTotal: 0,
      });
      const qrDataUrl = await QRCode.toDataURL(tlv, { margin: 1, width: 240 });
      enriched = { ...data, zatcaQrDataUrl: qrDataUrl };
    } catch (e) { console.warn("ZATCA QR generation failed", e); }
  }
  const blob = await pdf(<ZakatPdfDocument data={enriched} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
