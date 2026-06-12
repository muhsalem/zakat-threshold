import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Info, Calculator, Scale } from "lucide-react";
import { num, fmt, ZAKAT_RATE, CROPS_RATE_IRRIGATED } from "@/lib/zakat";

interface Props { currencyName?: string }

/**
 * زكاة المستغلات (العقارات المؤجرة، المصانع، الفنادق، وسائل النقل المؤجرة)
 * — يدعم نموذجَين فقهيَّين:
 *   1) رأي الجمهور: زكاة في صافي الغلة (الإيراد) فقط بمعدل 2.5% بعد بلوغ النصاب وحولان الحول.
 *   2) رأي الشيخ أبو زهرة وعبد الوهاب خلاف ومحمد الغزالي وندوات الزكاة المعاصرة:
 *      زكاة في صافي الغلة بمعدل 10% (قياسًا على الأرض الزراعية) — بدون اشتراط الحول.
 *   3) رأي مكمّل (المجمع الفقهي): زكاة على القيمة السوقية إذا كانت مُعدَّة للتجارة (عرض تجارة 2.5%).
 */
export function RealEstateZakatSection({ currencyName = "ج.م" }: Props) {
  const [model, setModel] = useState<"jumhur" | "abuZahra" | "trade">("jumhur");
  const [propertyType, setPropertyType] = useState<"apartment" | "commercial" | "industrial" | "transport" | "hotel">("apartment");
  const [grossIncome, setGrossIncome] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [taxes, setTaxes] = useState("");
  const [salaries, setSalaries] = useState("");
  const [otherExp, setOtherExp] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [debts, setDebts] = useState("");

  const calc = useMemo(() => {
    const gross = num(grossIncome);
    const expenses = num(maintenance) + num(taxes) + num(salaries) + num(otherExp);
    const netIncome = Math.max(0, gross - expenses);
    if (model === "trade") {
      const base = Math.max(0, num(marketValue) - num(debts));
      return { base, rate: ZAKAT_RATE, zakat: base * ZAKAT_RATE, netIncome, expenses, label: "القيمة السوقية − الديون (عرض تجارة)" };
    }
    if (model === "abuZahra") {
      return { base: netIncome, rate: CROPS_RATE_IRRIGATED, zakat: netIncome * CROPS_RATE_IRRIGATED, netIncome, expenses, label: "صافي الغلة × 10% (قياسًا على الزروع)" };
    }
    return { base: netIncome, rate: ZAKAT_RATE, zakat: netIncome * ZAKAT_RATE, netIncome, expenses, label: "صافي الغلة × 2.5% (بعد الحول)" };
  }, [model, grossIncome, maintenance, taxes, salaries, otherExp, marketValue, debts]);

  const typeLabel: Record<typeof propertyType, string> = {
    apartment: "شقة/فيلا سكنية مؤجرة",
    commercial: "محل/مكتب تجاري مؤجر",
    industrial: "مصنع/مستودع مؤجر",
    transport: "وسيلة نقل مؤجرة (سيارة/شاحنة/سفينة)",
    hotel: "فندق/شقق فندقية",
  };

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building className="h-4 w-4 text-primary" />
          زكاة المستغلات (العقارات المؤجرة والمصانع ووسائل النقل)
          <Badge variant="outline" className="text-[10px] mr-auto">AAOIFI 35 · أبو زهرة · المجمع الفقهي</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            <b>المستغلات</b>: أصول مقتناة للاستثمار وليس للبيع (إيجار، تأجير، إنتاج). للعلماء فيها ثلاثة آراء:
            <ul className="list-disc pr-5 mt-1 space-y-0.5">
              <li><b>الجمهور:</b> 2.5% على صافي الغلة بعد الحول وبلوغ النصاب.</li>
              <li><b>أبو زهرة وخلّاف والغزالي:</b> 10% على صافي الغلة بدون حول (قياسًا على الزروع).</li>
              <li><b>المجمع الفقهي:</b> إن نوى صاحبها البيع → عرض تجارة 2.5% على القيمة السوقية.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">نوع المستغل</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
            >
              {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">النموذج الفقهي المعتمد</Label>
            <RadioGroup value={model} onValueChange={(v) => setModel(v as typeof model)} className="flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <RadioGroupItem value="jumhur" /> الجمهور — 2.5% على صافي الغلة
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <RadioGroupItem value="abuZahra" /> أبو زهرة — 10% على صافي الغلة
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <RadioGroupItem value="trade" /> عرض تجارة — 2.5% على القيمة السوقية
              </label>
            </RadioGroup>
          </div>
        </div>

        <Tabs value={model === "trade" ? "value" : "income"} className="space-y-3">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="income" disabled={model === "trade"}>الإيرادات والمصاريف</TabsTrigger>
            <TabsTrigger value="value" disabled={model !== "trade"}>القيمة السوقية</TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-3">
            <div>
              <Label className="text-sm">إجمالي الإيرادات السنوية</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }}
                value={grossIncome} onChange={(e) => setGrossIncome(e.target.value)} placeholder="0" />
            </div>
            <div className="rounded-md border border-muted p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">المصاريف الفعلية الحقيقية (تُخصم)</div>
              <div className="grid md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">صيانة وإصلاحات</Label>
                  <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={maintenance} onChange={(e) => setMaintenance(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label className="text-[11px]">ضرائب ورسوم حكومية</Label>
                  <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={taxes} onChange={(e) => setTaxes(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label className="text-[11px]">رواتب وأجور إدارة</Label>
                  <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={salaries} onChange={(e) => setSalaries(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label className="text-[11px]">مصاريف تشغيلية أخرى</Label>
                  <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={otherExp} onChange={(e) => setOtherExp(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="value" className="space-y-3">
            <div className="grid md:grid-cols-2 gap-2">
              <div>
                <Label className="text-sm">القيمة السوقية الحالية</Label>
                <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={marketValue} onChange={(e) => setMarketValue(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-sm">ديون مرتبطة بالأصل</Label>
                <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={debts} onChange={(e) => setDebts(e.target.value)} placeholder="0" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 space-y-1 text-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Scale className="h-3.5 w-3.5" /> {calc.label}
          </div>
          {model !== "trade" && (
            <>
              <div className="flex justify-between text-xs"><span>إجمالي المصاريف:</span><b>{fmt(calc.expenses)} {currencyName}</b></div>
              <div className="flex justify-between text-xs"><span>صافي الغلة:</span><b>{fmt(calc.netIncome)} {currencyName}</b></div>
            </>
          )}
          <div className="flex justify-between"><span>الوعاء الزكوي:</span><b>{fmt(calc.base)} {currencyName}</b></div>
          <div className="flex justify-between text-primary border-t border-primary/30 pt-1">
            <span className="flex items-center gap-1"><Calculator className="h-3.5 w-3.5" /> الزكاة المستحقة ({(calc.rate * 100).toFixed(1)}%):</span>
            <b className="text-base">{fmt(calc.zakat)} {currencyName}</b>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RealEstateZakatSection;
