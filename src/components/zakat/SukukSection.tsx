import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coins, Info } from "lucide-react";
import { ZAKAT_RATE, fmt } from "@/lib/zakat";

/**
 * زكاة الصكوك الإسلامية وفق نوع الصك (AAOIFI FAS 32 / المعيار الشرعي 17 — الصكوك).
 *
 * - صكوك الإجارة: زكاتها على المالك الفعلي للأصل = القيمة السوقية × 2.5% (عند نية المتاجرة)
 *   أو زكاة الغلّة فقط إذا كانت للاحتفاظ.
 * - صكوك المضاربة والمشاركة: زكاة الموجودات الزكوية في وعاء المضاربة بنسبة الملكية،
 *   وإلا فالقيمة السوقية للصك عند نية المتاجرة.
 * - صكوك المرابحة والسلم والاستصناع: تمثّل دَيناً مرجوّ السداد → تُزكَّى بقيمتها الاسمية
 *   (مع رأي بعدم الزكاة على الديون غير المقبوضة قبل قبضها).
 * - صكوك الوكالة بالاستثمار: تُعامَل معاملة المضاربة.
 *
 * المراجع: المعيار الشرعي AAOIFI رقم 17، قرار مجمع الفقه الإسلامي الدولي رقم 30 (4/4)،
 * فتوى الهيئة الشرعية لبيت التمويل الكويتي رقم 421.
 */

type SukukType = "ijara" | "mudaraba" | "musharaka" | "murabaha" | "salam" | "istisna" | "wakala";
type Intention = "trade" | "hold";

const SUKUK_META: Record<SukukType, { name: string; ref: string; baseHint: string }> = {
  ijara: {
    name: "صكوك الإجارة",
    ref: "AAOIFI 17 — البند 5/1/8/5",
    baseHint: "القيمة السوقية إن كانت للمتاجرة، وإلا غلّة الإيجار فقط.",
  },
  mudaraba: {
    name: "صكوك المضاربة",
    ref: "AAOIFI 17 — البند 5/1/8/2",
    baseHint: "نصيبك من الموجودات الزكوية في الوعاء، أو القيمة السوقية عند المتاجرة.",
  },
  musharaka: {
    name: "صكوك المشاركة",
    ref: "AAOIFI 17 — البند 5/1/8/3",
    baseHint: "كالمضاربة: حصّتك من الموجودات الزكوية.",
  },
  murabaha: {
    name: "صكوك المرابحة",
    ref: "AAOIFI 17 — البند 5/1/8/6",
    baseHint: "تمثّل دَيناً — تُزكَّى عند القبض على رأي الجمهور، أو سنوياً إن كانت مرجوّة.",
  },
  salam: {
    name: "صكوك السلم",
    ref: "AAOIFI 17 — البند 5/1/8/7",
    baseHint: "بضاعة موصوفة في الذمة — تُزكَّى عند القبض، وإلا فبقيمتها السوقية للمتاجر.",
  },
  istisna: {
    name: "صكوك الاستصناع",
    ref: "AAOIFI 17 — البند 5/1/8/8",
    baseHint: "تمثّل أصلاً قيد التنفيذ — زكاة المستحقات النقدية فقط.",
  },
  wakala: {
    name: "صكوك الوكالة بالاستثمار",
    ref: "AAOIFI 17 — البند 5/1/8/4",
    baseHint: "تُعامَل معاملة المضاربة — نصيبك من الموجودات الزكوية.",
  },
};

type SukukRow = {
  id: string;
  type: SukukType;
  intent: Intention;
  marketValue: number;
  zakatableShare: number; // نسبة الموجودات الزكوية في الوعاء (للمضاربة/المشاركة/الوكالة)
  income: number; // الغلّة السنوية (للإجارة عند الاحتفاظ)
};

function emptyRow(): SukukRow {
  return { id: crypto.randomUUID(), type: "ijara", intent: "trade", marketValue: 0, zakatableShare: 100, income: 0 };
}

