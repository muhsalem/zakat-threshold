import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Building2, Info, Plus, Trash2 } from "lucide-react";
import { ZAKAT_RATE, fmt } from "@/lib/zakat";

/**
 * توحيد زكاة المجموعات (Consolidated Zakat) — للشركات القابضة والتابعة.
 *
 * المنهجية (وفق المعيار AAOIFI FAS 9 + قرار الندوة الثانية لقضايا الزكاة):
 *  - الشركة القابضة: تُزكّى موجوداتها الزكوية كاملة.
 *  - كل شركة تابعة: تُزكّى موجوداتها الزكوية ضمن المجموعة بقدر نسبة ملكية القابضة فيها.
 *  - تُستبعد المعاملات البينية (Intercompany) لتفادي الازدواج.
 *  - النتيجة = القاعدة الزكوية الموحَّدة × 2.5%.
 *
 * المراجع: AAOIFI FAS 9، الندوة الثانية لقضايا الزكاة (1992)، فتوى بيت الزكاة الكويتي رقم 318.
 */

type Entity = {
  id: string;
  name: string;
  ownershipPct: number; // 100 للقابضة، النسبة الفعلية للتابعات
  zakatableAssets: number;
  intercompanyEliminations: number;
  isParent: boolean;
};

function emptyChild(): Entity {
  return {
    id: crypto.randomUUID(),
    name: "شركة تابعة",
    ownershipPct: 100,
    zakatableAssets: 0,
    intercompanyEliminations: 0,
    isParent: false,
  };
}

export function GroupConsolidation({ currency = "USD" }: { currency?: string }) {
  const [parent, setParent] = useState<Entity>({
    id: "parent",
    name: "الشركة القابضة",
    ownershipPct: 100,
    zakatableAssets: 0,
    intercompanyEliminations: 0,
    isParent: true,
  });
  const [children, setChildren] = useState<Entity[]>([emptyChild()]);

  const rows = useMemo(() => {
    const list = [parent, ...children];
    return list.map((e) => {
      const net = Math.max(0, e.zakatableAssets - e.intercompanyEliminations);
      const share = Math.max(0, Math.min(100, e.ownershipPct)) / 100;
      const contribution = e.isParent ? net : net * share;
      return { ...e, net, contribution };
    });
  }, [parent, children]);

  const total = rows.reduce((s, r) => s + r.contribution, 0);
  const zakat = total * ZAKAT_RATE;

  const updateChild = (id: string, patch: Partial<Entity>) =>
    setChildren((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeChild = (id: string) => setChildren((cs) => cs.filter((c) => c.id !== id));

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> توحيد زكاة المجموعة (قابضة + تابعات)
          <Badge variant="outline" className="text-[10px]">
            AAOIFI FAS 9
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            تُحتسب زكاة الشركة القابضة على كامل موجوداتها الزكوية، ويُضاف نصيبها من الموجودات
            الزكوية في كل شركة تابعة بقدر نسبة الملكية، بعد استبعاد المعاملات البينية لتفادي
            الازدواج. (الندوة الثانية لقضايا الزكاة — المنامة 1992).
          </AlertDescription>
        </Alert>

        {/* الشركة القابضة */}
        <div className="border rounded-lg p-3 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <Badge>قابضة</Badge>
            <Input
              value={parent.name}
              onChange={(e) => setParent((p) => ({ ...p, name: e.target.value }))}
              className="flex-1"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <NumField
              label="الموجودات الزكوية"
              value={parent.zakatableAssets}
              onChange={(v) => setParent((p) => ({ ...p, zakatableAssets: v }))}
              currency={currency}
            />
            <NumField
              label="المعاملات البينية (تُستبعَد)"
              value={parent.intercompanyEliminations}
              onChange={(v) => setParent((p) => ({ ...p, intercompanyEliminations: v }))}
              currency={currency}
            />
          </div>
        </div>

        {/* الشركات التابعة */}
        {children.map((c) => (
          <div key={c.id} className="border rounded-lg p-3 space-y-3 bg-card/50">
            <div className="flex items-center gap-2">
              <Badge variant="outline">تابعة</Badge>
              <Input
                value={c.name}
                onChange={(e) => updateChild(c.id, { name: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeChild(c.id)}
                aria-label="حذف الشركة التابعة"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">% ملكية القابضة فيها</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={c.ownershipPct || ""}
                  onChange={(e) => updateChild(c.id, { ownershipPct: Number(e.target.value) || 0 })}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
              <NumField
                label="موجوداتها الزكوية"
                value={c.zakatableAssets}
                onChange={(v) => updateChild(c.id, { zakatableAssets: v })}
                currency={currency}
              />
              <NumField
                label="المعاملات البينية"
                value={c.intercompanyEliminations}
                onChange={(v) => updateChild(c.id, { intercompanyEliminations: v })}
                currency={currency}
              />
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setChildren((cs) => [...cs, emptyChild()])}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة شركة تابعة
        </Button>

        {/* جدول النتائج */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-start">الكيان</th>
                <th className="p-2 text-end">%</th>
                <th className="p-2 text-end">الصافي بعد الاستبعادات</th>
                <th className="p-2 text-end">المساهمة في الوعاء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-end" dir="ltr">
                    {r.isParent ? "100" : r.ownershipPct}%
                  </td>
                  <td className="p-2 text-end" dir="ltr">
                    {fmt(r.net)}
                  </td>
                  <td className="p-2 text-end font-semibold" dir="ltr">
                    {fmt(r.contribution)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-primary/5">
              <tr className="border-t">
                <td className="p-2 font-bold" colSpan={3}>
                  إجمالي الوعاء الزكوي الموحَّد
                </td>
                <td className="p-2 text-end font-bold" dir="ltr">
                  {fmt(total)} {currency}
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-2 font-bold text-primary" colSpan={3}>
                  زكاة المجموعة (2.5%)
                </td>
                <td className="p-2 text-end font-bold text-primary" dir="ltr">
                  {fmt(zakat)} {currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
  currency,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  currency: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          dir="ltr"
          style={{ textAlign: "right" }}
          className="pl-12"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          {currency}
        </span>
      </div>
    </div>
  );
}

export default GroupConsolidation;
