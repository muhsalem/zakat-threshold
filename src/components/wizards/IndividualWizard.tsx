import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Wallet,
  Coins,
  TrendingUp,
  Package,
  CheckCircle2,
  Landmark,
  Home,
  Bitcoin,
  MinusCircle,
  Globe,
  Sprout,
} from "lucide-react";
import { fmt, COUNTRY_PRICES, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, ZAKAT_RATE } from "@/lib/zakat";
import { toast } from "sonner";
import { SaveToHistoryCard } from "@/components/zakat/SaveToHistoryCard";
import { useWizardAutosave } from "@/hooks/useWizardAutosave";
import { ResumeDraftBanner, AutosaveIndicator } from "@/components/wizards/ResumeDraftBanner";

const GOLD_PURITY: Record<string, number> = {
  "24": 1,
  "22": 22 / 24,
  "21": 21 / 24,
  "18": 18 / 24,
  "14": 14 / 24,
  "12": 12 / 24,
  "9": 9 / 24,
};
const SILVER_FINENESS: Record<string, number> = {
  "999": 0.999,
  "925": 0.925,
  "900": 0.9,
  "835": 0.835,
  "800": 0.8,
  "750": 0.75,
};

const STEPS = [
  { key: "profile", title: "البلد والعملة والأسعار", icon: Globe },
  { key: "cash", title: "النقد والحسابات البنكية", icon: Wallet },
  { key: "gold", title: "الذهب (سبائك ومجوهرات وعملات)", icon: Coins },
  { key: "silver", title: "الفضة (سبائك ومجوهرات وعملات)", icon: Coins },
  { key: "invest", title: "الأسهم والصناديق والاستثمارات", icon: TrendingUp },
  { key: "crypto", title: "العملات الرقمية", icon: Bitcoin },
  { key: "trade", title: "عروض التجارة والمخزون والمستحقات", icon: Package },
  { key: "estate", title: "العقار للتجارة والإيجار", icon: Home },
  { key: "agri", title: "الأنعام والزروع", icon: Sprout },
  { key: "debts", title: "الديون المستحقة عليك (خصم)", icon: MinusCircle },
  { key: "review", title: "المراجعة والحفظ للمحاسب", icon: FileText },
] as const;

