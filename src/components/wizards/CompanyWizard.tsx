import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle, Building2, ChevronLeft, ChevronRight, FileText, CheckCircle2,
  Wallet, Receipt, Package, TrendingUp, Home, Sprout, MinusCircle, Percent, Globe,
} from "lucide-react";
import { fmt, COUNTRY_PRICES, ZAKAT_RATE } from "@/lib/zakat";
import { toast } from "sonner";
import { SaveToHistoryCard } from "@/components/zakat/SaveToHistoryCard";
import { useWizardAutosave } from "@/hooks/useWizardAutosave";
import { ResumeDraftBanner, AutosaveIndicator } from "@/components/wizards/ResumeDraftBanner";

const STEPS = [
  { key: "profile",     title: "بيانات الشركة والعملة والسنة",       icon: Building2 },
  { key: "cash",        title: "النقد والحسابات البنكية",              icon: Wallet },
  { key: "receivables", title: "الذمم المدينة والمقدّمات",             icon: Receipt },
  { key: "inventory",   title: "المخزون بأنواعه",                     icon: Package },
  { key: "invest",      title: "الاستثمارات والأوراق المالية",          icon: TrendingUp },
  { key: "estate",      title: "العقارات والأصول المعدّة للبيع",       icon: Home },
  { key: "agri",        title: "ملحقات زراعية وحيوانية للتجارة",       icon: Sprout },
  { key: "liab",        title: "المطلوبات القصيرة والخصومات",           icon: MinusCircle },
  { key: "exempt",      title: "الحصص المُعفاة (شركاء/حكومة)",         icon: Percent },
  { key: "review",      title: "المراجعة والإرسال للمحاسب",            icon: FileText },
] as const;

