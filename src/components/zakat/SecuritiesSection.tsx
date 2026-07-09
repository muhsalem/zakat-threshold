import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Info, ShieldCheck, AlertTriangle } from "lucide-react";
import { currency as fmtCurrency, num } from "@/lib/zakat";
import { MarketQuoteButton } from "@/components/zakat/MarketQuoteButton";

type SecurityKind =
  | "stock_trade" // أسهم متاجرة
  | "stock_invest" // أسهم استثمار طويل الأجل
  | "sukuk" // صكوك إسلامية
  | "bond" // سندات (ربوية)
  | "mutual_islamic" // صندوق استثمار إسلامي
  | "mutual_conv" // صندوق استثمار تقليدي
  | "etf" // صندوق متداول ETF
  | "takaful" // وثيقة تأمين تكافلي (إسلامي)
  | "insurance_conv"; // وثيقة تأمين تقليدي (تجاري)

const KIND_LABEL: Record<SecurityKind, string> = {
  stock_trade: "سهم — للمتاجرة (نية البيع)",
  stock_invest: "سهم — استثمار طويل الأجل",
  sukuk: "صكوك إسلامية",
  bond: "سندات تقليدية (ربوية)",
  mutual_islamic: "صندوق استثمار إسلامي",
  mutual_conv: "صندوق استثمار تقليدي",
  etf: "صندوق متداول ETF",
  takaful: "وثيقة تأمين تكافلي — قيمة استرداد",
  insurance_conv: "وثيقة تأمين تقليدي — الأصل المُسدَّد",
};

interface Row {
  id: number;
  kind: SecurityKind;
  company: string; // اسم الشركة / المُصدِر / الصندوق
  ticker: string; // رمز السهم
  purchaseDate: string;
  qty: string; // الكمية
  price: string; // سعر الوحدة الحالي
  shariaCompliant: "yes" | "no" | "unknown"; // مدرج في مؤشر شريعة؟
  shariaIndex: string; // اسم المؤشر (S&P Sharia / TASI Sharia / EGX-S&P ESG ...)
  purifyPct: string; // نسبة التطهير %
  zakatableAssetsPct: string; // للأسهم الاستثمارية: نسبة الموجودات الزكوية من قيمة السهم
  audited: boolean; // تدقيق شرعي معتمد؟
  auditor: string; // اسم الجهة المدقّقة (هيئة شرعية)
  notes: string;
}

const newRow = (id: number, kind: SecurityKind = "stock_trade"): Row => ({
  id,
  kind,
  company: "",
  ticker: "",
  purchaseDate: "",
  qty: "",
  price: "",
  shariaCompliant: "unknown",
  shariaIndex: "",
  purifyPct: "",
  zakatableAssetsPct: "",
  audited: false,
  auditor: "",
  notes: "",
});

function rowZakatable(r: Row): { mv: number; zakatable: number; purify: number } {
  const mv = num(r.qty) * num(r.price);
  if (!mv) return { mv: 0, zakatable: 0, purify: 0 };
  const purify = mv * (num(r.purifyPct) / 100);
  let base = mv;
  switch (r.kind) {
    case "stock_trade":
    case "etf":
    case "mutual_islamic":
      base = mv;
      break;
    case "stock_invest": {
      const pct = num(r.zakatableAssetsPct);
      base = pct > 0 ? mv * (pct / 100) : mv * 0.3; // افتراض تحفُّظي
      break;
    }
    case "sukuk":
      base = mv;
      break; // الصكوك تُزكَّى كأصل
    case "bond":
      // السندات الربوية: الأصل فقط — يدخل المستخدم سعر الشراء كأصل
      base = num(r.qty) * num(r.price);
      break;
    case "mutual_conv":
      base = Math.max(0, mv - purify);
      break;
    case "takaful":
      // وثيقة تكافل: قيمة الاسترداد (الرصيد الادخاري) تُزكَّى بالكامل
      base = mv;
      break;
    case "insurance_conv":
      // تأمين تقليدي: الأصل المُسدَّد فقط دون أرباح الفوائد (تُصرف للخير)
      base = mv;
      break;
  }
  return { mv, zakatable: Math.max(0, base - (r.kind === "mutual_conv" ? 0 : purify)), purify };
}