export function IndividualWizard() {
  const [step, setStep] = useState(0);

  // ---- الملف والدولة ----
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("EG");
  const country = COUNTRY_PRICES.find((c) => c.code === countryCode) ?? COUNTRY_PRICES[0];
  const [goldPrice, setGoldPrice] = useState(String(country.gold24));
  const [silverPrice, setSilverPrice] = useState(String(country.silver));
  const currency = country.currency;

  function pickCountry(code: string) {
    const c = COUNTRY_PRICES.find((x) => x.code === code);
    if (!c) return;
    setCountryCode(code);
    setGoldPrice(String(c.gold24));
    setSilverPrice(String(c.silver));
  }

  // ---- النقد والبنوك ----
  const [cashHand, setCashHand] = useState("");
  const [bankChecking, setBankChecking] = useState("");
  const [bankSavings, setBankSavings] = useState("");
  const [bankTermDeposits, setBankTermDeposits] = useState("");
  const [debtsToYou, setDebtsToYou] = useState(""); // ديون مرجوة السداد

  // ---- الذهب: سبائك ومجوهرات وعملات لكل عيار ----
  const [gBullion, setGBullion] = useState<Record<string, string>>({});
  const [gJewelry, setGJewelry] = useState<Record<string, string>>({});
  const [gCoins, setGCoins] = useState<Record<string, string>>({});
  const [gStoneGrams, setGStoneGrams] = useState(""); // أحجار كريمة تُستبعد
  const [jewelryPurpose, setJewelryPurpose] = useState<"storage" | "wear">("wear");
  const [jewelryOpinion, setJewelryOpinion] = useState<"majority" | "hanafi">("majority");

  // ---- الفضة: سبائك ومجوهرات وعملات لكل نقاء ----
  const [sBullion, setSBullion] = useState<Record<string, string>>({});
  const [sJewelry, setSJewelry] = useState<Record<string, string>>({});
  const [sCoins, setSCoins] = useState<Record<string, string>>({});
  const [silverPurpose, setSilverPurpose] = useState<"storage" | "wear">("wear");
  const [silverOpinion, setSilverOpinion] = useState<"majority" | "hanafi">("majority");

  // ---- الأسهم والصناديق ----
  const [stocksInvest, setStocksInvest] = useState(""); // أسهم استثمارية (نيّة الاحتفاظ) — تُزكَّى على حصة الموجودات الزكوية أو نسبة تقديرية
  const [stocksTrade, setStocksTrade] = useState(""); // أسهم للمتاجرة — القيمة السوقية كاملة
  const [funds, setFunds] = useState(""); // صناديق REIT/ETF
  const [sukuk, setSukuk] = useState(""); // صكوك — رأس المال + الأرباح المستلمة
  const [investZakatablePct, setInvestZakatablePct] = useState("40"); // نسبة الموجودات الزكوية للأسهم الاستثمارية (تقديرية)

  // ---- العملات الرقمية ----
  const [crypto, setCrypto] = useState("");

  // ---- عروض التجارة ----
  const [inventory, setInventory] = useState("");
  const [tradeReceivables, setTradeReceivables] = useState("");
  const [ecommerceStock, setEcommerceStock] = useState("");
  const [digitalProducts, setDigitalProducts] = useState("");

  // ---- العقار ----
  const [realEstateTrade, setRealEstateTrade] = useState(""); // عقار للتجارة — قيمة سوقية
  const [rentIncomeSaved, setRentIncomeSaved] = useState(""); // صافي إيراد إيجار مدّخر مرّ عليه الحول

  // ---- الأنعام والزروع (تقدير مبسّط بالقيمة) ----
  const [livestockValue, setLivestockValue] = useState("");
  const [cropsValue, setCropsValue] = useState("");
  const [cropsIrrigated, setCropsIrrigated] = useState<"rain" | "irrigated">("rain"); // 10% أو 5%

  // ---- الديون عليك ----
  const [debtsOnYou, setDebtsOnYou] = useState("");

  // ---- Autosave (استئناف تلقائي) ----
  const snapshot = {
    step,
    name,
    countryCode,
    goldPrice,
    silverPrice,
    cashHand,
    bankChecking,
    bankSavings,
    bankTermDeposits,
    debtsToYou,
    gBullion,
    gJewelry,
    gCoins,
    gStoneGrams,
    jewelryPurpose,
    jewelryOpinion,
    sBullion,
    sJewelry,
    sCoins,
    silverPurpose,
    silverOpinion,
    stocksInvest,
    stocksTrade,
    funds,
    sukuk,
    investZakatablePct,
    crypto,
    inventory,
    tradeReceivables,
    ecommerceStock,
    digitalProducts,
    realEstateTrade,
    rentIncomeSaved,
    livestockValue,
    cropsValue,
    cropsIrrigated,
    debtsOnYou,
  };
  const {
    savedDraft,
    savedAt,
    clear: clearDraft,
    dismissDraft,
  } = useWizardAutosave<typeof snapshot>("wizard:individual:v1", snapshot, step);
  function restoreDraft() {
    const d = savedDraft?.data;
    if (!d) return;
    setName(d.name ?? "");
    setCountryCode(d.countryCode ?? "EG");
    setGoldPrice(d.goldPrice ?? "");
    setSilverPrice(d.silverPrice ?? "");
    setCashHand(d.cashHand ?? "");
    setBankChecking(d.bankChecking ?? "");
    setBankSavings(d.bankSavings ?? "");
    setBankTermDeposits(d.bankTermDeposits ?? "");
    setDebtsToYou(d.debtsToYou ?? "");
    setGBullion(d.gBullion ?? {});
    setGJewelry(d.gJewelry ?? {});
    setGCoins(d.gCoins ?? {});
    setGStoneGrams(d.gStoneGrams ?? "");
    setJewelryPurpose(d.jewelryPurpose ?? "wear");
    setJewelryOpinion(d.jewelryOpinion ?? "majority");
    setSBullion(d.sBullion ?? {});
    setSJewelry(d.sJewelry ?? {});
    setSCoins(d.sCoins ?? {});
    setSilverPurpose(d.silverPurpose ?? "wear");
    setSilverOpinion(d.silverOpinion ?? "majority");
    setStocksInvest(d.stocksInvest ?? "");
    setStocksTrade(d.stocksTrade ?? "");
    setFunds(d.funds ?? "");
    setSukuk(d.sukuk ?? "");
    setInvestZakatablePct(d.investZakatablePct ?? "40");
    setCrypto(d.crypto ?? "");
    setInventory(d.inventory ?? "");
    setTradeReceivables(d.tradeReceivables ?? "");
    setEcommerceStock(d.ecommerceStock ?? "");
    setDigitalProducts(d.digitalProducts ?? "");
    setRealEstateTrade(d.realEstateTrade ?? "");
    setRentIncomeSaved(d.rentIncomeSaved ?? "");
    setLivestockValue(d.livestockValue ?? "");
    setCropsValue(d.cropsValue ?? "");
    setCropsIrrigated(d.cropsIrrigated ?? "rain");
    setDebtsOnYou(d.debtsOnYou ?? "");
    setStep(savedDraft?.step ?? 0);
    dismissDraft();
    toast.success("تمّت استعادة المسودّة");
  }

  // ---- الحسابات ----
  const n = (x: string) => parseFloat(x || "0") || 0;
  const sumMap = (m: Record<string, string>) =>
    Object.entries(m).reduce((s, [_, v]) => s + n(v), 0);
  const goldValueByPurity = (m: Record<string, string>) =>
    Object.entries(m).reduce(
      (sum, [karat, grams]) => sum + n(grams) * (GOLD_PURITY[karat] ?? 0) * n(goldPrice),
      0,
    );
  const silverValueByFineness = (m: Record<string, string>) =>
    Object.entries(m).reduce(
      (sum, [fin, grams]) => sum + n(grams) * (SILVER_FINENESS[fin] ?? 0) * n(silverPrice),
      0,
    );

  const totals = useMemo(() => {
    // نقد
    const cash =
      n(cashHand) + n(bankChecking) + n(bankSavings) + n(bankTermDeposits) + n(debtsToYou);

    // ذهب: مجوهرات الاستعمال قد تُعفى برأي الجمهور
    const bullionGoldVal = goldValueByPurity(gBullion);
    const coinGoldVal = goldValueByPurity(gCoins);
    const jewelryGoldGrossVal = goldValueByPurity(gJewelry);
    const stoneDeduction = n(gStoneGrams) * n(goldPrice); // خصم وزن الأحجار بأعلى تقدير
    const jewelryZakatable =
      jewelryPurpose === "storage" || jewelryOpinion === "hanafi"
        ? Math.max(0, jewelryGoldGrossVal - stoneDeduction)
        : 0; // مُعفاة عند الجمهور لمن يلبسها
    const goldTotal = bullionGoldVal + coinGoldVal + jewelryZakatable;

    // فضة
    const bullionSilverVal = silverValueByFineness(sBullion);
    const coinSilverVal = silverValueByFineness(sCoins);
    const jewelrySilverGross = silverValueByFineness(sJewelry);
    const jewelrySilverZakatable =
      silverPurpose === "storage" || silverOpinion === "hanafi" ? jewelrySilverGross : 0;
    const silverTotal = bullionSilverVal + coinSilverVal + jewelrySilverZakatable;

    // استثمارات
    const investPct = Math.min(100, Math.max(0, n(investZakatablePct))) / 100;
    const invest = n(stocksInvest) * investPct + n(stocksTrade) + n(funds) + n(sukuk);

    // عملات رقمية
    const digital = n(crypto);

    // تجارة
    const trade = n(inventory) + n(tradeReceivables) + n(ecommerceStock) + n(digitalProducts);

    // عقار وإيجار
    const estate = n(realEstateTrade) + n(rentIncomeSaved);

    // الأنعام (تقدير بالقيمة) — الزروع تُزكَّى بمعدل خاص وقت الحصاد ولا تدخل ضمن 2.5%
    const livestock = n(livestockValue);
    const cropsRate = cropsIrrigated === "rain" ? 0.1 : 0.05;
    const cropsZakat = n(cropsValue) * cropsRate;

    const gross = cash + goldTotal + silverTotal + invest + digital + trade + estate + livestock;
    const net = Math.max(0, gross - n(debtsOnYou));

    // النصاب (الأنفع للفقراء = الأدنى بين نصاب الذهب والفضة)
    const nisabGold = GOLD_NISAB_GRAMS * n(goldPrice);
    const nisabSilver = SILVER_NISAB_GRAMS * n(silverPrice);
    const nisabValue = Math.min(nisabGold, nisabSilver) || Math.max(nisabGold, nisabSilver);
    const reaches = net > 0 && nisabValue > 0 && net >= nisabValue;

    const zakatOnWealth = reaches ? net * ZAKAT_RATE : 0;
    const zakat = zakatOnWealth + cropsZakat;

    return {
      cash,
      goldTotal,
      silverTotal,
      invest,
      digital,
      trade,
      estate,
      livestock,
      cropsZakat,
      gross,
      net,
      nisabGold,
      nisabSilver,
      nisabValue,
      reaches,
      zakatOnWealth,
      zakat,
    };
  }, [
    cashHand,
    bankChecking,
    bankSavings,
    bankTermDeposits,
    debtsToYou,
    gBullion,
    gCoins,
    gJewelry,
    gStoneGrams,
    jewelryPurpose,
    jewelryOpinion,
    goldPrice,
    sBullion,
    sCoins,
    sJewelry,
    silverPurpose,
    silverOpinion,
    silverPrice,
    stocksInvest,
    stocksTrade,
    funds,
    sukuk,
    investZakatablePct,
    crypto,
    inventory,
    tradeReceivables,
    ecommerceStock,
    digitalProducts,
    realEstateTrade,
    rentIncomeSaved,
    livestockValue,
    cropsValue,
    cropsIrrigated,
    debtsOnYou,
  ]);

  function printReport() {
    window.print();
    toast.success("جاري إعداد التقرير للطباعة");
  }

  const pct = ((step + 1) / STEPS.length) * 100;
  const S = STEPS[step];
  const Icon = S.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-primary" /> {S.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <AutosaveIndicator savedAt={savedAt} />
            <Badge variant="outline" className="text-xs">
              {step + 1} / {STEPS.length}
            </Badge>
            <Badge variant="secondary" className="text-[10px]" dir="ltr">
              {country.name} · {currency}
            </Badge>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        {/* شريط تنقل مختصر للخطوات */}
        <div className="flex gap-1 overflow-x-auto pt-2 -mx-1 px-1">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`shrink-0 text-[10px] px-2 py-1 rounded-md border transition ${
                i === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : i < step
                    ? "bg-primary/5 border-primary/20 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
              }`}
              title={s.title}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {savedDraft && (
          <ResumeDraftBanner
            savedAt={savedDraft.at}
            onResume={restoreDraft}
            onDismiss={dismissDraft}
          />
        )}

        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="الاسم (اختياري)" v={name} set={setName} />
            <div className="space-y-1.5">
              <Label className="text-xs">
                الدولة (تُحدّد العملة وأسعار الذهب/الفضة الافتراضية)
              </Label>
              <Select value={countryCode} onValueChange={pickCountry}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {COUNTRY_PRICES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name} — {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              label={`سعر جرام الذهب عيار 24 (${currency})`}
              v={goldPrice}
              set={setGoldPrice}
            />
            <Field
              label={`سعر جرام الفضة النقية (${currency})`}
              v={silverPrice}
              set={setSilverPrice}
            />
            <Alert className="sm:col-span-2">
              <AlertDescription className="text-xs leading-relaxed">
                <b>نصاب الذهب:</b> {fmt(totals.nisabGold)} {currency} — <b>نصاب الفضة:</b>{" "}
                {fmt(totals.nisabSilver)} {currency}. نعتمد <b>الأنفع للفقراء</b> (
                {fmt(totals.nisabValue)} {currency}).
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="النقد في اليد" v={cashHand} set={setCashHand} currency={currency} />
            <Field
              label="حسابات جارية"
              v={bankChecking}
              set={setBankChecking}
              currency={currency}
            />
            <Field label="حسابات توفير" v={bankSavings} set={setBankSavings} currency={currency} />
            <Field
              label="ودائع لأجل / صناديق ادخار"
              v={bankTermDeposits}
              set={setBankTermDeposits}
              currency={currency}
            />
            <Field
              label="ديون لك على الآخرين (مرجوّة السداد)"
              v={debtsToYou}
              set={setDebtsToYou}
              currency={currency}
            />
            <Summary label="إجمالي النقد والودائع" v={totals.cash} currency={currency} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <KaratGrid
              title="سبائك وأونصات الذهب"
              purity={GOLD_PURITY}
              values={gBullion}
              setValues={setGBullion}
            />
            <Separator />
            <KaratGrid
              title="الجنيهات والعملات الذهبية"
              purity={GOLD_PURITY}
              values={gCoins}
              setValues={setGCoins}
            />
            <Separator />
            <KaratGrid
              title="مجوهرات ومشغولات ذهبية"
              purity={GOLD_PURITY}
              values={gJewelry}
              setValues={setGJewelry}
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <Field
                label="وزن الأحجار الكريمة المُدمجة (جم) — تُستبعد"
                v={gStoneGrams}
                set={setGStoneGrams}
              />
              <div className="space-y-1.5">
                <Label className="text-xs">الغرض من المجوهرات</Label>
                <Select value={jewelryPurpose} onValueChange={(v) => setJewelryPurpose(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wear">للاستعمال (زينة)</SelectItem>
                    <SelectItem value="storage">للادّخار / التجارة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الرأي الفقهي لحلي الزينة</Label>
                <Select value={jewelryOpinion} onValueChange={(v) => setJewelryOpinion(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="majority">الجمهور (لا زكاة على حلي الاستعمال)</SelectItem>
                    <SelectItem value="hanafi">الأحناف (زكاة الحلي مطلقاً)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Summary label="قيمة الذهب الزكوي" v={totals.goldTotal} currency={currency} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <KaratGrid
              title="سبائك وأونصات الفضة"
              purity={SILVER_FINENESS}
              values={sBullion}
              setValues={setSBullion}
              suffix="‰"
            />
            <Separator />
            <KaratGrid
              title="العملات الفضية"
              purity={SILVER_FINENESS}
              values={sCoins}
              setValues={setSCoins}
              suffix="‰"
            />
            <Separator />
            <KaratGrid
              title="مجوهرات ومشغولات فضية"
              purity={SILVER_FINENESS}
              values={sJewelry}
              setValues={setSJewelry}
              suffix="‰"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الغرض</Label>
                <Select value={silverPurpose} onValueChange={(v) => setSilverPurpose(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wear">للاستعمال</SelectItem>
                    <SelectItem value="storage">للادّخار / التجارة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الرأي الفقهي</Label>
                <Select value={silverOpinion} onValueChange={(v) => setSilverOpinion(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="majority">الجمهور</SelectItem>
                    <SelectItem value="hanafi">الأحناف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Summary label="قيمة الفضة الزكوية" v={totals.silverTotal} currency={currency} />
          </div>
        )}

        {step === 4 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="قيمة الأسهم الاستثمارية (بنيّة الاحتفاظ)"
              v={stocksInvest}
              set={setStocksInvest}
              currency={currency}
            />
            <Field
              label="نسبة الموجودات الزكوية للأسهم الاستثمارية %"
              v={investZakatablePct}
              set={setInvestZakatablePct}
            />
            <Field
              label="قيمة الأسهم بنيّة المتاجرة (القيمة السوقية)"
              v={stocksTrade}
              set={setStocksTrade}
              currency={currency}
            />
            <Field label="صناديق REIT / ETF" v={funds} set={setFunds} currency={currency} />
            <Field
              label="صكوك (رأس المال + الأرباح المستلمة)"
              v={sukuk}
              set={setSukuk}
              currency={currency}
            />
            <Summary label="إجمالي وعاء الاستثمارات" v={totals.invest} currency={currency} />
            <Alert className="sm:col-span-2">
              <AlertDescription className="text-[11px] leading-relaxed">
                الأسهم الاستثمارية تُزكَّى على حصة الموجودات الزكوية (النقد + المخزون + الذمم) من
                صافي أصول الشركة. النسبة الافتراضية 40% وفق AAOIFI 21؛ عدّلها من إفصاح الشركة.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 5 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="القيمة السوقية للعملات الرقمية"
              v={crypto}
              set={setCrypto}
              currency={currency}
            />
            <Summary label="الوعاء الرقمي" v={totals.digital} currency={currency} />
            <Alert className="sm:col-span-2">
              <AlertDescription className="text-[11px] leading-relaxed">
                العملات الرقمية المُعتبرة مالاً تُزكَّى بالقيمة السوقية يوم الوجوب — راجع بطاقة
                "فتاوى العملات الرقمية" في التبويب المتقدم.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 6 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="بضاعة/مخزون للبيع" v={inventory} set={setInventory} currency={currency} />
            <Field
              label="مستحقات على العملاء (تجارية)"
              v={tradeReceivables}
              set={setTradeReceivables}
              currency={currency}
            />
            <Field
              label="بضاعة المتجر الإلكتروني"
              v={ecommerceStock}
              set={setEcommerceStock}
              currency={currency}
            />
            <Field
              label="منتجات/خدمات رقمية معدّة للبيع"
              v={digitalProducts}
              set={setDigitalProducts}
              currency={currency}
            />
            <Summary label="إجمالي عروض التجارة" v={totals.trade} currency={currency} />
          </div>
        )}

        {step === 7 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="عقارات للتجارة — القيمة السوقية"
              v={realEstateTrade}
              set={setRealEstateTrade}
              currency={currency}
            />
            <Field
              label="صافي إيرادات إيجارية مدّخرة مرّ عليها الحول"
              v={rentIncomeSaved}
              set={setRentIncomeSaved}
              currency={currency}
            />
            <Summary label="إجمالي وعاء العقار" v={totals.estate} currency={currency} />
          </div>
        )}

        {step === 8 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="القيمة التقديرية للأنعام (إبل/بقر/غنم)"
              v={livestockValue}
              set={setLivestockValue}
              currency={currency}
            />
            <Field
              label="قيمة المحصول الزراعي"
              v={cropsValue}
              set={setCropsValue}
              currency={currency}
            />
            <div className="space-y-1.5">
              <Label className="text-xs">طريقة سقي الزرع</Label>
              <Select value={cropsIrrigated} onValueChange={(v) => setCropsIrrigated(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rain">سقي بالمطر/العيون (العُشر 10%)</SelectItem>
                  <SelectItem value="irrigated">سقي بمؤونة (نصف العشر 5%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Summary
              label="زكاة الزروع (تُدفع وقت الحصاد)"
              v={totals.cropsZakat}
              currency={currency}
            />
            <Alert className="sm:col-span-2">
              <AlertDescription className="text-[11px]">
                الأنعام تُزكَّى بعدد الرؤوس عادةً؛ نستخدم القيمة تقديراً مبسّطاً. للتفصيل استخدم
                "الوضع المتقدم".
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 9 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="إجمالي الديون المستحقة عليك حال الوجوب"
              v={debtsOnYou}
              set={setDebtsOnYou}
              currency={currency}
            />
            <Summary label="سيُخصم من الوعاء" v={n(debtsOnYou)} currency={currency} />
          </div>
        )}

        {step === 10 && (
          <div className="space-y-3">
            {!totals.reaches && totals.net > 0 && (
              <Alert>
                <AlertDescription className="text-xs">
                  الوعاء ({fmt(totals.net)} {currency}) لم يبلغ النصاب ({fmt(totals.nisabValue)}{" "}
                  {currency}). لا تجب زكاة المال حالياً — قد تجب زكاة الزروع منفصلة.
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-lg border p-4 space-y-1.5">
              <Row label="النقد والودائع" v={totals.cash} currency={currency} />
              <Row label="الذهب الزكوي" v={totals.goldTotal} currency={currency} />
              <Row label="الفضة الزكوية" v={totals.silverTotal} currency={currency} />
              <Row label="الاستثمارات والأسهم والصكوك" v={totals.invest} currency={currency} />
              <Row label="العملات الرقمية" v={totals.digital} currency={currency} />
              <Row label="عروض التجارة" v={totals.trade} currency={currency} />
              <Row label="العقار والإيجار" v={totals.estate} currency={currency} />
              <Row label="الأنعام (قيمة)" v={totals.livestock} currency={currency} />
              <Separator className="my-2" />
              <Row
                label="إجمالي الموجودات (الوعاء الخام)"
                v={totals.gross}
                currency={currency}
                bold
              />
              <Row label="− الديون المستحقة" v={n(debtsOnYou)} currency={currency} />
              <Row label="الوعاء الزكوي بعد الديون" v={totals.net} currency={currency} bold />
              <Row label={`نصاب الأنفع للفقراء`} v={totals.nisabValue} currency={currency} />
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> الزكاة المستحقة (2.5% + زكاة
                  الزروع)
                </span>
                <span className="font-bold text-lg text-primary" dir="ltr">
                  {fmt(totals.zakat)} {currency}
                </span>
              </div>
            </div>
            <Button onClick={printReport} variant="outline" className="w-full gap-2">
              <FileText className="h-4 w-4" /> تصدير تقرير PDF
            </Button>
            <SaveToHistoryCard
              payload={{
                record_type: "individual",
                hijri_year: null,
                currency,
                total_assets: totals.gross,
                total_liabilities: n(debtsOnYou),
                zakat_base: totals.net,
                zakat_due: totals.zakat,
                prepaid_zakat: 0,
                net_due: totals.zakat,
                snapshot: {
                  source: "IndividualWizard",
                  name,
                  country: country.code,
                  goldPrice,
                  silverPrice,
                  cash: { cashHand, bankChecking, bankSavings, bankTermDeposits, debtsToYou },
                  gold: { gBullion, gCoins, gJewelry, gStoneGrams, jewelryPurpose, jewelryOpinion },
                  silver: { sBullion, sCoins, sJewelry, silverPurpose, silverOpinion },
                  investments: { stocksInvest, stocksTrade, funds, sukuk, investZakatablePct },
                  crypto,
                  trade: { inventory, tradeReceivables, ecommerceStock, digitalProducts },
                  estate: { realEstateTrade, rentIncomeSaved },
                  agri: { livestockValue, cropsValue, cropsIrrigated },
                  debtsOnYou,
                  totals,
                },
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <Button
            size="sm"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
            className="gap-1"
          >
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */

function TextField({ label, v, set }: { label: string; v: string; set: (x: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

function Field({
  label,
  v,
  set,
  currency,
}: {
  label: string;
  v: string;
  set: (x: string) => void;
  currency?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={v}
          onChange={(e) => set(e.target.value)}
          dir="ltr"
          className={currency ? "pl-14" : ""}
        />
        {currency && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            {currency}
          </span>
        )}
      </div>
    </div>
  );
}

function Summary({ label, v, currency }: { label: string; v: number; currency: string }) {
  return (
    <div className="rounded-md border bg-primary/5 border-primary/20 px-3 py-2 flex items-center justify-between sm:col-span-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-bold text-primary" dir="ltr">
        {fmt(v)} {currency}
      </span>
    </div>
  );
}

function Row({
  label,
  v,
  currency,
  bold,
}: {
  label: string;
  v: number;
  currency: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span dir="ltr">
        {fmt(v)} {currency}
      </span>
    </div>
  );
}

function KaratGrid({
  title,
  purity,
  values,
  setValues,
  suffix = "",
}: {
  title: string;
  purity: Record<string, number>;
  values: Record<string, string>;
  setValues: (v: Record<string, string>) => void;
  suffix?: string;
}) {
  const keys = Object.keys(purity);
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold flex items-center gap-1.5">
        <Landmark className="h-3.5 w-3.5 text-primary" /> {title} (بالجرام حسب العيار)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {keys.map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              عيار {k}
              {suffix}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={values[k] ?? ""}
              onChange={(e) => setValues({ ...values, [k]: e.target.value })}
              dir="ltr"
              placeholder="0"
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
