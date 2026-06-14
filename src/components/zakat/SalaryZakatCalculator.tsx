import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs as _T } from "@/components/ui/tabs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { num, fmt, ZAKAT_RATE } from "@/lib/zakat";
import { Wallet, Info } from "lucide-react";

type Method = "yearly" | "monthly" | "on-receipt";

interface Props {
  currencyName?: string;
  nisabValue?: number; // قيمة النصاب بالعملة الحالية
}

export default function SalaryZakatCalculator({ currencyName = "ج.م", nisabValue = 0 }: Props) {
  const [method, setMethod] = useState<Method>("yearly");
  const [monthly, setMonthly] = useState("");
  const [savedAnnual, setSavedAnnual] = useState("");
  const [expenses, setExpenses] = useState("");

  const calc = useMemo(() => {
    const m = num(monthly);
    const saved = num(savedAnnual);
    const exp = num(expenses);

    if (method === "monthly") {
      // قول الشيخ القرضاوي: يخرج من كل راتب بعد خصم الحاجات الأساسية فورًا
      const base = Math.max(0, m - exp);
      return { base, zakat: base * ZAKAT_RATE, label: "زكاة شهرية فورية (رأي القرضاوي)" };
    }
    if (method === "on-receipt") {
      // قول الشيخ ابن باز ومجمع الفقه: يضم لما عنده ويخرج عند حول رأس المال الأصلي
      const base = saved;
      return { base, zakat: base * ZAKAT_RATE, label: "ضم الراتب لحول رأس المال (الجمهور)" };
    }
    // yearly: عند تمام الحول على المتبقي
    const remaining = Math.max(0, saved - exp);
    return { base: remaining, zakat: remaining * ZAKAT_RATE, label: "زكاة سنوية على المُدّخر (الأحوط)" };
  }, [method, monthly, savedAnnual, expenses]);

  const reachesNisab = nisabValue > 0 ? calc.base >= nisabValue : true;

  return (
    <Card className="border-primary/40 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          زكاة الراتب والمكافآت (3 آراء فقهية)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="yearly" className="text-xs">سنوي على المُدّخر</TabsTrigger>
            <TabsTrigger value="on-receipt" className="text-xs">ضمّ لرأس المال</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">شهري فوري</TabsTrigger>
          </TabsList>
        </Tabs>

        <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="hidden">
          <RadioGroupItem value={method} />
        </RadioGroup>

        {method === "monthly" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>الراتب الشهري</Label>
              <Input inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
            <div>
              <Label>المصروفات الأساسية الشهرية</Label>
              <Input inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
            </div>
          </div>
        )}

        {(method === "yearly" || method === "on-receipt") && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>إجمالي المُدّخر من الرواتب خلال السنة</Label>
              <Input inputMode="decimal" value={savedAnnual} onChange={(e) => setSavedAnnual(e.target.value)} />
            </div>
            {method === "yearly" && (
              <div>
                <Label>الحاجات والديون المستحقة</Label>
                <Input inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-muted/40 p-4 grid sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">الطريقة</div>
            <div className="font-semibold">{calc.label}</div>
          </div>
          <div>
            <div className="text-muted-foreground">الوعاء الزكوي</div>
            <div className="font-bold text-lg">{fmt(calc.base)} {currencyName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">المستحق (2.5%)</div>
            <div className="font-bold text-lg text-primary">{fmt(calc.zakat)} {currencyName}</div>
          </div>
        </div>

        {nisabValue > 0 && !reachesNisab && (
          <div className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            الوعاء أقل من النصاب ({fmt(nisabValue)} {currencyName})، لا تجب الزكاة في الطرق التي تشترط النصاب.
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed border-r-2 border-primary/40 pr-3">
          <strong>المرجع:</strong> اختلف العلماء؛ الجمهور: لا زكاة إلا بعد الحول على المال المدّخر بعد بلوغه النصاب.
          القرضاوي: قياسًا على المستغلات؛ زكاة شهرية 2.5%. الأحوط: التعامل مع المُدّخر السنوي بعد الحول.
        </p>
      </CardContent>
    </Card>
  );
}
