import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Languages, Plus, Trash2, Info } from "lucide-react";
import type { FxRate } from "@/lib/fx";

type Props = {
  reportCurrency: string;
  value: FxRate[];
  onChange: (rates: FxRate[]) => void;
};

const COMMON = ["USD", "EUR", "GBP", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "TRY", "EGP"];

export function CurrencyConverterCard({ reportCurrency, value, onChange }: Props) {
  const [from, setFrom] = useState("USD");
  const [rate, setRate] = useState("");

  const add = () => {
    const r = parseFloat(rate);
    if (!from || !Number.isFinite(r) || r <= 0) return;
    const next = value.filter((x) => x.from !== from);
    next.push({ from, to: reportCurrency, rate: r });
    onChange(next);
    setRate("");
  };
  const remove = (f: string) => onChange(value.filter((x) => x.from !== f));

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="h-4 w-4 text-primary" />
          أسعار الصرف للتحويل التلقائي
          <Badge variant="outline" className="text-[10px] mr-auto">
            قبل التصدير
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            أَدخل سعر صرف كل عملة أجنبية مقابل عملة التقرير ({reportCurrency}). يُستخدم السعر لتوحيد
            جميع المبالغ في الـ PDF و Excel، مع الإفصاح في التقرير عن العملة الأصلية والسعر المستخدم
            لكل بند للشفافية والمراجعة.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">العملة الأصلية</Label>
            <Input
              list="fx-common"
              value={from}
              onChange={(e) => setFrom(e.target.value.toUpperCase().slice(0, 6))}
            />
            <datalist id="fx-common">
              {COMMON.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="col-span-5 space-y-1">
            <Label className="text-xs">
              1 {from || "—"} = ؟ {reportCurrency}
            </Label>
            <Input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="مثال: 3.75"
            />
          </div>
          <div className="col-span-3">
            <Button type="button" className="w-full" onClick={add} disabled={!from || !rate}>
              <Plus className="h-4 w-4 ml-1" /> إضافة
            </Button>
          </div>
        </div>

        {value.length > 0 ? (
          <div className="rounded-md border border-primary/20 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-primary/5">
                <tr>
                  <th className="p-2 text-right">العملة</th>
                  <th className="p-2 text-right">السعر مقابل {reportCurrency}</th>
                  <th className="p-2 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {value.map((r) => (
                  <tr key={r.from} className="border-t border-primary/10">
                    <td className="p-2 font-bold">{r.from}</td>
                    <td className="p-2 tabular-nums">
                      1 {r.from} = {r.rate} {r.to}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(r.from)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            لا توجد عملات أجنبية مُضافة. كل المبالغ ستُصدَّر بعملة التقرير ({reportCurrency}).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
