import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, Coins, Landmark, TrendingUp, FileText, Package, Wheat, Cog,
  MinusCircle, Calculator, Info, CheckCircle2, Sprout,
} from "lucide-react";
import {
  ZAKAT_RATE, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, CROPS_NISAB_KG,
  num, fmt, currency, camelZakat, cowZakat, sheepZakat,
} from "@/lib/zakat";

interface NumFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
  placeholder?: string;
}
function NumField({ label, value, onChange, unit, hint, placeholder }: NumFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="text-left ltr:text-left rtl:text-right pl-16"
          dir="ltr"
          style={{ textAlign: "right" }}
        />
        {unit && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionResult({ label, value, eligible = true }: { label: string; value: number; eligible?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${eligible && value > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className={`font-bold ${eligible && value > 0 ? "text-primary" : "text-muted-foreground"}`}>
        {currency(value)}
      </span>
    </div>
  );
}

export function IndividualTab() {
  // بيانات المزكي
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [calculatedBefore, setCalculatedBefore] = useState<"yes" | "no">("no");
  const [pinDate, setPinDate] = useState<"yes" | "no">("no");
  const [hawlDate, setHawlDate] = useState("");
  const [notes, setNotes] = useState("");

  // أسعار مرجعية
  const [goldPrice, setGoldPrice] = useState("4500"); // سعر جرام الذهب عيار 21
  const [silverPrice, setSilverPrice] = useState("55");
  const [currencyName, setCurrencyName] = useState("ج.م");

  // الذهب
  const [gold24, setGold24] = useState("");
  const [gold21, setGold21] = useState("");
  const [gold18, setGold18] = useState("");
  // الفضة
  const [silver, setSilver] = useState("");

  // النقدية والبنوك
  const [cashHand, setCashHand] = useState("");
  const [cashBank, setCashBank] = useState("");
  const [savings, setSavings] = useState("");
  const [foreignCurrency, setForeignCurrency] = useState("");

  // الأوراق المالية والاستثمارات
  const [stocksTrade, setStocksTrade] = useState(""); // أسهم للمتاجرة (القيمة السوقية)
  const [stocksInvest, setStocksInvest] = useState(""); // أسهم استثمار (الموجودات الزكوية فقط)
  const [mutualFunds, setMutualFunds] = useState("");
  const [bonds, setBonds] = useState(""); // الأصل فقط دون الفوائد

  // الأوراق التجارية
  const [bills, setBills] = useState(""); // كمبيالات/شيكات مقبوضة محققة الأداء

  // عروض التجارة
  const [inventory, setInventory] = useState(""); // قيمة البضاعة بسعر السوق
  const [receivables, setReceivables] = useState(""); // ديون مرجوة على الغير

  // الزروع والثمار
  const [cropsKg, setCropsKg] = useState("");
  const [cropsValuePerKg, setCropsValuePerKg] = useState("");
  const [cropsIrrigation, setCropsIrrigation] = useState<"rain" | "irrigated">("rain");

  // الأنعام
  const [camels, setCamels] = useState("");
  const [cows, setCows] = useState("");
  const [sheep, setSheep] = useState("");

  // الديون والالتزامات
  const [shortDebts, setShortDebts] = useState(""); // ديون مستحقة خلال الحول
  const [expenses, setExpenses] = useState(""); // نفقات ضرورية مستحقة

  // الحسابات
  const calc = useMemo(() => {
    const gp = num(goldPrice);
    const sp = num(silverPrice);

    // الذهب: نحوّل إلى ما يعادل عيار 24
    const goldGrams24Eq = num(gold24) + num(gold21) * (21 / 24) + num(gold18) * (18 / 24);
    const goldGramsTotal = num(gold24) + num(gold21) + num(gold18);
    const goldValue = num(gold24) * gp * (24 / 21) + num(gold21) * gp + num(gold18) * gp * (18 / 21);
    const goldEligible = goldGramsTotal >= GOLD_NISAB_GRAMS;
    const goldZakat = goldEligible ? goldValue * ZAKAT_RATE : 0;

    const silverGrams = num(silver);
    const silverValue = silverGrams * sp;
    const silverEligible = silverGrams >= SILVER_NISAB_GRAMS;
    const silverZakat = silverEligible ? silverValue * ZAKAT_RATE : 0;

    const cashTotal = num(cashHand) + num(cashBank) + num(savings) + num(foreignCurrency);
    const securitiesTotal = num(stocksTrade) + num(stocksInvest) + num(mutualFunds) + num(bonds);
    const billsTotal = num(bills);
    const tradeTotal = num(inventory) + num(receivables);

    // نصاب المال = قيمة نصاب الفضة (الأنفع للفقراء) أو الذهب — نأخذ الأدنى منهما
    const goldNisabValue = GOLD_NISAB_GRAMS * gp;
    const silverNisabValue = SILVER_NISAB_GRAMS * sp;
    const moneyNisab = Math.min(goldNisabValue, silverNisabValue);

    const debts = num(shortDebts) + num(expenses);
    const monetaryBase = cashTotal + securitiesTotal + billsTotal + tradeTotal - debts;
    const monetaryEligible = monetaryBase >= moneyNisab && monetaryBase > 0;

    const cashZakat = monetaryEligible ? num(cashTotal - (debts * cashTotal) / (cashTotal + securitiesTotal + billsTotal + tradeTotal || 1)) * ZAKAT_RATE : 0;
    // الأبسط والأكثر دقة: نحسب الزكاة على المجموع الصافي
    const monetaryZakat = monetaryEligible ? monetaryBase * ZAKAT_RATE : 0;

    // زكاة الزروع
    const cropsKgN = num(cropsKg);
    const cropsValue = cropsKgN * num(cropsValuePerKg);
    const cropsRate = cropsIrrigation === "rain" ? 0.1 : 0.05;
    const cropsEligible = cropsKgN >= CROPS_NISAB_KG;
    const cropsZakat = cropsEligible ? cropsValue * cropsRate : 0;

    // الأنعام
    const camelsN = Math.floor(num(camels));
    const cowsN = Math.floor(num(cows));
    const sheepN = Math.floor(num(sheep));

    const total = goldZakat + silverZakat + monetaryZakat + cropsZakat;

    return {
      goldGramsTotal, goldGrams24Eq, goldValue, goldEligible, goldZakat,
      silverGrams, silverValue, silverEligible, silverZakat,
      cashTotal, securitiesTotal, billsTotal, tradeTotal, debts,
      monetaryBase, monetaryEligible, monetaryZakat, moneyNisab,
      cashZakat,
      cropsValue, cropsRate, cropsEligible, cropsZakat,
      camelsN, cowsN, sheepN,
      total,
    };
  }, [
    goldPrice, silverPrice, gold24, gold21, gold18, silver,
    cashHand, cashBank, savings, foreignCurrency,
    stocksTrade, stocksInvest, mutualFunds, bonds, bills,
    inventory, receivables, shortDebts, expenses,
    cropsKg, cropsValuePerKg, cropsIrrigation,
    camels, cows, sheep,
  ]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* بيانات المزكي */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              بيانات المزكي
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الاسم</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المزكي" />
            </div>
            <div className="space-y-1.5">
              <Label>المهنة</Label>
              <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="المهنة أو النشاط" />
            </div>
            <div className="space-y-1.5">
              <Label>العملة</Label>
              <Input value={currencyName} onChange={(e) => setCurrencyName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الحول (إن وُجد)</Label>
              <Input type="date" value={hawlDate} onChange={(e) => setHawlDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* الإقرار */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              أسئلة الإقرار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">هل سبق لك حساب الزكاة من قبل؟</Label>
              <RadioGroup value={calculatedBefore} onValueChange={(v) => setCalculatedBefore(v as "yes" | "no")} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="cb-yes" /><Label htmlFor="cb-yes">نعم</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="cb-no" /><Label htmlFor="cb-no">لا</Label></div>
              </RadioGroup>
            </div>
            <div>
              <Label className="mb-2 block">هل تريد تثبيت تاريخ الحساب (لأعوام سابقة أو لاحقة)؟</Label>
              <RadioGroup value={pinDate} onValueChange={(v) => setPinDate(v as "yes" | "no")} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="pd-yes" /><Label htmlFor="pd-yes">نعم</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="pd-no" /><Label htmlFor="pd-no">لا</Label></div>
              </RadioGroup>
              {pinDate === "yes" && (
                <Alert className="mt-3 border-gold/30 bg-gold/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    عند تثبيت التاريخ يُعتمد الحساب على تاريخ الحول المُدخل أعلاه ويُحسب الواجب لكل سنة قمرية مضت.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div>
              <Label className="mb-2 block">ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي ملاحظات إضافية" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* الأسعار المرجعية */}
        <Card className="border-gold/30 shadow-soft">
          <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-gold" />
              الأسعار المرجعية اليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
            <NumField label="سعر جرام الذهب عيار 21" value={goldPrice} onChange={setGoldPrice} unit={currencyName} />
            <NumField label="سعر جرام الفضة الخالصة" value={silverPrice} onChange={setSilverPrice} unit={currencyName} />
          </CardContent>
        </Card>

        {/* أبواب الزكاة */}
        <Accordion type="multiple" defaultValue={["gold", "cash"]} className="space-y-3">
          <AccordionItem value="gold" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Coins className="h-5 w-5 text-gold" /> زكاة الذهب والفضة
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid md:grid-cols-3 gap-4">
                <NumField label="ذهب عيار 24" value={gold24} onChange={setGold24} unit="جرام" />
                <NumField label="ذهب عيار 21" value={gold21} onChange={setGold21} unit="جرام" />
                <NumField label="ذهب عيار 18" value={gold18} onChange={setGold18} unit="جرام" />
              </div>
              <NumField label="الفضة الخالصة" value={silver} onChange={setSilver} unit="جرام" hint={`النصاب: ${SILVER_NISAB_GRAMS} جم`} />
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <div>إجمالي الذهب: <b>{fmt(calc.goldGramsTotal)} جم</b> — قيمته: <b>{currency(calc.goldValue, currencyName)}</b></div>
                <div>نصاب الذهب: {GOLD_NISAB_GRAMS} جم — {calc.goldEligible ? <Badge className="bg-primary">بلغ النصاب</Badge> : <Badge variant="secondary">دون النصاب</Badge>}</div>
                <div>إجمالي الفضة: <b>{fmt(calc.silverGrams)} جم</b> — قيمتها: <b>{currency(calc.silverValue, currencyName)}</b></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cash" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Landmark className="h-5 w-5 text-primary" /> زكاة الأوراق النقدية والحسابات البنكية
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="نقد في اليد" value={cashHand} onChange={setCashHand} unit={currencyName} />
                <NumField label="حسابات جارية" value={cashBank} onChange={setCashBank} unit={currencyName} />
                <NumField label="ودائع وحسابات توفير" value={savings} onChange={setSavings} unit={currencyName} hint="الأصل دون الفوائد الربوية" />
                <NumField label="عملات أجنبية (مُقوَّمة)" value={foreignCurrency} onChange={setForeignCurrency} unit={currencyName} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="securities" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" /> زكاة الأوراق المالية والاستثمارات
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  أسهم المتاجرة: تُزكَّى بقيمتها السوقية. أسهم الاستثمار طويل الأجل: تُزكَّى الموجودات الزكوية للشركة بنسبة الملكية فقط.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="أسهم للمتاجرة (القيمة السوقية)" value={stocksTrade} onChange={setStocksTrade} unit={currencyName} />
                <NumField label="أسهم استثمار (الموجودات الزكوية)" value={stocksInvest} onChange={setStocksInvest} unit={currencyName} />
                <NumField label="صناديق استثمار وحقوق ملكية" value={mutualFunds} onChange={setMutualFunds} unit={currencyName} />
                <NumField label="سندات/صكوك (الأصل دون الفوائد)" value={bonds} onChange={setBonds} unit={currencyName} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bills" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-primary" /> زكاة الأوراق التجارية
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <NumField
                label="كمبيالات وشيكات وأوراق قبض محققة الأداء"
                value={bills} onChange={setBills} unit={currencyName}
                hint="تُحسب الأوراق التجارية المرجوة السداد فقط؛ أما المشكوك في تحصيلها فلا تُزكَّى حتى تُقبض"
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trade" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Package className="h-5 w-5 text-primary" /> زكاة عروض التجارة
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="قيمة البضاعة بسعر السوق" value={inventory} onChange={setInventory} unit={currencyName} hint="تُقوَّم بسعر البيع الجملة يوم وجوب الزكاة" />
                <NumField label="ديون لك على الغير مرجوة" value={receivables} onChange={setReceivables} unit={currencyName} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="crops" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Wheat className="h-5 w-5 text-gold" /> زكاة الزروع والثمار
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="كمية المحصول" value={cropsKg} onChange={setCropsKg} unit="كجم" hint={`النصاب: ${CROPS_NISAB_KG} كجم (5 أوسق)`} />
                <NumField label="سعر الكيلوجرام" value={cropsValuePerKg} onChange={setCropsValuePerKg} unit={currencyName} />
              </div>
              <div>
                <Label className="mb-2 block">طريقة الري</Label>
                <RadioGroup value={cropsIrrigation} onValueChange={(v) => setCropsIrrigation(v as "rain" | "irrigated")} className="flex gap-6">
                  <div className="flex items-center gap-2"><RadioGroupItem value="rain" id="rain" /><Label htmlFor="rain">سُقي بلا كلفة (مطر/أنهار) — 10%</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="irrigated" id="irr" /><Label htmlFor="irr">سُقي بكلفة (آلات/شراء) — 5%</Label></div>
                </RadioGroup>
              </div>
              {calc.cropsEligible && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs">
                  قيمة المحصول: <b>{currency(calc.cropsValue, currencyName)}</b> — النسبة: <b>{(calc.cropsRate * 100).toFixed(0)}%</b>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="livestock" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Sprout className="h-5 w-5 text-primary" /> زكاة الأنعام
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  الأنعام تُزكَّى عيناً (لا قيمتها) وفق جداول الفقه المعروفة، ويُشترط بلوغ النصاب وحولان الحول والسوم.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-3 gap-4">
                <NumField label="عدد الإبل" value={camels} onChange={setCamels} hint="النصاب: 5 من الإبل" />
                <NumField label="عدد البقر" value={cows} onChange={setCows} hint="النصاب: 30 من البقر" />
                <NumField label="عدد الغنم" value={sheep} onChange={setSheep} hint="النصاب: 40 من الغنم" />
              </div>
              <div className="space-y-2 text-sm">
                {calc.camelsN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>الإبل ({calc.camelsN}):</b> {camelZakat(calc.camelsN)}</div>}
                {calc.cowsN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>البقر ({calc.cowsN}):</b> {cowZakat(calc.cowsN)}</div>}
                {calc.sheepN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>الغنم ({calc.sheepN}):</b> {sheepZakat(calc.sheepN)}</div>}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="debts" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <MinusCircle className="h-5 w-5 text-destructive" /> الديون والالتزامات (تُخصم)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="ديون مستحقة عليك" value={shortDebts} onChange={setShortDebts} unit={currencyName} hint="القسط المستحق خلال الحول" />
                <NumField label="نفقات ضرورية مستحقة" value={expenses} onChange={setExpenses} unit={currencyName} hint="فواتير وإيجارات مستحقة" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* ملخص النتيجة - عمود ثابت */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="bg-gradient-primary text-primary-foreground shadow-gold border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-foreground">
              <Calculator className="h-5 w-5" />
              إجمالي الزكاة المستحقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tight">
              {fmt(calc.total)}
              <span className="text-lg font-medium opacity-80 mr-2">{currencyName}</span>
            </div>
            <p className="text-xs opacity-80 mt-2">
              {name && `للمزكي: ${name}`}
              {profession && ` — ${profession}`}
            </p>
            {hawlDate && <p className="text-xs opacity-80">تاريخ الحول: {hawlDate}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="text-base">تفصيل النتيجة</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <SectionResult label="زكاة الذهب" value={calc.goldZakat} eligible={calc.goldEligible} />
            <SectionResult label="زكاة الفضة" value={calc.silverZakat} eligible={calc.silverEligible} />
            <SectionResult label="زكاة النقد والأوراق المالية والتجارة (صافي)" value={calc.monetaryZakat} eligible={calc.monetaryEligible} />
            <SectionResult label="زكاة الزروع والثمار" value={calc.cropsZakat} eligible={calc.cropsEligible} />
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground space-y-1">
              <div>الوعاء النقدي الصافي: <b>{currency(calc.monetaryBase, currencyName)}</b></div>
              <div>نصاب المال (الأدنى): <b>{currency(calc.moneyNisab, currencyName)}</b></div>
              <div>إجمالي الديون المخصومة: <b>{currency(calc.debts, currencyName)}</b></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-soft">
          <CardContent className="pt-6">
            <Button className="w-full" size="lg" onClick={() => window.print()}>
              <CheckCircle2 className="h-4 w-4 ml-2" />
              طباعة الإقرار
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
