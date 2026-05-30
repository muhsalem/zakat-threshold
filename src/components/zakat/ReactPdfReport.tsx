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
import type { PrintReportData } from "./PrintReport";

// تسجيل خط Cairo لدعم العربية
Font.register({
  family: "Cairo",
  fonts: [
    { src: cairoRegular, fontWeight: 400 },
    { src: cairoBold, fontWeight: 700 },
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
    fontSize: 30,
    color: C.primary,
    fontWeight: 700,
    marginTop: 18,
  },
  tagline: {
    ...BASE_TEXT,
    textAlign: "center",
    fontSize: 11,
    color: C.goldDark,
    fontWeight: 700,
    marginTop: 6,
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
});

const PLATFORM_NAME_AR = "نِصاب";
const PLATFORM_TAGLINE = "الحاسبة الشرعية المعتمدة للزكاة";

function nowAr(): string {
  return new Date().toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  });
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

  return (
    <Document
      title={`تقرير زكاة — ${data.name || "بدون اسم"}`}
      author={PLATFORM_NAME_AR}
      language="ar"
    >
      {/* ========== صفحة 1 — الغلاف ========== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverWrap}>
          <Text style={styles.ribbon}>◆ NISAB · CERTIFIED ZAKAT CALCULATOR ◆</Text>

          <View style={styles.logoBox}>
            <Image src={logoUrl} style={styles.logo} />
          </View>

          <Text style={styles.bism}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
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
            </View>
          </View>

          <Text style={styles.disclaimer}>
            هذا التقرير أداة استرشاديّة لحساب الزكاة وفق المعايير الشرعية المعروفة، وهو مبني
            على البيانات المُدخلة من المُزكِّي. النتائج لا تُغني عن سؤال أهل العلم في الحالات
            الخاصة، ولا تُعدّ فتوى ملزمة. مَن أراد الاطمئنان فليراجع عالماً معتمداً.
          </Text>
        </View>
        <ReportFooter reportId={reportId} page={1} total={3} />
      </Page>

      {/* ========== صفحة 2 — الحسابات ========== */}
      <Page size="A4" style={styles.page}>
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

        <ReportFooter reportId={reportId} page={2} total={3} />
      </Page>

      {/* ========== صفحة 3 — مصارف الزكاة ========== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>مصارف الزكاة الثمانية</Text>
        <Text style={[styles.text, { color: C.muted, marginBottom: 8 }]}>
          قال تعالى: «إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ
          عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي
          سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ» — سورة التوبة (60).
        </Text>

        {ZAKAT_RECIPIENTS.map((r, i) => (
          <View key={i} style={styles.recipient} wrap={false}>
            <Text style={styles.recipientTitle}>{`${i + 1}. ${r.title}`}</Text>
            <Text style={styles.recipientDesc}>{r.desc}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>
          هذا التقرير صالح لمدة سنة قمرية (354 يوماً) من تاريخ إصداره. للتحقق من صحة التقرير
          يُرجى الرجوع إلى منصة «نِصاب». لا يُعتبر هذا التقرير فتوى شرعية ملزمة وإنما أداة
          مساعدة في تقدير مقدار الزكاة بناءً على البيانات المُدخَلة.
        </Text>

        <ReportFooter reportId={reportId} page={3} total={3} />
      </Page>
    </Document>
  );
}

/**
 * توليد ملف PDF عبر @react-pdf/renderer وتنزيله للمستخدم.
 * يدعم العربية بشكل كامل عبر تسجيل خط Cairo و direction:rtl.
 */
export async function downloadZakatPdf(data: PrintReportData, filename = "zakat-report.pdf") {
  const blob = await pdf(<ZakatPdfDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
