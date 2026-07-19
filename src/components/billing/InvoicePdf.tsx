import { Document, Page, Text, View, StyleSheet, Font, pdf } from "@react-pdf/renderer";
import cairoRegular from "@/assets/fonts/Cairo-Regular.ttf";
import cairoBold from "@/assets/fonts/Cairo-Bold.ttf";

Font.register({
  family: "Cairo",
  fonts: [
    { src: cairoRegular, fontWeight: 400 },
    { src: cairoBold, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

export type InvoiceAddon = { name: string; amount: number };
export type InvoiceData = {
  invoiceNumber: string;
  issuedAt: string; // ISO
  planName: string;
  billingPeriod: string; // نص عربي (سنوي/دفعة واحدة/…)
  amount: number;
  currency: string;
  addons?: InvoiceAddon[];
  renewsAt?: string | null;
  customerEmail?: string;
  sessionId?: string;
};

const C = {
  primary: "#0e3b2a",
  gold: "#c9a14a",
  border: "#d4cbb0",
  muted: "#5a6660",
  text: "#1a2622",
};
const BASE = { fontFamily: "Cairo", direction: "rtl" as const, textAlign: "right" as const };

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Cairo", fontSize: 10, color: C.text, lineHeight: 1.6 },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingBottom: 12,
    marginBottom: 18,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { ...BASE, fontSize: 20, fontWeight: 700, color: C.primary },
  brandSub: { ...BASE, fontSize: 9, color: C.muted, marginTop: 2 },
  invBox: { alignItems: "flex-start" },
  invLabel: { ...BASE, textAlign: "left", fontSize: 9, color: C.muted },
  invNum: { ...BASE, textAlign: "left", fontSize: 13, fontWeight: 700, color: C.gold },
  section: { marginBottom: 14 },
  h: { ...BASE, fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 6 },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  cell: { ...BASE, fontSize: 10 },
  cellL: { ...BASE, textAlign: "left", fontSize: 10 },
  total: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: C.primary,
  },
  totalLabel: { ...BASE, fontSize: 12, fontWeight: 700 },
  totalVal: { ...BASE, textAlign: "left", fontSize: 14, fontWeight: 700, color: C.primary },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    ...BASE,
    fontSize: 8,
    color: C.muted,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
});

function fmt(n: number, cur: string) {
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const addonsTotal = (data.addons ?? []).reduce((a, b) => a + b.amount, 0);
  const grand = data.amount + addonsTotal;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>نِصاب</Text>
            <Text style={s.brandSub}>منصّة حساب الزكاة الشرعية · nisab.app</Text>
          </View>
          <View style={s.invBox}>
            <Text style={s.invLabel}>Invoice / فاتورة</Text>
            <Text style={s.invNum}>#{data.invoiceNumber}</Text>
            <Text style={s.brandSub}>{fmtDate(data.issuedAt)}</Text>
          </View>
        </View>

        {data.customerEmail && (
          <View style={s.section}>
            <Text style={s.h}>العميل</Text>
            <Text style={s.cell}>{data.customerEmail}</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.h}>تفاصيل الاشتراك</Text>
          <View style={s.row}>
            <Text style={s.cell}>الخطة</Text>
            <Text style={s.cellL}>{data.planName}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.cell}>الفوترة</Text>
            <Text style={s.cellL}>{data.billingPeriod}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.cell}>قيمة الخطة</Text>
            <Text style={s.cellL}>{fmt(data.amount, data.currency)}</Text>
          </View>
          {data.renewsAt !== undefined && (
            <View style={s.row}>
              <Text style={s.cell}>تاريخ التجديد القادم</Text>
              <Text style={s.cellL}>{fmtDate(data.renewsAt)}</Text>
            </View>
          )}
        </View>

        {(data.addons ?? []).length > 0 && (
          <View style={s.section}>
            <Text style={s.h}>الإضافات</Text>
            {data.addons!.map((a, i) => (
              <View key={i} style={s.row}>
                <Text style={s.cell}>{a.name}</Text>
                <Text style={s.cellL}>{fmt(a.amount, data.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.total}>
          <Text style={s.totalLabel}>الإجمالي المدفوع</Text>
          <Text style={s.totalVal}>{fmt(grand, data.currency)}</Text>
        </View>

        {data.sessionId && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ ...BASE, fontSize: 8, color: C.muted }}>
              رقم عملية الدفع: {data.sessionId}
            </Text>
          </View>
        )}

        <Text style={s.footer}>
          شكراً لاشتراكك في نِصاب — للاستفسارات: support@nisab.app · هذه الفاتورة صادرة إلكترونياً
          وصالحة بدون توقيع.
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadInvoicePdf(data: InvoiceData) {
  const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nisab-invoice-${data.invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