export function SecuritiesSection({
  currencyName,
  onTotalChange,
}: {
  currencyName: string;
  onTotalChange: (zakatable: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([newRow(1)]);
  const [globalAudit, setGlobalAudit] = useState(false);

  const add = (kind: SecurityKind = "stock_trade") =>
    setRows((r) => [...r, newRow(Date.now(), kind)]);
  const remove = (id: number) => setRows((r) => r.filter((x) => x.id !== id));
  const update = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const totals = useMemo(() => {
    let mv = 0,
      zakatable = 0,
      purify = 0;
    const byKind: Record<string, number> = {};
    for (const r of rows) {
      const t = rowZakatable(r);
      mv += t.mv;
      zakatable += t.zakatable;
      purify += t.purify;
      byKind[r.kind] = (byKind[r.kind] ?? 0) + t.zakatable;
    }
    return { mv, zakatable, purify, byKind };
  }, [rows]);

  useEffect(() => {
    onTotalChange(totals.zakatable);
  }, [totals.zakatable, onTotalChange]);

  const cur = (n: number) => fmtCurrency(n, currencyName);

  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <b>أسهم المتاجرة</b>: تُزكَّى بكامل القيمة السوقية × 2.5%. <br />
          <b>أسهم الاستثمار طويل الأجل</b>: تُزكَّى حصة الموجودات الزكوية للشركة (نقد + ذمم + مخزون)
          — أدرج نسبتها أو سيُستخدم تقدير 30% كتحفُّظ. <br />
          <b>السندات الربوية</b>: يُزكَّى الأصل فقط وتُصرف الفوائد في وجوه الخير دون نية الأجر.{" "}
          <br />
          <b>الصكوك الإسلامية</b>: تُزكَّى كأصل استثماري. <br />
          <b>صناديق الاستثمار</b>: الإسلامية تُزكَّى بالكامل، والتقليدية يُخصم منها{" "}
          <b>نسبة التطهير</b> أولًا. <br />
          <b>وثائق التأمين</b>: <i>التكافلي</i> تُزكَّى قيمة الاسترداد (الرصيد الادخاري) بالكامل.{" "}
          <i>التأمين التقليدي</i> يُزكَّى <b>أصل الأقساط المُسدَّدة</b> فقط دون عوائد الفائدة (تُصرف
          في وجوه الخير).
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="font-semibold">تدقيق شرعي معتمد</span>
          <Badge variant="outline" className="text-[10px]">
            اختياري
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="global-audit" className="text-xs text-muted-foreground">
            تفعيل عمود التدقيق الشرعي لكل ورقة
          </Label>
          <Switch id="global-audit" checked={globalAudit} onCheckedChange={setGlobalAudit} />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const t = rowZakatable(r);
          const needsCompany = r.shariaCompliant === "no" || r.shariaCompliant === "unknown";
          return (
            <div key={r.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <TrendingUp className="h-4 w-4" /> {KIND_LABEL[r.kind]}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(r.id)}
                  disabled={rows.length <= 1}
                >
                  حذف
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع الورقة المالية</Label>
                  <Select
                    value={r.kind}
                    onValueChange={(v) => update(r.id, { kind: v as SecurityKind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_LABEL) as SecurityKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم الشركة / المُصدِر / الصندوق</Label>
                  <Input
                    value={r.company}
                    onChange={(e) => update(r.id, { company: e.target.value })}
                    placeholder={
                      needsCompany ? "مطلوب — لتوثيق الفتوى" : "مثال: CIB / Aramco / Apple"
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الرمز (Ticker)</Label>
                  <Input
                    value={r.ticker}
                    onChange={(e) => update(r.id, { ticker: e.target.value })}
                    placeholder="COMI.CA / 2222.SR / AAPL"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">تاريخ الشراء</Label>
                  <Input
                    type="date"
                    value={r.purchaseDate}
                    onChange={(e) => update(r.id, { purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الكمية</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={r.qty}
                    onChange={(e) => update(r.id, { qty: e.target.value })}
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">سعر الوحدة الحالي ({currencyName})</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={r.price}
                      onChange={(e) => update(r.id, { price: e.target.value })}
                      dir="ltr"
                      style={{ textAlign: "right" }}
                      placeholder="0"
                      className="flex-1"
                    />
                    <MarketQuoteButton
                      symbol={r.ticker}
                      defaultDate={r.purchaseDate}
                      compact
                      onApply={(price, meta) =>
                        update(r.id, {
                          price: String(price.toFixed(4)),
                          notes:
                            (r.notes ? r.notes + " | " : "") +
                            `${meta.name} @ ${new Date(meta.asOf).toLocaleDateString("ar")} (${meta.currency})`,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">تابع لمؤشر شريعة؟</Label>
                  <Select
                    value={r.shariaCompliant}
                    onValueChange={(v) =>
                      update(r.id, { shariaCompliant: v as Row["shariaCompliant"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نعم — مدرج في مؤشر شريعة</SelectItem>
                      <SelectItem value="no">لا — غير متوافق</SelectItem>
                      <SelectItem value="unknown">غير محدّد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {r.shariaCompliant === "yes" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">اسم المؤشر الشرعي</Label>
                    <Input
                      value={r.shariaIndex}
                      onChange={(e) => update(r.id, { shariaIndex: e.target.value })}
                      placeholder="S&P Sharia / Dow Jones Islamic / TASI Sharia"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">نسبة التطهير %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={r.purifyPct}
                    onChange={(e) => update(r.id, { purifyPct: e.target.value })}
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    placeholder="0"
                  />
                </div>

                {r.kind === "stock_invest" && (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">
                      نسبة الموجودات الزكوية للسهم % (نقد + ذمم + مخزون / إجمالي الأصول)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={r.zakatableAssetsPct}
                      onChange={(e) => update(r.id, { zakatableAssetsPct: e.target.value })}
                      dir="ltr"
                      style={{ textAlign: "right" }}
                      placeholder="افتراضي 30% — من القوائم المالية"
                    />
                  </div>
                )}

                {needsCompany && (
                  <div className="md:col-span-3">
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        يُرجى توضيح اسم الشركة لتقييم نشاطها ونسبة التطهير المناسبة قبل احتساب
                        الزكاة عليها.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {globalAudit && (
                  <>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">جهة التدقيق الشرعي</Label>
                      <Input
                        value={r.auditor}
                        onChange={(e) => update(r.id, { auditor: e.target.value })}
                        placeholder="مثال: AAOIFI / هيئة شرعية للبنك / المرجع الشرعي للصندوق"
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs">تم التدقيق</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch
                          checked={r.audited}
                          onCheckedChange={(v) => update(r.id, { audited: v })}
                        />
                        <span className="text-xs">{r.audited ? "موثّق" : "بدون تدقيق"}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Separator />
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">القيمة السوقية: </span>
                  <b>{cur(t.mv)}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">تطهير: </span>
                  <b className="text-destructive">−{cur(t.purify)}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">الوعاء الزكوي: </span>
                  <b className="text-primary">{cur(t.zakatable)}</b>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => add("stock_trade")}>
            + سهم
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("sukuk")}>
            + صكوك
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("bond")}>
            + سندات
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("mutual_islamic")}>
            + صندوق إسلامي
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("mutual_conv")}>
            + صندوق تقليدي
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("etf")}>
            + ETF
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("takaful")}>
            + تأمين تكافلي
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => add("insurance_conv")}>
            + تأمين تقليدي
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">إجمالي القيمة السوقية</span>
          <b>{cur(totals.mv)}</b>
        </div>
        <div className="flex items-center justify-between text-xs text-destructive">
          <span>− التطهير المُجنّب</span>
          <b>−{cur(totals.purify)}</b>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">إجمالي وعاء الأوراق المالية</span>
          <span className="font-bold text-primary">{cur(totals.zakatable)}</span>
        </div>
      </div>
    </div>
  );
}