function computeBase(r: SukukRow): number {
  if (r.type === "ijara") {
    return r.intent === "trade" ? r.marketValue : r.income;
  }
  if (r.type === "mudaraba" || r.type === "musharaka" || r.type === "wakala") {
    if (r.intent === "trade") return r.marketValue;
    const pct = Math.max(0, Math.min(100, r.zakatableShare)) / 100;
    return r.marketValue * pct;
  }
  if (r.type === "murabaha" || r.type === "salam") {
    // دَين/بضاعة موصوفة — تُحسب بالقيمة الاسمية للمزكّي الحريص
    return r.marketValue;
  }
  if (r.type === "istisna") {
    // المستحقات النقدية فقط ضمن قيمة الصك
    return r.income; // نستخدم حقل income لمستحقات النقد
  }
  return 0;
}

export function SukukSection({ currency = "USD", onTotalChange }: { currency?: string; onTotalChange?: (v: number) => void }) {
  const [rows, setRows] = useState<SukukRow[]>([emptyRow()]);

  const total = useMemo(() => rows.reduce((s, r) => s + computeBase(r), 0), [rows]);
  const zakat = total * ZAKAT_RATE;

  // إعلام الأب بالقاعدة الزكوية الكليّة لدمجها في الإجمالي
  useMemo(() => { onTotalChange?.(total); }, [total, onTotalChange]);

  const update = (id: string, patch: Partial<SukukRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const add = () => setRows((rs) => [...rs, emptyRow()]);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-5 w-5 text-primary" /> زكاة الصكوك الإسلامية
          <Badge variant="outline" className="text-[10px]">AAOIFI 17</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            تختلف زكاة الصكوك باختلاف نوعها ونية الحامل. النظام يعتمد القاعدة الشرعية لكل نوع
            وفق <b>المعيار الشرعي AAOIFI رقم 17</b> و<b>قرار مجمع الفقه الإسلامي الدولي رقم 30 (4/4)</b>.
          </AlertDescription>
        </Alert>

        {rows.map((r) => {
          const meta = SUKUK_META[r.type];
          const showShare = r.intent === "hold" && (r.type === "mudaraba" || r.type === "musharaka" || r.type === "wakala");
          const showIncome = (r.type === "ijara" && r.intent === "hold") || r.type === "istisna";
          return (
            <div key={r.id} className="border rounded-lg p-3 space-y-3 bg-card/50">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع الصك</Label>
                  <Select value={r.type} onValueChange={(v) => update(r.id, { type: v as SukukType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUKUK_META).map(([k, m]) => (
                        <SelectItem key={k} value={k}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">النية</Label>
                  <Select value={r.intent} onValueChange={(v) => update(r.id, { intent: v as Intention })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trade">للمتاجرة (عرض تجارة)</SelectItem>
                      <SelectItem value="hold">للاحتفاظ (استثمار)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">القيمة (السوقية/الاسمية)</Label>
                  <Input type="number" min="0" step="0.01" value={r.marketValue || ""}
                    onChange={(e) => update(r.id, { marketValue: Number(e.target.value) || 0 })}
                    dir="ltr" style={{ textAlign: "right" }} />
                </div>
                {showShare && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">% الموجودات الزكوية في الوعاء</Label>
                    <Input type="number" min="0" max="100" step="1" value={r.zakatableShare || ""}
                      onChange={(e) => update(r.id, { zakatableShare: Number(e.target.value) || 0 })}
                      dir="ltr" style={{ textAlign: "right" }} />
                  </div>
                )}
                {showIncome && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{r.type === "istisna" ? "المستحقات النقدية" : "الغلّة السنوية"}</Label>
                    <Input type="number" min="0" step="0.01" value={r.income || ""}
                      onChange={(e) => update(r.id, { income: Number(e.target.value) || 0 })}
                      dir="ltr" style={{ textAlign: "right" }} />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{meta.baseHint} <Badge variant="outline" className="ms-1 text-[10px]">{meta.ref}</Badge></span>
                <button type="button" onClick={() => remove(r.id)} className="text-destructive hover:underline">حذف</button>
              </div>
              <div className="text-sm font-semibold text-primary">
                القاعدة الزكوية: {fmt(computeBase(r))} {currency}
              </div>
            </div>
          );
        })}

        <button type="button" onClick={add} className="text-sm text-primary hover:underline">+ إضافة صك آخر</button>

        <div className="border-t pt-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">إجمالي القاعدة الزكوية للصكوك</span>
          <div className="text-end">
            <div className="text-lg font-bold">{fmt(total)} {currency}</div>
            <div className="text-xs text-primary">زكاة 2.5%: {fmt(zakat)} {currency}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SukukSection;