export function CompanyWizard() {
  const [step, setStep] = useState(0);

  // ---- ملف الشركة ----
  const [companyName, setCompanyName] = useState("");
  const [activity, setActivity] = useState("");
  const [sector, setSector] = useState("trade");
  const [yearType, setYearType] = useState<"hijri" | "gregorian">("hijri");
  const [fiscalYear, setFiscalYear] = useState("");
  const [countryCode, setCountryCode] = useState("SA");
  const country = COUNTRY_PRICES.find((c) => c.code === countryCode) ?? COUNTRY_PRICES[0];
  const currency = country.currency;

  // ---- النقد والبنوك ----
  const [cashOnHand, setCashOnHand] = useState("");
  const [bankCurrent, setBankCurrent] = useState("");
  const [bankSavings, setBankSavings] = useState("");
  const [bankDeposits, setBankDeposits] = useState("");
  const [pettyCash, setPettyCash] = useState("");

  // ---- الذمم ----
  const [tradeReceivables, setTradeReceivables] = useState("");
  const [notesReceivable, setNotesReceivable] = useState("");
  const [prepaidExpenses, setPrepaidExpenses] = useState("");
  const [supplierAdvances, setSupplierAdvances] = useState("");
  const [doubtfulProvisions, setDoubtfulProvisions] = useState("");

  // ---- المخزون ----
  const [rawMaterials, setRawMaterials] = useState("");
  const [wip, setWip] = useState("");
  const [finishedGoods, setFinishedGoods] = useState("");
  const [goodsInTransit, setGoodsInTransit] = useState("");
  const [spareParts, setSpareParts] = useState("");
  const [obsoleteStock, setObsoleteStock] = useState("");

  // ---- الاستثمارات ----
  const [tradeSecurities, setTradeSecurities] = useState("");
  const [heldForSaleShares, setHeldForSaleShares] = useState("");
  const [heldForInvestShares, setHeldForInvestShares] = useState("");
  const [investZakatablePct, setInvestZakatablePct] = useState("40");
  const [sukuk, setSukuk] = useState("");
  const [subsidiariesZakatable, setSubsidiariesZakatable] = useState("");

  // ---- العقارات ----
  const [realEstateForSale, setRealEstateForSale] = useState("");
  const [landForSale, setLandForSale] = useState("");
  const [rentIncomeSaved, setRentIncomeSaved] = useState("");

  // ---- زراعي/حيواني للتجارة ----
  const [tradedLivestock, setTradedLivestock] = useState("");
  const [tradedPoultryNet, setTradedPoultryNet] = useState("");
  const [tradedFishNet, setTradedFishNet] = useState("");
  const [honeyValue, setHoneyValue] = useState("");

  // ---- المطلوبات ----
  const [shortTermPayables, setShortTermPayables] = useState("");
  const [accruedExpenses, setAccruedExpenses] = useState("");
  const [taxesDue, setTaxesDue] = useState("");
  const [dividendsDeclared, setDividendsDeclared] = useState("");
  const [longTermDueThisYear, setLongTermDueThisYear] = useState("");
  const [prepaidZakat, setPrepaidZakat] = useState("");

  // ---- الحصص المُعفاة ----
  const [shForeign, setShForeign] = useState("0");
  const [shGov, setShGov] = useState("0");
  const [shWaqf, setShWaqf] = useState("0");
  const [shNonMuslim, setShNonMuslim] = useState("0");

  // ---- Autosave ----
  const snapshot = {
    step,
    companyName, activity, sector, yearType, fiscalYear, countryCode,
    cashOnHand, bankCurrent, bankSavings, bankDeposits, pettyCash,
    tradeReceivables, notesReceivable, prepaidExpenses, supplierAdvances, doubtfulProvisions,
    rawMaterials, wip, finishedGoods, goodsInTransit, spareParts, obsoleteStock,
    tradeSecurities, heldForSaleShares, heldForInvestShares, investZakatablePct, sukuk, subsidiariesZakatable,
    realEstateForSale, landForSale, rentIncomeSaved,
    tradedLivestock, tradedPoultryNet, tradedFishNet, honeyValue,
    shortTermPayables, accruedExpenses, taxesDue, dividendsDeclared, longTermDueThisYear, prepaidZakat,
    shForeign, shGov, shWaqf, shNonMuslim,
  };
  const { savedDraft, savedAt, dismissDraft } =
    useWizardAutosave<typeof snapshot>("wizard:company:v1", snapshot, step);
  function restoreDraft() {
    const d = savedDraft?.data; if (!d) return;
    setCompanyName(d.companyName ?? ""); setActivity(d.activity ?? ""); setSector(d.sector ?? "trade");
    setYearType(d.yearType ?? "hijri"); setFiscalYear(d.fiscalYear ?? ""); setCountryCode(d.countryCode ?? "SA");
    setCashOnHand(d.cashOnHand ?? ""); setBankCurrent(d.bankCurrent ?? "");
    setBankSavings(d.bankSavings ?? ""); setBankDeposits(d.bankDeposits ?? ""); setPettyCash(d.pettyCash ?? "");
    setTradeReceivables(d.tradeReceivables ?? ""); setNotesReceivable(d.notesReceivable ?? "");
    setPrepaidExpenses(d.prepaidExpenses ?? ""); setSupplierAdvances(d.supplierAdvances ?? "");
    setDoubtfulProvisions(d.doubtfulProvisions ?? "");
    setRawMaterials(d.rawMaterials ?? ""); setWip(d.wip ?? ""); setFinishedGoods(d.finishedGoods ?? "");
    setGoodsInTransit(d.goodsInTransit ?? ""); setSpareParts(d.spareParts ?? ""); setObsoleteStock(d.obsoleteStock ?? "");
    setTradeSecurities(d.tradeSecurities ?? ""); setHeldForSaleShares(d.heldForSaleShares ?? "");
    setHeldForInvestShares(d.heldForInvestShares ?? ""); setInvestZakatablePct(d.investZakatablePct ?? "40");
    setSukuk(d.sukuk ?? ""); setSubsidiariesZakatable(d.subsidiariesZakatable ?? "");
    setRealEstateForSale(d.realEstateForSale ?? ""); setLandForSale(d.landForSale ?? "");
    setRentIncomeSaved(d.rentIncomeSaved ?? "");
    setTradedLivestock(d.tradedLivestock ?? ""); setTradedPoultryNet(d.tradedPoultryNet ?? "");
    setTradedFishNet(d.tradedFishNet ?? ""); setHoneyValue(d.honeyValue ?? "");
    setShortTermPayables(d.shortTermPayables ?? ""); setAccruedExpenses(d.accruedExpenses ?? "");
    setTaxesDue(d.taxesDue ?? ""); setDividendsDeclared(d.dividendsDeclared ?? "");
    setLongTermDueThisYear(d.longTermDueThisYear ?? ""); setPrepaidZakat(d.prepaidZakat ?? "");
    setShForeign(d.shForeign ?? "0"); setShGov(d.shGov ?? "0");
    setShWaqf(d.shWaqf ?? "0"); setShNonMuslim(d.shNonMuslim ?? "0");
    setStep(savedDraft?.step ?? 0);
    dismissDraft();
    toast.success("تمّت استعادة المسودّة");
  }

  const n = (x: string) => parseFloat(x || "0") || 0;


  const totals = useMemo(() => {
    const cash = n(cashOnHand) + n(bankCurrent) + n(bankSavings) + n(bankDeposits) + n(pettyCash);
    const receivables = Math.max(0,
      n(tradeReceivables) + n(notesReceivable) + n(prepaidExpenses) + n(supplierAdvances) - n(doubtfulProvisions)
    );
    const inventory = Math.max(0,
      n(rawMaterials) + n(wip) + n(finishedGoods) + n(goodsInTransit) + n(spareParts) - n(obsoleteStock)
    );
    const investPct = Math.min(100, Math.max(0, n(investZakatablePct))) / 100;
    const invest = n(tradeSecurities) + n(heldForSaleShares) + n(heldForInvestShares) * investPct
      + n(sukuk) + n(subsidiariesZakatable);
    const estate = n(realEstateForSale) + n(landForSale) + n(rentIncomeSaved);
    const agri = n(tradedLivestock) + n(tradedPoultryNet) + n(tradedFishNet) + n(honeyValue);

    const grossAssets = cash + receivables + inventory + invest + estate + agri;

    const deductions = n(shortTermPayables) + n(accruedExpenses) + n(taxesDue)
      + n(dividendsDeclared) + n(longTermDueThisYear);

    const baseBeforeExempt = Math.max(0, grossAssets - deductions);
    const exempt = Math.min(1, Math.max(0,
      (n(shForeign) + n(shGov) + n(shWaqf) + n(shNonMuslim)) / 100
    ));
    const zakatBase = baseBeforeExempt * (1 - exempt);
    const zakatGross = zakatBase * ZAKAT_RATE;
    const netDue = Math.max(0, zakatGross - n(prepaidZakat));

    return {
      cash, receivables, inventory, invest, estate, agri,
      grossAssets, deductions, baseBeforeExempt, exempt, zakatBase, zakatGross, netDue,
    };
  }, [
    cashOnHand, bankCurrent, bankSavings, bankDeposits, pettyCash,
    tradeReceivables, notesReceivable, prepaidExpenses, supplierAdvances, doubtfulProvisions,
    rawMaterials, wip, finishedGoods, goodsInTransit, spareParts, obsoleteStock,
    tradeSecurities, heldForSaleShares, heldForInvestShares, investZakatablePct, sukuk, subsidiariesZakatable,
    realEstateForSale, landForSale, rentIncomeSaved,
    tradedLivestock, tradedPoultryNet, tradedFishNet, honeyValue,
    shortTermPayables, accruedExpenses, taxesDue, dividendsDeclared, longTermDueThisYear,
    shForeign, shGov, shWaqf, shNonMuslim, prepaidZakat,
  ]);

  const exemptSum = n(shForeign) + n(shGov) + n(shWaqf) + n(shNonMuslim);
  const exemptError = exemptSum > 100;

  function printReport() {
    if (exemptError) {
      toast.error("مجموع الحصص المُعفاة يتجاوز 100%");
      return;
    }
    window.print();
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
            <Badge variant="outline" className="text-xs">{step + 1} / {STEPS.length}</Badge>
            <Badge variant="secondary" className="text-[10px]" dir="ltr">
              {country.name} · {currency}
            </Badge>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex gap-1 overflow-x-auto pt-2 -mx-1 px-1">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`shrink-0 text-[10px] px-2 py-1 rounded-md border transition ${
                i === step ? "bg-primary text-primary-foreground border-primary"
                : i < step ? "bg-primary/5 border-primary/20 text-primary"
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
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="اسم الشركة" v={companyName} set={setCompanyName} />
            <TextField label="نوع النشاط" v={activity} set={setActivity} placeholder="تجارة، صناعة، خدمات…" />
            <div className="space-y-1.5">
              <Label className="text-xs">القطاع</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trade">تجارة</SelectItem>
                  <SelectItem value="manufacturing">صناعة</SelectItem>
                  <SelectItem value="services">خدمات</SelectItem>
                  <SelectItem value="realestate">عقاري</SelectItem>
                  <SelectItem value="agri">زراعي/حيواني</SelectItem>
                  <SelectItem value="finance">مالي/تكافل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع السنة المالية</Label>
              <Select value={yearType} onValueChange={(v) => setYearType(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hijri">هجرية (2.5%)</SelectItem>
                  <SelectItem value="gregorian">ميلادية (2.577%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TextField label="السنة المالية" v={fiscalYear} set={setFiscalYear} placeholder="1446 / 2025" />
            <div className="space-y-1.5">
              <Label className="text-xs"><Globe className="inline h-3 w-3" /> الدولة والعملة</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {COUNTRY_PRICES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name} — {c.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="النقد في الخزينة" v={cashOnHand} set={setCashOnHand} currency={currency} />
            <Field label="عهد نقدية" v={pettyCash} set={setPettyCash} currency={currency} />
            <Field label="حسابات جارية" v={bankCurrent} set={setBankCurrent} currency={currency} />
            <Field label="حسابات توفير" v={bankSavings} set={setBankSavings} currency={currency} />
            <Field label="ودائع لأجل / مرابحات" v={bankDeposits} set={setBankDeposits} currency={currency} />
            <Summary label="إجمالي النقد والبنوك" v={totals.cash} currency={currency} />
          </div>
        )}

        {step === 2 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ذمم مدينة تجارية (عملاء)" v={tradeReceivables} set={setTradeReceivables} currency={currency} />
            <Field label="أوراق قبض" v={notesReceivable} set={setNotesReceivable} currency={currency} />
            <Field label="مصروفات مدفوعة مقدماً" v={prepaidExpenses} set={setPrepaidExpenses} currency={currency} />
            <Field label="دفعات مقدمة لموردين" v={supplierAdvances} set={setSupplierAdvances} currency={currency} />
            <Field label="مخصص ديون مشكوك في تحصيلها (خصم)" v={doubtfulProvisions} set={setDoubtfulProvisions} currency={currency} />
            <Summary label="صافي الذمم" v={totals.receivables} currency={currency} />
          </div>
        )}

        {step === 3 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="مواد خام" v={rawMaterials} set={setRawMaterials} currency={currency} />
            <Field label="إنتاج تحت التشغيل" v={wip} set={setWip} currency={currency} />
            <Field label="بضاعة تامة الصنع" v={finishedGoods} set={setFinishedGoods} currency={currency} />
            <Field label="بضاعة بالطريق" v={goodsInTransit} set={setGoodsInTransit} currency={currency} />
            <Field label="قطع غيار للبيع" v={spareParts} set={setSpareParts} currency={currency} />
            <Field label="مخزون راكد/تالف (خصم)" v={obsoleteStock} set={setObsoleteStock} currency={currency} />
            <Summary label="صافي المخزون الزكوي" v={totals.inventory} currency={currency} />
          </div>
        )}

        {step === 4 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="أوراق مالية للمتاجرة (قيمة سوقية)" v={tradeSecurities} set={setTradeSecurities} currency={currency} />
            <Field label="أسهم مصنّفة للبيع" v={heldForSaleShares} set={setHeldForSaleShares} currency={currency} />
            <Field label="أسهم استثمارية (نية احتفاظ)" v={heldForInvestShares} set={setHeldForInvestShares} currency={currency} />
            <Field label="نسبة الموجودات الزكوية للأسهم الاستثمارية %" v={investZakatablePct} set={setInvestZakatablePct} />
            <Field label="صكوك (أصل + أرباح مستلمة)" v={sukuk} set={setSukuk} currency={currency} />
            <Field label="حصة الشركة الزكوية من الشركات التابعة" v={subsidiariesZakatable} set={setSubsidiariesZakatable} currency={currency} />
            <Summary label="إجمالي وعاء الاستثمارات" v={totals.invest} currency={currency} />
            <Alert className="sm:col-span-2">
              <AlertDescription className="text-[11px] leading-relaxed">
                AAOIFI 21: الأسهم الاستثمارية تُزكَّى بحصة الموجودات الزكوية من صافي الأصول. النسبة الافتراضية 40% ما لم تفصح الشركة عن الحصة الفعلية.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 5 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="عقارات معدّة للبيع (قيمة سوقية)" v={realEstateForSale} set={setRealEstateForSale} currency={currency} />
            <Field label="أراضٍ معدّة للبيع" v={landForSale} set={setLandForSale} currency={currency} />
            <Field label="صافي إيراد إيجاري مدّخر (حال عليه الحول)" v={rentIncomeSaved} set={setRentIncomeSaved} currency={currency} />
            <Summary label="إجمالي وعاء العقار" v={totals.estate} currency={currency} />
          </div>
        )}

        {step === 6 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="قيمة الأنعام المعدّة للتجارة" v={tradedLivestock} set={setTradedLivestock} currency={currency} />
            <Field label="صافي مشاريع الدواجن (بعد التكاليف)" v={tradedPoultryNet} set={setTradedPoultryNet} currency={currency} />
            <Field label="صافي مشاريع الأسماك (بعد التكاليف)" v={tradedFishNet} set={setTradedFishNet} currency={currency} />
            <Field label="قيمة العسل (إذا بلغ النصاب)" v={honeyValue} set={setHoneyValue} currency={currency} />
            <Summary label="إجمالي الملحقات الزراعية/الحيوانية" v={totals.agri} currency={currency} />
          </div>
        )}

        {step === 7 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="موردون ودائنون (قصيرة الأجل)" v={shortTermPayables} set={setShortTermPayables} currency={currency} />
            <Field label="مصروفات مستحقة" v={accruedExpenses} set={setAccruedExpenses} currency={currency} />
            <Field label="ضرائب مستحقة" v={taxesDue} set={setTaxesDue} currency={currency} />
            <Field label="توزيعات أرباح معتمدة غير مدفوعة" v={dividendsDeclared} set={setDividendsDeclared} currency={currency} />
            <Field label="القسط المستحق من قروض طويلة الأجل خلال السنة" v={longTermDueThisYear} set={setLongTermDueThisYear} currency={currency} />
            <Field label="زكاة معجّلة سابقاً (تُخصم من المستحق)" v={prepaidZakat} set={setPrepaidZakat} currency={currency} />
            <Summary label="إجمالي الخصومات" v={totals.deductions} currency={currency} />
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3">
            {exemptError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>مجموع الحصص يتجاوز 100%</AlertTitle>
                <AlertDescription className="text-xs">
                  المجموع الحالي: {exemptSum}%. صحّح النسب قبل المتابعة.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="حصة المساهمين الأجانب %" v={shForeign} set={setShForeign} />
              <Field label="حصة الجهات الحكومية %" v={shGov} set={setShGov} />
              <Field label="حصة أوقاف / جهات خيرية %" v={shWaqf} set={setShWaqf} />
              <Field label="حصة غير المسلمين %" v={shNonMuslim} set={setShNonMuslim} />
              <Summary label={`مجموع الإعفاء ${(totals.exempt * 100).toFixed(1)}%`} v={totals.baseBeforeExempt * totals.exempt} currency={currency} />
            </div>
            <Alert>
              <AlertDescription className="text-[11px] leading-relaxed">
                تُخصم الحصص المذكورة من الوعاء قبل ضرب 2.5%، لأنها ليست ملكاً لمسلم مكلف بالزكاة (فتاوى الهيئة الشرعية العامة).
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 space-y-1.5">
              <Row label="الشركة" text={companyName || "—"} currency="" />
              <Row label="النشاط / القطاع" text={`${activity || "—"} · ${sector}`} currency="" />
              <Row label="السنة" text={`${fiscalYear || "—"} (${yearType === "hijri" ? "هجرية" : "ميلادية"})`} currency="" />
              <Separator className="my-2" />
              <Row label="النقد والبنوك"           v={totals.cash}        currency={currency} />
              <Row label="الذمم المدينة"           v={totals.receivables} currency={currency} />
              <Row label="المخزون"                 v={totals.inventory}   currency={currency} />
              <Row label="الاستثمارات"             v={totals.invest}      currency={currency} />
              <Row label="العقار"                  v={totals.estate}      currency={currency} />
              <Row label="ملحقات زراعية/حيوانية"  v={totals.agri}        currency={currency} />
              <Separator className="my-2" />
              <Row label="إجمالي الموجودات الزكوية" v={totals.grossAssets} currency={currency} bold />
              <Row label="− المطلوبات القصيرة"     v={totals.deductions}  currency={currency} />
              <Row label="الوعاء قبل الإعفاء"      v={totals.baseBeforeExempt} currency={currency} bold />
              <Row label={`− نسبة الإعفاء (${(totals.exempt * 100).toFixed(1)}%)`}
                   v={totals.baseBeforeExempt * totals.exempt} currency={currency} />
              <Row label="الوعاء الزكوي الصافي"    v={totals.zakatBase}   currency={currency} bold />
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> الزكاة المستحقة (2.5%)
                </span>
                <span className="font-bold text-lg text-primary" dir="ltr">{fmt(totals.zakatGross)} {currency}</span>
              </div>
              {n(prepaidZakat) > 0 && (
                <>
                  <Row label="− زكاة معجّلة سابقاً" v={n(prepaidZakat)} currency={currency} />
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="font-semibold">الصافي المستحق</span>
                    <span className="font-bold text-lg text-primary" dir="ltr">{fmt(totals.netDue)} {currency}</span>
                  </div>
                </>
              )}
            </div>
            <Button onClick={printReport} variant="outline" className="w-full gap-2" disabled={exemptError}>
              <FileText className="h-4 w-4" /> تصدير تقرير PDF
            </Button>
            <SaveToHistoryCard
              payload={{
                record_type: "company",
                hijri_year: null,
                currency,
                total_assets: totals.grossAssets,
                total_liabilities: totals.deductions,
                zakat_base: totals.zakatBase,
                zakat_due: totals.zakatGross,
                prepaid_zakat: n(prepaidZakat),
                net_due: totals.netDue,
                snapshot: {
                  source: "CompanyWizard",
                  profile: { companyName, activity, sector, yearType, fiscalYear, countryCode, currency },
                  cash: { cashOnHand, pettyCash, bankCurrent, bankSavings, bankDeposits },
                  receivables: { tradeReceivables, notesReceivable, prepaidExpenses, supplierAdvances, doubtfulProvisions },
                  inventory: { rawMaterials, wip, finishedGoods, goodsInTransit, spareParts, obsoleteStock },
                  investments: { tradeSecurities, heldForSaleShares, heldForInvestShares, investZakatablePct, sukuk, subsidiariesZakatable },
                  estate: { realEstateForSale, landForSale, rentIncomeSaved },
                  agri: { tradedLivestock, tradedPoultryNet, tradedFishNet, honeyValue },
                  liabilities: { shortTermPayables, accruedExpenses, taxesDue, dividendsDeclared, longTermDueThisYear, prepaidZakat },
                  exempt: { shForeign, shGov, shWaqf, shNonMuslim },
                  totals,
                },
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-1">
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1} className="gap-1">
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */
function TextField({ label, v, set, placeholder }: { label: string; v: string; set: (x: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function Field({ label, v, set, currency }: { label: string; v: string; set: (x: string) => void; currency?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" inputMode="decimal" min="0" step="0.01" value={v}
          onChange={(e) => set(e.target.value)} dir="ltr" className={currency ? "pl-14" : ""} />
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
      <span className="font-bold text-primary" dir="ltr">{fmt(v)} {currency}</span>
    </div>
  );
}
function Row({ label, v, text, currency, bold }: { label: string; v?: number; text?: string; currency: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span dir="ltr">{text ?? (v !== undefined ? `${fmt(v)} ${currency}` : "")}</span>
    </div>
  );
}
