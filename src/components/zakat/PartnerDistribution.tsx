import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Users, Info, Plus, Trash2, AlertTriangle } from "lucide-react";
import { ZAKAT_RATE, fmt } from "@/lib/zakat";

/**
 * توزيع الزكاة على الشركاء بنسب ملكيتهم — لشركات الأشخاص والمؤسسات الفردية.
 *
 * المنهجية: الزكاة في الشريعة على الأشخاص لا على الكيان (إلا في مساهمات الأنظمة الحديثة).
 * فالشركة المساهمة تخرج زكاتها نيابة عن المساهمين، أما في شركات الأشخاص فلكل شريك
 * تحديد نصيبه واحتساب زكاته إن بلغ نصاباً منفصلاً مع باقي أمواله الخاصة.
 *
 * المرجع: قرار مجمع الفقه الإسلامي رقم 28 (3/4)، فتوى الندوة الرابعة لقضايا الزكاة.
 */

const NISAB_USD = 6000; // نصاب تقريبي بالدولار للتنبيه فقط — يحدّثه المستخدم بدقة من قسم الأنصبة

type Partner = {
  id: string;
  name: string;
  sharePct: number;
  otherWealth: number;
  releasesZakat: boolean;
};

function emptyPartner(): Partner {
  return {
    id: crypto.randomUUID(),
    name: "شريك",
    sharePct: 0,
    otherWealth: 0,
    releasesZakat: true,
  };
}

export function PartnerDistribution({ currency = "USD" }: { currency?: string }) {
  const [poolZakatable, setPoolZakatable] = useState(0);
  const [partners, setPartners] = useState<Partner[]>([
    { ...emptyPartner(), name: "الشريك الأول", sharePct: 50 },
    { ...emptyPartner(), name: "الشريك الثاني", sharePct: 50 },
  ]);

  const totalPct = partners.reduce((s, p) => s + p.sharePct, 0);
  const balanced = Math.abs(totalPct - 100) < 0.01;

  const rows = useMemo(() => {
    return partners.map((p) => {
      const share = p.sharePct / 100;
      const fromCompany = poolZakatable * share;
      const personalTotal = fromCompany + p.otherWealth;
      const reachesNisab = personalTotal >= NISAB_USD;
      const zakatOnFirm = p.releasesZakat && reachesNisab ? fromCompany * ZAKAT_RATE : 0;
      return { ...p, fromCompany, personalTotal, reachesNisab, zakatOnFirm };
    });
  }, [partners, poolZakatable]);

  const totalZakat = rows.reduce((s, r) => s + r.zakatOnFirm, 0);

  const update = (id: string, patch: Partial<Partner>) =>
    setPartners((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => setPartners((ps) => ps.filter((p) => p.id !== id));

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> توزيع الزكاة على الشركاء
          <Badge variant="outline" className="text-[10px]">
            مجمع الفقه 28 (3/4)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            في شركات الأشخاص الزكاة على الشركاء كلٌّ بحسب نصيبه. إذا اتفق الشركاء على إخراج الشركة
            الزكاة نيابة عنهم لزم رضاهم، ولا يُحتسب على شريكٍ لم يبلغ مجموع أمواله مع نصيبه من
            الشركة النصاب الشرعي.
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label className="text-sm">الوعاء الزكوي للشركة قبل التوزيع</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={poolZakatable || ""}
              onChange={(e) => setPoolZakatable(Number(e.target.value) || 0)}
              dir="ltr"
              style={{ textAlign: "right" }}
              className="pl-12"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {currency}
            </span>
          </div>
        </div>

        {partners.map((p) => (
          <div key={p.id} className="border rounded-lg p-3 space-y-3 bg-card/50">
            <div className="flex items-center gap-2">
              <Input
                value={p.name}
                onChange={(e) => update(p.id, { name: e.target.value })}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(p.id)}
                aria-label="حذف الشريك"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">% الملكية</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={p.sharePct || ""}
                  onChange={(e) => update(p.id, { sharePct: Number(e.target.value) || 0 })}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">أمواله الأخرى (خارج الشركة)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.otherWealth || ""}
                  onChange={(e) => update(p.id, { otherWealth: Number(e.target.value) || 0 })}
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تُخرج الشركة زكاته نيابة؟</Label>
                <select
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={p.releasesZakat ? "y" : "n"}
                  onChange={(e) => update(p.id, { releasesZakat: e.target.value === "y" })}
                >
                  <option value="y">نعم</option>
                  <option value="n">لا — يُخرجها بنفسه</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPartners((ps) => [...ps, emptyPartner()])}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة شريك
        </Button>

        {!balanced && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              مجموع نسب الملكية = {totalPct.toFixed(2)}% (يجب أن يساوي 100%).
            </AlertDescription>
          </Alert>
        )}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-start">الشريك</th>
                <th className="p-2 text-end">%</th>
                <th className="p-2 text-end">نصيبه من الوعاء</th>
                <th className="p-2 text-end">إجمالي ماله</th>
                <th className="p-2 text-end">بلغ النصاب؟</th>
                <th className="p-2 text-end">زكاة على الشركة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-end" dir="ltr">
                    {r.sharePct}%
                  </td>
                  <td className="p-2 text-end" dir="ltr">
                    {fmt(r.fromCompany)}
                  </td>
                  <td className="p-2 text-end" dir="ltr">
                    {fmt(r.personalTotal)}
                  </td>
                  <td className="p-2 text-end">{r.reachesNisab ? "✓" : "—"}</td>
                  <td className="p-2 text-end font-semibold text-primary" dir="ltr">
                    {fmt(r.zakatOnFirm)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-primary/5">
              <tr className="border-t">
                <td className="p-2 font-bold" colSpan={5}>
                  إجمالي زكاة الشركة المُخرَجة نيابة
                </td>
                <td className="p-2 text-end font-bold text-primary" dir="ltr">
                  {fmt(totalZakat)} {currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default PartnerDistribution;
