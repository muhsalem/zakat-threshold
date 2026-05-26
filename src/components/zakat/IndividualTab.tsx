import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  User, Coins, Landmark, TrendingUp, FileText, Package, Wheat, Home,
  MinusCircle, Calculator, Info, CheckCircle2, Sprout, CalendarClock, HandHeart,
} from "lucide-react";
import {
  ZAKAT_RATE, ZAKAT_RATE_GREGORIAN, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS,
  CROPS_NISAB_KG, HAWL_DAYS_HIJRI,
  num, fmt, currency, camelZakat, cowZakat, sheepZakat,
  COUNTRY_PRICES, checkHawl, formatHijri, ZAKAT_RECIPIENTS,
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
          className="pl-16"
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

function SectionResult({ label, value, eligible = true, format }: { label: string; value: number; eligible?: boolean; format: (n: number) => string }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${eligible && value > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className={`font-bold ${eligible && value > 0 ? "text-primary" : "text-muted-foreground"}`}>
        {format(value)}
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
  const [notes, setNotes] = useState("");

  // الدولة والأسعار
  const [countryCode, setCountryCode] = useState("EG");
  const country = COUNTRY_PRICES.find((c) => c.code === countryCode) ?? COUNTRY_PRICES[0];
  const [currencyName, setCurrencyName] = useState(country.currency);
  const [goldPrice, setGoldPrice] = useState(String(country.gold24));
  const [silverPrice, setSilverPrice] = useState(String(country.silver));

  useEffect(() => {
    const c = COUNTRY_PRICES.find((x) => x.code === countryCode);
    if (!c) return;
    setCurrencyName(c.currency);
    setGoldPrice(String(c.gold24));
    setSilverPrice(String(c.silver));
  }, [countryCode]);

  // الحول
  const [nisabStartDate, setNisabStartDate] = useState(""); // تاريخ بلوغ النصاب (ميلادي)
  const [calendarBasis, setCalendarBasis] = useState<"hijri" | "gregorian">("hijri");
  const hawl = useMemo(() => checkHawl(nisabStartDate), [nisabStartDate]);
  const effectiveRate = calendarBasis === "gregorian" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;

  // الذهب: تفصيل المستعمل والمكتنز
  const [goldUse24, setGoldUse24] = useState(""); // ذهب الحلي للاستعمال
  const [goldUse21, setGoldUse21] = useState("");
  const [goldUse18, setGoldUse18] = useState("");
  const [gold24, setGold24] = useState(""); // ذهب مكتنز / غير مستعمل
  const [gold21, setGold21] = useState("");
  const [gold18, setGold18] = useState("");
  const [jewelryOpinion, setJewelryOpinion] = useState<"majority" | "hanafi">("majority");
  // الفضة
  const [silver, setSilver] = useState("");

  // النقدية والبنوك
  const [cashHand, setCashHand] = useState("");
  const [cashBank, setCashBank] = useState("");
  const [savings, setSavings] = useState("");
  const [foreignCurrency, setForeignCurrency] = useState("");

  // الأوراق المالية
  const [stocksTrade, setStocksTrade] = useState("");
  const [stocksInvest, setStocksInvest] = useState("");
  const [mutualFunds, setMutualFunds] = useState("");
  const [bonds, setBonds] = useState("");

  // الأوراق التجارية
  const [bills, setBills] = useState("");

  // عروض التجارة
  const [inventory, setInventory] = useState("");
  const [receivablesGood, setReceivablesGood] = useState(""); // ديون مرجوّة
  const [receivablesBad, setReceivablesBad] = useState(""); // ديون متعذّرة (لا تُزكَّى الآن)

  // العقار
  const [realEstateTrade, setRealEstateTrade] = useState(""); // عقار للتجارة (بقيمته السوقية)
  const [realEstateRentIncome, setRealEstateRentIncome] = useState(""); // صافي إيراد الإيجار المُدّخر

  // الزروع
  const [cropsKg, setCropsKg] = useState("");
  const [cropsValuePerKg, setCropsValuePerKg] = useState("");
  const [cropsIrrigation, setCropsIrrigation] = useState<"rain" | "irrigated">("rain");

  // الأنعام
  const [camels, setCamels] = useState("");
  const [cows, setCows] = useState("");
  const [sheep, setSheep] = useState("");

  // الديون
  const [shortDebts, setShortDebts] = useState("");
  const [expenses, setExpenses] = useState("");

  // ========= الحسابات =========
  const calc = useMemo(() => {
    const gp = num(goldPrice);
    const sp = num(silverPrice);

    // الذهب المكتنز
    const hoardedGramsTotal = num(gold24) + num(gold21) + num(gold18);
    const hoardedValue = num(gold24) * gp + num(gold21) * gp * (21 / 24) + num(gold18) * gp * (18 / 24);

    // ذهب الحلي للاستعمال
    const useGramsTotal = num(goldUse24) + num(goldUse21) + num(goldUse18);
    const useValue = num(goldUse24) * gp + num(goldUse21) * gp * (21 / 24) + num(goldUse18) * gp * (18 / 24);

    // وفق الرأي المختار: الجمهور لا يزكّون المستعمل، الحنفية يزكّونه
    const countableGoldGrams = jewelryOpinion === "hanafi" ? hoardedGramsTotal + useGramsTotal : hoardedGramsTotal;
    const countableGoldValue = jewelryOpinion === "hanafi" ? hoardedValue + useValue : hoardedValue;
    const goldEligible = countableGoldGrams >= GOLD_NISAB_GRAMS;
    const goldZakat = goldEligible ? countableGoldValue * effectiveRate : 0;

    const silverGrams = num(silver);
    const silverValue = silverGrams * sp;
    const silverEligible = silverGrams >= SILVER_NISAB_GRAMS;
    const silverZakat = silverEligible ? silverValue * effectiveRate : 0;

    const cashTotal = num(cashHand) + num(cashBank) + num(savings) + num(foreignCurrency);
    const securitiesTotal = num(stocksTrade) + num(stocksInvest) + num(mutualFunds) + num(bonds);
    const billsTotal = num(bills);
    const tradeTotal = num(inventory) + num(receivablesGood);
    const realEstateZakatable = num(realEstateTrade) + num(realEstateRentIncome);

    const goldNisabValue = GOLD_NISAB_GRAMS * gp;
    const silverNisabValue = SILVER_NISAB_GRAMS * sp;
    const moneyNisab = Math.min(goldNisabValue, silverNisabValue);

    const debts = num(shortDebts) + num(expenses);
    const monetaryGross = cashTotal + securitiesTotal + billsTotal + tradeTotal + realEstateZakatable;
    const monetaryBase = monetaryGross - debts;
    const monetaryEligible = monetaryBase >= moneyNisab && monetaryBase > 0;
    const monetaryZakat = monetaryEligible ? monetaryBase * effectiveRate : 0;

    // الزروع (لا يُشترط لها حول)
    const cropsKgN = num(cropsKg);
    const cropsValue = cropsKgN * num(cropsValuePerKg);
    const cropsRate = cropsIrrigation === "rain" ? 0.1 : 0.05;
    const cropsEligible = cropsKgN >= CROPS_NISAB_KG;
    const cropsZakat = cropsEligible ? cropsValue * cropsRate : 0;

    const camelsN = Math.floor(num(camels));
    const cowsN = Math.floor(num(cows));
    const sheepN = Math.floor(num(sheep));

    // الزكاة المالية (تشترط الحول) — لا نحسبها إن لم يكتمل الحول وكان التاريخ مُدخلًا
    const hawlBlocks = hawl !== null && !hawl.hawlComplete;
    const monetaryGoldZakat = hawlBlocks ? 0 : (goldZakat + silverZakat + monetaryZakat);
    const total = monetaryGoldZakat + cropsZakat;

    return {
      hoardedGramsTotal, useGramsTotal, countableGoldGrams, countableGoldValue,
      goldEligible, goldZakat: hawlBlocks ? 0 : goldZakat,
      silverGrams, silverValue, silverEligible, silverZakat: hawlBlocks ? 0 : silverZakat,
      cashTotal, securitiesTotal, billsTotal, tradeTotal, realEstateZakatable, debts,
      monetaryGross, monetaryBase, monetaryEligible, monetaryZakat: hawlBlocks ? 0 : monetaryZakat,
      moneyNisab, goldNisabValue, silverNisabValue,
      cropsValue, cropsRate, cropsEligible, cropsZakat,
      camelsN, cowsN, sheepN,
      total, hawlBlocks,
    };
  }, [
    goldPrice, silverPrice, gold24, gold21, gold18, goldUse24, goldUse21, goldUse18,
    jewelryOpinion, silver, cashHand, cashBank, savings, foreignCurrency,
    stocksTrade, stocksInvest, mutualFunds, bonds, bills,
    inventory, receivablesGood, realEstateTrade, realEstateRentIncome,
    shortDebts, expenses, cropsKg, cropsValuePerKg, cropsIrrigation,
    camels, cows, sheep, effectiveRate, hawl,
  ]);

  const cur = (n: number) => currency(n, currencyName);

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
              <Label>الدولة</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRY_PRICES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>العملة</Label>
              <Input value={currencyName} onChange={(e) => setCurrencyName(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* الإقرار وشرط الحول */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              الإقرار وشرط الحَوْل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>تاريخ بلوغ النصاب (ميلادي)</Label>
                <Input type="date" value={nisabStartDate} onChange={(e) => setNisabStartDate(e.target.value)} />
                {hawl && (
                  <p className="text-xs text-muted-foreground">
                    الموافق هجريًا: <b>{formatHijri(hawl.hijriStart)}</b>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>أساس حساب الحول</Label>
                <RadioGroup value={calendarBasis} onValueChange={(v) => setCalendarBasis(v as "hijri" | "gregorian")} className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2"><RadioGroupItem value="hijri" id="cb-h" /><Label htmlFor="cb-h" className="text-sm">هجري — نسبة 2.5%</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="gregorian" id="cb-g" /><Label htmlFor="cb-g" className="text-sm">ميلادي — نسبة 2.577% (معدّلة)</Label></div>
                </RadioGroup>
              </div>
            </div>

            {hawl && (
              <Alert className={hawl.hawlComplete ? "border-primary/30 bg-primary/5" : "border-destructive/40 bg-destructive/5"}>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {hawl.hawlComplete ? (
                    <>اكتمل الحَوْل (مضى <b>{hawl.daysPassed} يومًا</b> ≥ {HAWL_DAYS_HIJRI} يوم هجري). تجب الزكاة على الأموال التي حال عليها الحول.</>
                  ) : (
                    <>لم يكتمل الحول بعد — مضى <b>{hawl.daysPassed} يومًا</b> ويتبقى <b>{hawl.daysRemaining} يومًا</b> لإكمال 354 يومًا هجريًا. لا تجب زكاة النقد والذهب الآن (الزروع والثمار لا تشترط حولًا).</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {calendarBasis === "gregorian" && (
              <Alert className="border-gold/30 bg-gold/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  وفق قرار الندوة السابعة لقضايا الزكاة (الكويت 1417هـ): من حسب زكاته على السنة الميلادية يُضاعف المعدل من 2.5% إلى <b>2.577%</b> لجبر فرق 11 يومًا تقريبًا بين السنتين.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label className="mb-2 block">ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي ملاحظات إضافية" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* الأسعار */}
        <Card className="border-gold/30 shadow-soft">
          <CardHeader className="bg-gradient-to-l from-gold/15 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-gold" />
              الأسعار المرجعية اليوم — {country.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
            <NumField label="سعر جرام الذهب عيار 24" value={goldPrice} onChange={setGoldPrice} unit={currencyName} />
            <NumField label="سعر جرام الفضة الخالصة" value={silverPrice} onChange={setSilverPrice} unit={currencyName} />
            <div className="md:col-span-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              نصاب الذهب: <b>{cur(calc.goldNisabValue)}</b> — نصاب الفضة: <b>{cur(calc.silverNisabValue)}</b> — الأنفع للفقراء: <b>{cur(calc.moneyNisab)}</b>
            </div>
          </CardContent>
        </Card>

        {/* الأبواب */}
        <Accordion type="multiple" defaultValue={["gold", "cash"]} className="space-y-3">
          {/* الذهب والفضة */}
          <AccordionItem value="gold" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Coins className="h-5 w-5 text-gold" /> زكاة الذهب والفضة
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-4">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-primary">أ) الذهب المُكتنز / الادخار / السبائك</div>
                <div className="grid md:grid-cols-3 gap-4">
                  <NumField label="ذهب عيار 24" value={gold24} onChange={setGold24} unit="جرام" />
                  <NumField label="ذهب عيار 21" value={gold21} onChange={setGold21} unit="جرام" />
                  <NumField label="ذهب عيار 18" value={gold18} onChange={setGold18} unit="جرام" />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-sm font-semibold text-primary">ب) ذهب الحلي للاستعمال (المرأة)</div>
                <Alert className="border-gold/30 bg-gold/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    <b>خلاف فقهي:</b> الجمهور (المالكية والشافعية والحنابلة) على أن حلي المرأة المُعدّ للاستعمال المباح <b>لا زكاة فيه</b>.
                    والحنفية يرون <b>وجوب الزكاة فيه</b> إذا بلغ النصاب. اختر ما تطمئن إليه بعد المراجعة.
                  </AlertDescription>
                </Alert>
                <div className="grid md:grid-cols-3 gap-4">
                  <NumField label="حلي عيار 24" value={goldUse24} onChange={setGoldUse24} unit="جرام" />
                  <NumField label="حلي عيار 21" value={goldUse21} onChange={setGoldUse21} unit="جرام" />
                  <NumField label="حلي عيار 18" value={goldUse18} onChange={setGoldUse18} unit="جرام" />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">إخضاع الحلي المُستعمَل للزكاة (رأي الحنفية)</Label>
                    <p className="text-xs text-muted-foreground">إيقافه = اتباع رأي الجمهور (لا زكاة على المُستعمَل)</p>
                  </div>
                  <Switch checked={jewelryOpinion === "hanafi"} onCheckedChange={(v) => setJewelryOpinion(v ? "hanafi" : "majority")} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-sm font-semibold text-primary">ج) الفضة</div>
                <NumField label="الفضة الخالصة" value={silver} onChange={setSilver} unit="جرام" hint={`النصاب: ${SILVER_NISAB_GRAMS} جم`} />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <div>المكتنز: <b>{fmt(calc.hoardedGramsTotal)} جم</b> — حلي الاستعمال: <b>{fmt(calc.useGramsTotal)} جم</b></div>
                <div>الخاضع للزكاة (وفق الرأي المختار): <b>{fmt(calc.countableGoldGrams)} جم</b> — قيمته: <b>{cur(calc.countableGoldValue)}</b></div>
                <div>نصاب الذهب: {GOLD_NISAB_GRAMS} جم — {calc.goldEligible ? <Badge className="bg-primary">بلغ النصاب</Badge> : <Badge variant="secondary">دون النصاب</Badge>}</div>
                <div>الفضة: <b>{fmt(calc.silverGrams)} جم</b> ({cur(calc.silverValue)})</div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* النقد */}
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

          {/* الأوراق المالية */}
          <AccordionItem value="securities" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" /> زكاة الأوراق المالية والاستثمارات
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b>أسهم المتاجرة</b> (نية البيع والشراء): تُزكَّى بكامل قيمتها السوقية.
                  <br />
                  <b>أسهم الاستثمار طويل الأجل</b>: تُزكَّى حصة المساهم من الموجودات الزكوية للشركة (النقد + الذمم + المخزون) دون الأصول الثابتة.
                  <br />
                  <b>السندات</b>: الأصل فقط يُزكَّى، والفوائد محرّمة فيُتخلَّص منها في وجوه الخير دون نية الأجر.
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

          {/* الأوراق التجارية */}
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
                hint="المرجوة السداد فقط؛ أما المشكوك في تحصيلها فلا تُزكَّى حتى تُقبض، ثم زكاة سنة واحدة"
              />
            </AccordionContent>
          </AccordionItem>

          {/* عروض التجارة */}
          <AccordionItem value="trade" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Package className="h-5 w-5 text-primary" /> زكاة عروض التجارة والديون
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="قيمة البضاعة بسعر السوق" value={inventory} onChange={setInventory} unit={currencyName} hint="تُقوَّم بسعر بيع الجملة يوم وجوب الزكاة" />
                <NumField label="ديون مرجوّة لك على الغير" value={receivablesGood} onChange={setReceivablesGood} unit={currencyName} hint="على مَليء مُقرّ بها" />
                <NumField
                  label="ديون متعذّرة (على معسر أو جاحد)"
                  value={receivablesBad} onChange={setReceivablesBad} unit={currencyName}
                  hint="لا تُزكَّى حتى تُقبض، ثم زكاة سنة واحدة فقط — لا تُحتسب الآن"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* العقار */}
          <AccordionItem value="realestate" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Home className="h-5 w-5 text-primary" /> زكاة العقار
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b>عقار السكن الخاص:</b> لا زكاة فيه إجماعًا.
                  <br />
                  <b>عقار التجارة</b> (مُعدّ للبيع): يُزكَّى بكامل قيمته السوقية يوم وجوب الزكاة.
                  <br />
                  <b>عقار الإيجار/الاستغلال:</b> لا زكاة في رقبته، وإنما في صافي إيراده المُدّخر بعد النفقات إذا بلغ النصاب وحال عليه الحول.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-4">
                <NumField label="عقار للتجارة (القيمة السوقية)" value={realEstateTrade} onChange={setRealEstateTrade} unit={currencyName} />
                <NumField label="صافي إيراد الإيجار المُدّخر" value={realEstateRentIncome} onChange={setRealEstateRentIncome} unit={currencyName} hint="بعد خصم المصاريف والنفقات الضرورية" />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* الزروع */}
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
                <RadioGroup value={cropsIrrigation} onValueChange={(v) => setCropsIrrigation(v as "rain" | "irrigated")} className="flex flex-col md:flex-row gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="rain" id="rain" /><Label htmlFor="rain">سُقي بلا كلفة (مطر/أنهار) — 10%</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="irrigated" id="irr" /><Label htmlFor="irr">سُقي بكلفة (آلات/شراء) — 5%</Label></div>
                </RadioGroup>
              </div>
              {calc.cropsEligible && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs">
                  قيمة المحصول: <b>{cur(calc.cropsValue)}</b> — النسبة: <b>{(calc.cropsRate * 100).toFixed(0)}%</b>
                </div>
              )}
              <p className="text-xs text-muted-foreground">ملاحظة: الزروع لا تشترط حولًا، وإنما تجب يوم الحصاد.</p>
            </AccordionContent>
          </AccordionItem>

          {/* الأنعام */}
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
                  الأنعام تُزكَّى عيناً (لا قيمتها)، ويُشترط بلوغ النصاب وحولان الحول وسومُها (رعيها) أكثر السنة.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-3 gap-4">
                <NumField label="عدد الإبل" value={camels} onChange={setCamels} hint="النصاب: 5" />
                <NumField label="عدد البقر" value={cows} onChange={setCows} hint="النصاب: 30" />
                <NumField label="عدد الغنم" value={sheep} onChange={setSheep} hint="النصاب: 40" />
              </div>
              <div className="space-y-2 text-sm">
                {calc.camelsN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>الإبل ({calc.camelsN}):</b> {camelZakat(calc.camelsN)}</div>}
                {calc.cowsN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>البقر ({calc.cowsN}):</b> {cowZakat(calc.cowsN)}</div>}
                {calc.sheepN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>الغنم ({calc.sheepN}):</b> {sheepZakat(calc.sheepN)}</div>}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* الديون */}
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

          {/* مصارف الزكاة */}
          <AccordionItem value="recipients" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <HandHeart className="h-5 w-5 text-gold" /> مصارف الزكاة الثمانية
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <Alert className="border-gold/30 bg-gold/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  قال تعالى: ﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ﴾ [التوبة: 60].
                </AlertDescription>
              </Alert>
              <div className="grid sm:grid-cols-2 gap-2">
                {ZAKAT_RECIPIENTS.map((r, i) => (
                  <div key={i} className="rounded-md border bg-card/50 px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className="bg-gradient-gold text-gold-foreground text-[10px]">{i + 1}</Badge>
                      <span className="font-semibold text-sm text-primary">{r.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* ملخص النتيجة */}
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
              نسبة: {(effectiveRate * 100).toFixed(3)}% — تقويم {calendarBasis === "hijri" ? "هجري" : "ميلادي"}
            </p>
            {name && <p className="text-xs opacity-80 mt-1">{name}{profession && ` — ${profession}`}</p>}
            {hawl && (
              <p className="text-xs opacity-80 mt-1">
                {hawl.hawlComplete ? "✓ اكتمل الحول" : `⏳ الحول لم يكتمل (${hawl.daysRemaining} يوم متبقي)`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="text-base">تفصيل النتيجة</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <SectionResult currency={cur} label="زكاة الذهب" value={calc.goldZakat} eligible={calc.goldEligible} />
            <SectionResult currency={cur} label="زكاة الفضة" value={calc.silverZakat} eligible={calc.silverEligible} />
            <SectionResult currency={cur} label="زكاة النقد والاستثمارات والتجارة والعقار (صافي)" value={calc.monetaryZakat} eligible={calc.monetaryEligible} />
            <SectionResult currency={cur} label="زكاة الزروع والثمار" value={calc.cropsZakat} eligible={calc.cropsEligible} />
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground space-y-1">
              <div>الوعاء النقدي الإجمالي: <b>{cur(calc.monetaryGross)}</b></div>
              <div>الوعاء النقدي الصافي: <b>{cur(calc.monetaryBase)}</b></div>
              <div>نصاب المال (الأنفع للفقراء): <b>{cur(calc.moneyNisab)}</b></div>
              <div>إجمالي الديون المخصومة: <b>{cur(calc.debts)}</b></div>
            </div>
            {calc.hawlBlocks && (
              <Alert className="border-destructive/40 bg-destructive/5 mt-2">
                <AlertDescription className="text-xs">
                  لم يكتمل الحول — تم إيقاف حساب زكاة الذهب والنقد. ستظهر تلقائيًا عند اكتمال 354 يومًا هجريًا.
                </AlertDescription>
              </Alert>
            )}
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
