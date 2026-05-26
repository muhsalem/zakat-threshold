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

  // ========= الذهب: 4 أقسام =========
  // أ) السبائك والأونصات
  const [sb9, setSb9] = useState(""); const [sb14, setSb14] = useState("");
  const [sb18, setSb18] = useState(""); const [sb21, setSb21] = useState("");
  const [sb22, setSb22] = useState(""); const [sb24, setSb24] = useState("");
  const [ounces, setOunces] = useState("");
  // ب) الجنيهات والعملات الذهبية (عيار 21)
  const [coinQuarter, setCoinQuarter] = useState(""); // 2.125 جم
  const [coinHalf, setCoinHalf] = useState("");       // 4.25 جم
  const [coinFull, setCoinFull] = useState("");       // 8.5 جم
  const [coinCustomKarat, setCoinCustomKarat] = useState("21");
  const [coinCustomWeight, setCoinCustomWeight] = useState("8.5");
  const [coinCustomQty, setCoinCustomQty] = useState("");
  // ج) المجوهرات
  const [jw9, setJw9] = useState(""); const [jw12, setJw12] = useState("");
  const [jw14, setJw14] = useState(""); const [jw18, setJw18] = useState("");
  const [jw21, setJw21] = useState(""); const [jw22, setJw22] = useState("");
  const [jw24, setJw24] = useState("");
  const [jewelryPurpose, setJewelryPurpose] = useState<"storage" | "wear">("wear");
  const [jewelryOpinion, setJewelryOpinion] = useState<"majority" | "hanafi">("majority");
  // د) المشغولات الذهبية الأخرى
  const [brk18, setBrk18] = useState(""); const [brk21, setBrk21] = useState("");
  const [brk24, setBrk24] = useState("");
  const [brkOtherKarat, setBrkOtherKarat] = useState("9");
  const [brkOtherWeight, setBrkOtherWeight] = useState("");
  const [storageKarat, setStorageKarat] = useState("21");
  const [storageWeight, setStorageWeight] = useState("");
  // الفضة
  // ========= الفضة: 3 أقسام =========
  // أ) السبائك والأونصات الفضية (المفتاح = العيار/الألفي)
  const [sv999, setSv999] = useState(""); const [sv960, setSv960] = useState("");
  const [sv925, setSv925] = useState(""); const [sv900, setSv900] = useState("");
  const [sv835, setSv835] = useState(""); const [sv800, setSv800] = useState("");
  const [sv750, setSv750] = useState(""); const [svOunces, setSvOunces] = useState("");
  // ب) الجنيهات والعملات الفضية
  const [coinLira, setCoinLira] = useState("");        // ليرة عثمانية 12جم عيار 830
  const [coinRiyal, setCoinRiyal] = useState("");      // ريال فضة (وزن كلي بعيار 900)
  const [coinSvOtherKarat, setCoinSvOtherKarat] = useState("800");
  const [coinSvOther, setCoinSvOther] = useState("");
  // ج) مجوهرات ومشغولات وأدوات
  const [svJewelry, setSvJewelry] = useState("");      // مجوهرات وإكسسوارات
  const [svJewelryKarat, setSvJewelryKarat] = useState("925");
  const [svUtensils, setSvUtensils] = useState("");    // ملاعق صواني فناجين سبح
  const [svUtensilsKarat, setSvUtensilsKarat] = useState("925");
  const [svTools, setSvTools] = useState("");          // أدوات ومستلزمات وتحف
  const [svToolsKarat, setSvToolsKarat] = useState("800");
  const [silverPurpose, setSilverPurpose] = useState<"storage" | "wear">("wear");
  const [silverOpinion, setSilverOpinion] = useState<"majority" | "hanafi">("majority");

  // النقدية والبنوك (المجموع يُحسب داخل المكوّن المتخصّص ويُمرَّر هنا)
  const [cashTotalFromSection, setCashTotalFromSection] = useState(0);

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

    // ====== الذهب: تحويل كل الأعيرة إلى ما يكافئها بعيار 24 ======
    const OUNCE_G = 31.1035;
    const conv = (grams: number, karat: number) => (grams * karat) / 24;

    // أ) السبائك والأونصات
    const sabaikGrams24 =
      conv(num(sb9), 9) + conv(num(sb14), 14) + conv(num(sb18), 18) +
      conv(num(sb21), 21) + conv(num(sb22), 22) + num(sb24) +
      num(ounces) * OUNCE_G;

    // ب) الجنيهات والعملات الذهبية (الجنيه المصري عيار 21)
    const coinsGrams21 = num(coinQuarter) * 2.125 + num(coinHalf) * 4.25 + num(coinFull) * 8.5;
    const coinsCustomGrams = num(coinCustomWeight) * num(coinCustomQty);
    const coinsGrams24 = conv(coinsGrams21, 21) + conv(coinsCustomGrams, num(coinCustomKarat));

    // ج) المجوهرات
    const jewelryGrams24Raw =
      conv(num(jw9), 9) + conv(num(jw12), 12) + conv(num(jw14), 14) +
      conv(num(jw18), 18) + conv(num(jw21), 21) + conv(num(jw22), 22) + num(jw24);
    // ادخار وحفظ قيمة → دائماً، حلي وزينة → حسب الرأي الفقهي
    const jewelryGrams24 = jewelryPurpose === "storage"
      ? jewelryGrams24Raw
      : (jewelryOpinion === "hanafi" ? jewelryGrams24Raw : 0);

    // د) المشغولات الأخرى (كسر + ادخاري غير قابل للبس) → دائماً تُزكَّى
    const brokenGrams24 =
      conv(num(brk18), 18) + conv(num(brk21), 21) + num(brk24) +
      conv(num(brkOtherWeight), num(brkOtherKarat));
    const storageGrams24 = conv(num(storageWeight), num(storageKarat));
    const otherGrams24 = brokenGrams24 + storageGrams24;

    const totalGold24 = sabaikGrams24 + coinsGrams24 + jewelryGrams24 + otherGrams24;
    const totalGoldValue = totalGold24 * gp;
    const goldEligible = totalGold24 >= GOLD_NISAB_GRAMS;
    const goldZakat = goldEligible ? totalGoldValue * effectiveRate : 0;

    // ====== الفضة: تحويل كل العيارات إلى ما يكافئها بعيار 999 ======
    const OUNCE_SV = 31.1035;
    const convSv = (grams: number, purity: number) => (grams * purity) / 1000;

    // أ) السبائك والأونصات (الأونصة الفضية عيار 999)
    const svSabaikG999 =
      num(sv999) + convSv(num(sv960), 960) + convSv(num(sv925), 925) +
      convSv(num(sv900), 900) + convSv(num(sv835), 835) + convSv(num(sv800), 800) +
      convSv(num(sv750), 750) + num(svOunces) * OUNCE_SV;

    // ب) العملات الفضية
    const svCoinsG999 =
      convSv(num(coinLira) * 12, 830) +
      convSv(num(coinRiyal), 900) +
      convSv(num(coinSvOther), num(coinSvOtherKarat));

    // ج) المجوهرات والمشغولات (تخضع حسب رأي/غرض الاقتناء — كالذهب)
    const svJewelryG999Raw =
      convSv(num(svJewelry), num(svJewelryKarat)) +
      convSv(num(svUtensils), num(svUtensilsKarat)) +
      convSv(num(svTools), num(svToolsKarat));
    const svJewelryG999 = silverPurpose === "storage"
      ? svJewelryG999Raw
      : (silverOpinion === "hanafi" ? svJewelryG999Raw : 0);

    const silverGrams = svSabaikG999 + svCoinsG999 + svJewelryG999;
    const silverValue = silverGrams * sp;
    const silverEligible = silverGrams >= SILVER_NISAB_GRAMS;
    const silverZakat = silverEligible ? silverValue * effectiveRate : 0;

    const cashTotal = cashTotalFromSection;
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
      sabaikGrams24, coinsGrams24, jewelryGrams24, jewelryGrams24Raw, otherGrams24,
      totalGold24, totalGoldValue,
      goldEligible, goldZakat: hawlBlocks ? 0 : goldZakat,
      svSabaikG999, svCoinsG999, svJewelryG999, svJewelryG999Raw,
      silverGrams, silverValue, silverEligible, silverZakat: hawlBlocks ? 0 : silverZakat,
      cashTotal, securitiesTotal, billsTotal, tradeTotal, realEstateZakatable, debts,
      monetaryGross, monetaryBase, monetaryEligible, monetaryZakat: hawlBlocks ? 0 : monetaryZakat,
      moneyNisab, goldNisabValue, silverNisabValue,
      cropsValue, cropsRate, cropsEligible, cropsZakat,
      camelsN, cowsN, sheepN,
      total, hawlBlocks,
    };
  }, [
    goldPrice, silverPrice,
    sb9, sb14, sb18, sb21, sb22, sb24, ounces,
    coinQuarter, coinHalf, coinFull, coinCustomKarat, coinCustomWeight, coinCustomQty,
    jw9, jw12, jw14, jw18, jw21, jw22, jw24, jewelryPurpose, jewelryOpinion,
    brk18, brk21, brk24, brkOtherKarat, brkOtherWeight, storageKarat, storageWeight,
    stocksTrade, stocksInvest, mutualFunds, bonds, bills,
    inventory, receivablesGood, realEstateTrade, realEstateRentIncome,
    shortDebts, expenses, cropsKg, cropsValuePerKg, cropsIrrigation,
    camels, cows, sheep, effectiveRate, hawl, cashTotalFromSection,
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
          {/* زكاة الذهب */}
          <AccordionItem value="gold" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Coins className="h-5 w-5 text-gold" /> زكاة الذهب
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-4">
              {/* أ) السبائك والأونصات */}
              <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <div className="text-sm font-semibold text-primary">أ · السبائك والأونصات الذهبية</div>
                <p className="text-xs text-muted-foreground">أدخل الأوزان بالجرام فقط — السعر يُؤخذ للحساب أسفل هذا القسم</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <NumField label="سبائك 24" value={sb24} onChange={setSb24} unit="جم" />
                  <NumField label="سبائك 22" value={sb22} onChange={setSb22} unit="جم" />
                  <NumField label="سبائك 21" value={sb21} onChange={setSb21} unit="جم" />
                  <NumField label="سبائك 18" value={sb18} onChange={setSb18} unit="جم" />
                  <NumField label="سبائك 14" value={sb14} onChange={setSb14} unit="جم" />
                  <NumField label="سبائك 9" value={sb9} onChange={setSb9} unit="جم" />
                  <NumField label="أونصات" value={ounces} onChange={setOunces} unit="أوقية" hint="1 أونصة = 31.1 جم" />
                  <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground">الوزن المكافئ بعيار 24</span>
                    <span className="text-lg font-bold text-primary">{fmt(calc.sabaikGrams24)} جم</span>
                  </div>
                </div>
              </div>

              {/* ب) الجنيهات والعملات الذهبية */}
              <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm font-semibold text-primary">ب · الجنيهات والعملات الذهبية</div>
                  <Badge variant="secondary" className="text-[10px]">الجنيه الكامل ≈ 8.5 جم عيار 21</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <NumField label="جنيه كامل" value={coinFull} onChange={setCoinFull} unit="قطعة" />
                  <NumField label="نصف جنيه" value={coinHalf} onChange={setCoinHalf} unit="قطعة" />
                  <NumField label="ربع جنيه" value={coinQuarter} onChange={setCoinQuarter} unit="قطعة" />
                  <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground">الوزن المكافئ بعيار 24</span>
                    <span className="text-lg font-bold text-primary">{fmt(calc.coinsGrams24)} جم</span>
                  </div>
                </div>
                <div className="rounded-md border border-dashed p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">عملة ذهبية أو قطعة بعيار / وزن مختلف (اختياري)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">العيار</Label>
                      <Select value={coinCustomKarat} onValueChange={setCoinCustomKarat}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["9", "12", "14", "18", "21", "22", "24"].map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <NumField label="الوزن لكل قطعة (جم)" value={coinCustomWeight} onChange={setCoinCustomWeight} unit="جم" />
                    <NumField label="عدد القطع" value={coinCustomQty} onChange={setCoinCustomQty} unit="قطعة" />
                  </div>
                </div>
              </div>

              {/* ج) المجوهرات */}
              <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <div className="text-sm font-semibold text-primary">ج · المجوهرات الذهبية</div>
                <p className="text-xs text-muted-foreground">الخواتم · الدبل · السلاسل · الأساور · الحلقان · الأنسيالات · الكوليهات · التيجان</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <NumField label="عيار 24" value={jw24} onChange={setJw24} unit="جم" />
                  <NumField label="عيار 22" value={jw22} onChange={setJw22} unit="جم" />
                  <NumField label="عيار 21" value={jw21} onChange={setJw21} unit="جم" />
                  <NumField label="عيار 18" value={jw18} onChange={setJw18} unit="جم" />
                  <NumField label="عيار 14" value={jw14} onChange={setJw14} unit="جم" />
                  <NumField label="عيار 12" value={jw12} onChange={setJw12} unit="جم" />
                  <NumField label="عيار 9" value={jw9} onChange={setJw9} unit="جم" />
                  <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                    <span className="text-xs text-muted-foreground">المكافئ بعيار 24</span>
                    <span className="text-lg font-bold text-primary">{fmt(calc.jewelryGrams24Raw)} جم</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">غرض الاقتناء</Label>
                    <RadioGroup value={jewelryPurpose} onValueChange={(v) => setJewelryPurpose(v as "storage" | "wear")} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="wear" id="jp-w" /><Label htmlFor="jp-w" className="text-sm">حلي وزينة</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="storage" id="jp-s" /><Label htmlFor="jp-s" className="text-sm">ادخار وحفظ قيمة</Label></div>
                    </RadioGroup>
                  </div>
                  {jewelryPurpose === "wear" && (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm">إخضاع حلي الزينة للزكاة (رأي الحنفية)</Label>
                        <p className="text-[10px] text-muted-foreground">إيقافه = رأي الجمهور (لا زكاة على المستعمل)</p>
                      </div>
                      <Switch checked={jewelryOpinion === "hanafi"} onCheckedChange={(v) => setJewelryOpinion(v ? "hanafi" : "majority")} />
                    </div>
                  )}
                </div>
              </div>

              {/* د) المشغولات الذهبية الأخرى */}
              <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <div className="text-sm font-semibold text-primary">د · المشغولات الذهبية الأخرى</div>
                <p className="text-xs text-muted-foreground">ذهب مستعمل وكسر (للتهشيم — قِدَم الطراز — مكسور) + ذهب ادخاري غير قابل للبس</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <NumField label="كسر عيار 24" value={brk24} onChange={setBrk24} unit="جم" />
                  <NumField label="كسر عيار 21" value={brk21} onChange={setBrk21} unit="جم" />
                  <NumField label="كسر عيار 18" value={brk18} onChange={setBrk18} unit="جم" />
                  <div className="rounded-md border bg-background p-3 space-y-1">
                    <Label className="text-xs">كسر عيار آخر</Label>
                    <div className="flex gap-1">
                      <Select value={brkOtherKarat} onValueChange={setBrkOtherKarat}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["9", "12", "14", "22"].map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="0" value={brkOtherWeight} onChange={(e) => setBrkOtherWeight(e.target.value)} placeholder="0" dir="ltr" style={{ textAlign: "right" }} />
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-dashed p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">ذهب ادخاري غير قابل للبس (ميداليات · جُعَل · ألواح · قطع تذكارية)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">العيار</Label>
                      <Select value={storageKarat} onValueChange={setStorageKarat}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["9", "12", "14", "18", "21", "22", "24"].map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <NumField label="الوزن (جرام)" value={storageWeight} onChange={setStorageWeight} unit="جم" />
                    <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                      <span className="text-xs text-muted-foreground">المكافئ بعيار 24</span>
                      <span className="text-lg font-bold text-primary">{fmt(calc.otherGrams24)} جم</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* الإجمالي وربط السعر */}
              <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-l from-primary/10 to-gold/10 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm font-bold text-primary">إجمالي الوعاء الزكوي من الذهب</div>
                  {calc.goldEligible
                    ? <Badge className="bg-primary">بلغ النصاب</Badge>
                    : <Badge variant="secondary">دون النصاب ({GOLD_NISAB_GRAMS} جم)</Badge>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">سبائك وأونصات</div>
                    <div className="font-bold">{fmt(calc.sabaikGrams24)} جم</div>
                  </div>
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">جنيهات وعملات</div>
                    <div className="font-bold">{fmt(calc.coinsGrams24)} جم</div>
                  </div>
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">مجوهرات (خاضعة)</div>
                    <div className="font-bold">{fmt(calc.jewelryGrams24)} جم</div>
                  </div>
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">مشغولات أخرى</div>
                    <div className="font-bold">{fmt(calc.otherGrams24)} جم</div>
                  </div>
                </div>
                <Separator />
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">إجمالي الوزن بعيار 24</div>
                    <div className="text-xl font-extrabold text-gold">{fmt(calc.totalGold24)} جم</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">× سعر جرام عيار 24 اليوم</div>
                    <div className="text-xl font-extrabold">{cur(num(goldPrice))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">قيمة الوعاء الذهبي</div>
                    <div className="text-xl font-extrabold text-primary">{cur(calc.totalGoldValue)}</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  تمت معادلة جميع الأعيرة (9 · 12 · 14 · 18 · 21 · 22) إلى عيار 24 بمعامل (العيار ÷ 24)، ثم ضُربت في سعر اليوم لجرام عيار 24.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* زكاة الفضة */}
          <AccordionItem value="silver" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Coins className="h-5 w-5 text-muted-foreground" /> زكاة الفضة
                <Badge variant="secondary" className="text-[10px] mr-2">النصاب: {SILVER_NISAB_GRAMS} جم عيار 999</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-4">
              {/* أ) السبائك والأونصات الفضية */}
              <div className="space-y-3 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
                <div className="text-sm font-semibold text-primary">أ · السبائك والأونصات الفضية</div>
                <p className="text-xs text-muted-foreground">أدخل الأوزان بالجرام — السعر يُؤخذ للحساب أسفل القسم</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <NumField label="عيار 999 (خالصة)" value={sv999} onChange={setSv999} unit="جم" />
                  <NumField label="عيار 960" value={sv960} onChange={setSv960} unit="جم" />
                  <NumField label="عيار 925 (استرلينج)" value={sv925} onChange={setSv925} unit="جم" />
                  <NumField label="عيار 900" value={sv900} onChange={setSv900} unit="جم" />
                  <NumField label="عيار 835" value={sv835} onChange={setSv835} unit="جم" />
                  <NumField label="عيار 800" value={sv800} onChange={setSv800} unit="جم" />
                  <NumField label="عيار 750" value={sv750} onChange={setSv750} unit="جم" />
                  <NumField label="أونصات" value={svOunces} onChange={setSvOunces} unit="أوقية" hint="1 أونصة = 31.1 جم" />
                </div>
                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">إجمالي وزن الفضة المكافئ بعيار 999 (جميع الأعيرة + الأونصات)</span>
                  <span className="text-lg font-bold text-gold">{fmt(calc.svSabaikG999)} جم عيار 999</span>
                </div>
              </div>

              {/* ب) الجنيهات والعملات الفضية */}
              <div className="space-y-3 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
                <div className="text-sm font-semibold text-primary">ب · الجنيهات والعملات الفضية</div>
                <div className="grid md:grid-cols-2 gap-3">
                  <NumField label="ليرة عثمانية فضة" value={coinLira} onChange={setCoinLira} unit="قطعة" hint="≈ 12 جم عيار 830" />
                  <NumField label="ريال فضة / مسكوكات (الوزن الكلي)" value={coinRiyal} onChange={setCoinRiyal} unit="جم" hint="افتراض عيار 900" />
                </div>
                <div className="rounded-md border border-dashed p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">عملات فضية أخرى — العيار والوزن الكلي</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">العيار</Label>
                      <Select value={coinSvOtherKarat} onValueChange={setCoinSvOtherKarat}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["999", "960", "925", "900", "835", "800", "750"].map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <NumField label="الوزن الكلي (جم)" value={coinSvOther} onChange={setCoinSvOther} unit="جم" />
                    <div className="rounded-md border bg-background p-3 flex flex-col justify-center">
                      <span className="text-xs text-muted-foreground">إجمالي العملات بعيار 999</span>
                      <span className="text-lg font-bold text-gold">{fmt(calc.svCoinsG999)} جم</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ج) المجوهرات والمشغولات */}
              <div className="space-y-3 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4">
                <div className="text-sm font-semibold text-primary">ج · مجوهرات ومشغولات فضية</div>
                <Alert className="border-muted-foreground/30 bg-background">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    <b>متى تجب الزكاة على الحُلي الفضي؟</b> الجمهور: لا زكاة على الحلي المستعمل المباح. الحنفية: تجب إذا بلغ النصاب. أمّا المعدّ للادخار وحفظ القيمة فتجب فيه الزكاة باتفاق.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <NumField label="وزن المجوهرات (خواتم · أساور · سلاسل · أقراط · دلايات · خلاخل)" value={svJewelry} onChange={setSvJewelry} unit="جم" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">العيار</Label>
                    <Select value={svJewelryKarat} onValueChange={setSvJewelryKarat}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["999", "925", "900", "835", "800", "750"].map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <NumField label="وزن المشغولات (ملاعق · صواني · فناجين · سبح)" value={svUtensils} onChange={setSvUtensils} unit="جم" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">العيار</Label>
                    <Select value={svUtensilsKarat} onValueChange={setSvUtensilsKarat}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["999", "925", "900", "835", "800", "750"].map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <NumField label="وزن الأدوات والتحف" value={svTools} onChange={setSvTools} unit="جم" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">العيار</Label>
                    <Select value={svToolsKarat} onValueChange={setSvToolsKarat}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["999", "925", "900", "835", "800", "750"].map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">غرض الاقتناء</Label>
                    <RadioGroup value={silverPurpose} onValueChange={(v) => setSilverPurpose(v as "storage" | "wear")} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="wear" id="sp-w" /><Label htmlFor="sp-w" className="text-sm">حلي وزينة</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="storage" id="sp-s" /><Label htmlFor="sp-s" className="text-sm">ادخار وحفظ قيمة</Label></div>
                    </RadioGroup>
                  </div>
                  {silverPurpose === "wear" && (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm">إخضاع حلي الزينة للزكاة (رأي الحنفية)</Label>
                        <p className="text-[10px] text-muted-foreground">إيقافه = رأي الجمهور</p>
                      </div>
                      <Switch checked={silverOpinion === "hanafi"} onCheckedChange={(v) => setSilverOpinion(v ? "hanafi" : "majority")} />
                    </div>
                  )}
                </div>

                <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">إجمالي المجوهرات والمشغولات (الخاضع للزكاة) بعيار 999</span>
                  <span className="text-lg font-bold text-gold">{fmt(calc.svJewelryG999)} جم</span>
                </div>
              </div>

              {/* السعر والإجمالي */}
              <div className="rounded-lg border border-muted-foreground/30 bg-background p-4 space-y-2">
                <Label className="text-sm">سعر جرام الفضة عيار 999 (الخالصة)</Label>
                <Input type="number" min="0" value={silverPrice} onChange={(e) => setSilverPrice(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
                <p className="text-[11px] text-muted-foreground">{currencyName} / جرام</p>
              </div>

              <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-l from-primary/10 to-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm font-bold text-primary">إجمالي الوعاء الزكوي من الفضة</div>
                  {calc.silverEligible
                    ? <Badge className="bg-primary">بلغ النصاب</Badge>
                    : <Badge variant="secondary">دون النصاب ({SILVER_NISAB_GRAMS} جم)</Badge>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">سبائك وأونصات</div>
                    <div className="font-bold">{fmt(calc.svSabaikG999)} جم</div>
                  </div>
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">عملات</div>
                    <div className="font-bold">{fmt(calc.svCoinsG999)} جم</div>
                  </div>
                  <div className="rounded-md bg-background border p-3">
                    <div className="text-xs text-muted-foreground">مجوهرات (خاضعة)</div>
                    <div className="font-bold">{fmt(calc.svJewelryG999)} جم</div>
                  </div>
                </div>
                <Separator />
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">إجمالي الوزن بعيار 999</div>
                    <div className="text-xl font-extrabold text-gold">{fmt(calc.silverGrams)} جم</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">× سعر جرام عيار 999</div>
                    <div className="text-xl font-extrabold">{cur(num(silverPrice))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">قيمة الوعاء الفضي</div>
                    <div className="text-xl font-extrabold text-primary">{cur(calc.silverValue)}</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  تمت معادلة جميع العيارات (750 · 800 · 835 · 900 · 925 · 960) إلى عيار 999 بمعامل (العيار ÷ 1000)، ثم ضُربت في سعر اليوم لجرام عيار 999.
                </p>
              </div>

              {/* إجمالي وعاء الذهب + الفضة */}
              <div className="rounded-xl border-2 border-gold/50 bg-gold/10 p-4 space-y-2">
                <div className="text-sm font-bold text-gold flex items-center gap-2">
                  <Coins className="h-4 w-4" /> إجمالي وعاء زكاة الذهب والفضة
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between border-b border-dashed py-1.5">
                    <span>الوعاء من الذهب</span>
                    <span className="font-bold">{cur(calc.totalGoldValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed py-1.5">
                    <span>الوعاء من الفضة</span>
                    <span className="font-bold">{cur(calc.silverValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed py-1.5">
                    <span>إجمالي الوعاء (الذهب + الفضة)</span>
                    <span className="font-bold text-primary">{cur(calc.totalGoldValue + calc.silverValue)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span>الزكاة الواجبة على الذهب والفضة ({(effectiveRate * 100).toFixed(3)}%)</span>
                    <span className="font-extrabold text-gold text-lg">{cur(calc.goldZakat + calc.silverZakat)}</span>
                  </div>
                </div>
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
              <CashBankSection
                countryCode={countryCode}
                currencyName={currencyName}
                onTotalChange={setCashTotalFromSection}
              />
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
            <SectionResult format={cur} label="زكاة الذهب" value={calc.goldZakat} eligible={calc.goldEligible} />
            <SectionResult format={cur} label="زكاة الفضة" value={calc.silverZakat} eligible={calc.silverEligible} />
            <SectionResult format={cur} label="زكاة النقد والاستثمارات والتجارة والعقار (صافي)" value={calc.monetaryZakat} eligible={calc.monetaryEligible} />
            <SectionResult format={cur} label="زكاة الزروع والثمار" value={calc.cropsZakat} eligible={calc.cropsEligible} />
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
