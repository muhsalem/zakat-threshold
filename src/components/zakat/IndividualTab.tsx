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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Coins, Landmark, TrendingUp, FileText, Package, Wheat, Home,
  MinusCircle, Calculator, Info, CheckCircle2, Sprout, CalendarClock, HandHeart,
  ShieldCheck, ClipboardCheck, Copy, AlertTriangle, Store, MonitorSmartphone, Globe,
} from "lucide-react";
import { toast } from "sonner";
import {
  ZAKAT_RATE, ZAKAT_RATE_GREGORIAN, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS,
  CROPS_NISAB_KG, HAWL_DAYS_HIJRI,
  num, fmt, currency, camelZakat, cowZakat, sheepZakat,
  COUNTRY_PRICES, checkHawl, formatHijri, gregorianToHijri, ZAKAT_RECIPIENTS,
} from "@/lib/zakat";
import { SaveToHistoryCard } from "./SaveToHistoryCard";
import SalaryZakatCalculator from "./SalaryZakatCalculator";
import AdvanceMultiYearZakat from "./AdvanceMultiYearZakat";
import RibaPurificationCalc from "./RibaPurificationCalc";
import InflationAdjusterCard from "./InflationAdjusterCard";
import ZakatStatsDashboard from "./ZakatStatsDashboard";
import SensitivityProjection from "./SensitivityProjection";
import { CashBankSection } from "./CashBankSection";
import { SecuritiesSection } from "./SecuritiesSection";
import { EsopZakatSection } from "./EsopZakatSection";
import { LivePricesCard } from "./LivePricesCard";
import { EightChannelsDistribution } from "./EightChannelsDistribution";
import { downloadZakatPdf } from "./ReactPdfReport";
import { downloadReportExcel } from "@/lib/exportExcel";
import { CurrencyConverterCard } from "./CurrencyConverterCard";
import type { FxRate } from "@/lib/fx";

import { FileSpreadsheet } from "lucide-react";
import { IncomeUsufructSection } from "./IncomeUsufructSection";
import { PrintReport } from "./PrintReport";
import { RikazSection } from "./RikazSection";
import { ShariaStandardsCard } from "./ShariaStandardsCard";
import { ShariaAuditTrail } from "./ShariaAuditTrail";
import { DigitalAssetsSection } from "./DigitalAssetsSection";
import { CryptoFatwasCard } from "./CryptoFatwasCard";
import { useAuditEntries } from "@/hooks/useAuditEntries";
import { EcommerceItemsTable, computeEcommerceTotals, type EcommerceItem } from "./EcommerceItemsTable";
import TradeActivityClassification, {
  emptyTradeActivitySelection,
  type TradeActivitySelection,
} from "./TradeActivityClassification";

import { supabase } from "@/integrations/supabase/client";


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

  // الأبواب المفتوحة في الأكورديون (للتنقل من بطاقة تفصيل النتيجة)
  const [openSections, setOpenSections] = useState<string[]>(["gold", "cash"]);
  const jumpToSection = (value: string) => {
    setOpenSections((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setTimeout(() => {
      const el = document.getElementById(`section-${value}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // ديباجة محاسب الزكاة (تظهر في رأس التقرير عند الطباعة)
  const [accountantName, setAccountantName] = useState("محمد سعيد سالم");
  const [accountantLicense, setAccountantLicense] = useState("");
  const [accountantPreamble, setAccountantPreamble] = useState(
    "بسم الله الرحمن الرحيم\nأشهد بصفتي محاسب الزكاة المعتمد أنّ هذا الإقرار قد أُعِدّ بناءً على البيانات المُقدَّمة من المُزكِّي وفقاً للمعايير الشرعية المعتمدة (AAOIFI رقم 35 لزكاة الشركات والأفراد) وعلى ضوء فتاوى المجامع الفقهية المعاصرة، وبعد التحقق من بلوغ النصاب وحولان الحول وفق التقويم الهجري، وخصم الديون المستحقة والنفقات الواجبة. وقد رُوعي مبدأ «الأنفع للفقراء» في تقدير النصاب، وأُجريت عمليات التطهير على العوائد غير الشرعية. والله المستعان وعليه التُّكلان."
  );
  const [accountantOpinion, setAccountantOpinion] = useState("");
  const [opinionType, setOpinionType] = useState<"clean" | "qualified" | "adverse">("clean");
  const [previousYearZakat, setPreviousYearZakat] = useState("");
  // إدراج سجل المراجعة والتدقيق الشرعي ضمن التقرير
  const [includeAuditReport, setIncludeAuditReport] = useState(false);
  const { entries: auditEntries, loading: auditLoading } = useAuditEntries(includeAuditReport);
  // الزكاة المعجَّلة المدفوعة مقدماً (تُخصم من الواجب)
  const [prepaidZakat, setPrepaidZakat] = useState("");
  const [prepaidYears, setPrepaidYears] = useState("1");

  // === زكاة الفطر التلقائية (أواخر شعبان + رمضان) ===
  const [fitrFamilySize, setFitrFamilySize] = useState("1");
  const [fitrEnabled, setFitrEnabled] = useState(true);
  // سعر تقريبي لكيلو القمح حسب الدولة (نفس الجدول المعتمد في حاسبة الفطر)
  const WHEAT_PRICE_PER_KG: Record<string, number> = {
    EG: 22, SA: 5, AE: 5, KW: 0.5, QA: 5, BH: 0.5, OM: 0.5,
    JO: 1, MA: 12, DZ: 90, TN: 3, IQ: 1300, SY: 5500, LB: 50000,
    YE: 250, SD: 600, LY: 5, PS: 4, TR: 35, US: 1.2, EU: 1.1, GB: 0.95,
  };
  const FITR_SAA_KG = 2.176; // صاع نبوي بالقمح


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
  const [nisabRecordId, setNisabRecordId] = useState<string | null>(null);
  const [nisabSaving, setNisabSaving] = useState(false);
  const [nisabSaveMsg, setNisabSaveMsg] = useState("");
  const hawl = useMemo(() => checkHawl(nisabStartDate), [nisabStartDate]);
  const effectiveRate = calendarBasis === "gregorian" ? ZAKAT_RATE_GREGORIAN : ZAKAT_RATE;

  // ========= الذهب: 4 أقسام =========
  // أ) السبائك والأونصات
  const [sb9, setSb9] = useState(""); const [sb14, setSb14] = useState("");
  const [sb18, setSb18] = useState(""); const [sb21, setSb21] = useState("");
  const [sb22, setSb22] = useState(""); const [sb24, setSb24] = useState("");
  const [ounces, setOunces] = useState("");
  const [sbHalal, setSbHalal] = useState(true);
  const [sbFullyOwned, setSbFullyOwned] = useState(true);
  const [sbAcquireDate, setSbAcquireDate] = useState("");
  // ب) الجنيهات والعملات الذهبية (عيار 21)
  const [coinQuarter, setCoinQuarter] = useState(""); // 2.125 جم
  const [coinHalf, setCoinHalf] = useState("");       // 4.25 جم
  const [coinFull, setCoinFull] = useState("");       // 8.5 جم
  const [coinCustomKarat, setCoinCustomKarat] = useState("21");
  const [coinCustomWeight, setCoinCustomWeight] = useState("8.5");
  const [coinCustomQty, setCoinCustomQty] = useState("");
  const [coinHalal, setCoinHalal] = useState(true);
  const [coinFullyOwned, setCoinFullyOwned] = useState(true);
  const [coinAcquireDate, setCoinAcquireDate] = useState("");
  const [coinPurpose, setCoinPurpose] = useState<"storage" | "wear">("storage");
  const [jwAcquireDate, setJwAcquireDate] = useState("");
  // ج) المجوهرات
  const [jw9, setJw9] = useState(""); const [jw12, setJw12] = useState("");
  const [jw14, setJw14] = useState(""); const [jw18, setJw18] = useState("");
  const [jw21, setJw21] = useState(""); const [jw22, setJw22] = useState("");
  const [jw24, setJw24] = useState("");
  // وزن الأحجار الكريمة المُدمجة (لاستبعادها) — المصنعية مستبعَدة تلقائياً
  const [jwStoneGrams, setJwStoneGrams] = useState("");
  const [jewelryPurpose, setJewelryPurpose] = useState<"storage" | "wear">("wear");
  const [jewelryOpinion, setJewelryOpinion] = useState<"majority" | "hanafi">("majority");
  // شروط إعفاء حلي الزينة عند رأي الجمهور
  const [jwHaal, setJwHaal] = useState(true);          // حال غير مؤجل (مستعمل فعلاً)
  const [jwModeration, setJwModeration] = useState(true); // في حدود القصد والاعتدال
  const [jwPermissible, setJwPermissible] = useState(true); // استعمال مباح (لا تبرّج محرّم ولا تشبّه)
  // د) المشغولات الذهبية الأخرى
  const [brk18, setBrk18] = useState(""); const [brk21, setBrk21] = useState("");
  const [brk24, setBrk24] = useState("");
  const [brkOtherKarat, setBrkOtherKarat] = useState("9");
  const [brkOtherWeight, setBrkOtherWeight] = useState("");
  const [brkStoneGrams, setBrkStoneGrams] = useState("");
  const [storageKarat, setStorageKarat] = useState("21");
  const [storageWeight, setStorageWeight] = useState("");
  const [brkAcquireDate, setBrkAcquireDate] = useState("");

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
  const [svAcquireDate, setSvAcquireDate] = useState("");
  const [svCoinAcquireDate, setSvCoinAcquireDate] = useState("");
  const [svJewelryAcquireDate, setSvJewelryAcquireDate] = useState("");

  // النقدية والبنوك (المجموع يُحسب داخل المكوّن المتخصّص ويُمرَّر هنا)
  const [cashTotalFromSection, setCashTotalFromSection] = useState(0);

  // الأوراق المالية — يُحسب الإجمالي داخل مكوّن مخصّص
  const [securitiesTotalFromSection, setSecuritiesTotalFromSection] = useState(0);

  // الأصول الرقمية والاستثمارية (عملات رقمية + محفظة أسهم وفق AAOIFI 35)
  const [digitalAssetsTotal, setDigitalAssetsTotal] = useState(0);

  // الأوراق التجارية
  const [bills, setBills] = useState("");

  // عروض التجارة
  const [inventory, setInventory] = useState("");
  const [receivablesGood, setReceivablesGood] = useState(""); // ديون مرجوّة
  const [receivablesBad, setReceivablesBad] = useState(""); // ديون متعذّرة (لا تُزكَّى الآن)
  // هل المزكي مساهم في شركة (داخل قسم عروض التجارة)
  const [tradeIsShareholder, setTradeIsShareholder] = useState(false);
  const [tradeShareCompany, setTradeShareCompany] = useState("");
  const [tradeSharePct, setTradeSharePct] = useState("");
  const [tradeShareCompanyBase, setTradeShareCompanyBase] = useState("");
  // تصنيف النشاط التجاري (مصر + المقابلات الدولية) + تاريخ التشغيل
  const [tradeActivity, setTradeActivity] = useState<TradeActivitySelection>(emptyTradeActivitySelection());
  // المتجر الإلكتروني والمنتجات والخدمات الرقمية
  const [ecommerceEnabled, setEcommerceEnabled] = useState(false);
  const [ecommerceInventory, setEcommerceInventory] = useState("");      // بضاعة المتجر
  const [ecommerceDigitalProducts, setEcommerceDigitalProducts] = useState(""); // منتجات رقمية
  const [ecommerceServices, setEcommerceServices] = useState("");      // خدمات رقمية
  const [ecommerceReceivables, setEcommerceReceivables] = useState(""); // مستحقات متجر
  // سجل بنود المتجر (منتجات/خدمات) — يُغذّي الحقول الأربعة تلقائياً عند استخدامه
  const [ecommerceItems, setEcommerceItems] = useState<EcommerceItem[]>([]);
  // مزامنة إجمالي البنود إلى الحقول الأربعة (عند وجود بنود فقط)
  useEffect(() => {
    if (!ecommerceItems.length) return;
    const t = computeEcommerceTotals(ecommerceItems);
    setEcommerceInventory(t.physical ? String(t.physical) : "");
    setEcommerceDigitalProducts(t.digital ? String(t.digital) : "");
    setEcommerceServices(t.service ? String(t.service) : "");
    setEcommerceReceivables(t.receivable ? String(t.receivable) : "");
  }, [ecommerceItems]);

  // العقار — تركيب العقار: أرض فقط / مبنى فقط / الأرض والمبنى معاً
  type RealEstateComp = "land" | "building" | "both";
  // عقار للتجارة (يُزكَّى بالقيمة السوقية يوم الوجوب)
  const [reTradeComp, setReTradeComp] = useState<RealEstateComp>("both");
  const [reTradeLand, setReTradeLand] = useState("");      // قيمة الأرض السوقية
  const [reTradeBuilding, setReTradeBuilding] = useState(""); // قيمة المبنى السوقية
  // عقار الإيجار/الاستغلال (يُزكَّى صافي الإيراد المُدّخر)
  const [reRentComp, setReRentComp] = useState<RealEstateComp>("both");
  const [reRentLandIncome, setReRentLandIncome] = useState("");      // صافي إيراد الأرض
  const [reRentBuildingIncome, setReRentBuildingIncome] = useState(""); // صافي إيراد المبنى
  // قيم مشتقة للحفاظ على التكامل مع باقي الحسابات
  const realEstateTrade =
    reTradeComp === "land" ? reTradeLand
    : reTradeComp === "building" ? reTradeBuilding
    : String(num(reTradeLand) + num(reTradeBuilding));
  const realEstateRentIncome =
    reRentComp === "land" ? reRentLandIncome
    : reRentComp === "building" ? reRentBuildingIncome
    : String(num(reRentLandIncome) + num(reRentBuildingIncome));


  // المستغلات والدخل (المجموع يُحسب داخل المكوّن)
  const [incomeUsufructTotal, setIncomeUsufructTotal] = useState(0);

  // الزروع — هل يملك أرضاً زراعية
  const [ownsFarmland, setOwnsFarmland] = useState(false);
  const [cropsKg, setCropsKg] = useState("");
  const [cropsValuePerKg, setCropsValuePerKg] = useState("");
  const [cropsIrrigation, setCropsIrrigation] = useState<"rain" | "irrigated">("rain");

  // الأنعام — هل يملك مواشي
  const [ownsLivestock, setOwnsLivestock] = useState(false);
  const [camels, setCamels] = useState("");
  const [cows, setCows] = useState("");
  const [sheep, setSheep] = useState("");
  // الأنعام للتجارة — تُلحق بعروض التجارة (2.5% من القيمة السوقية)
  const [livestockForTrade, setLivestockForTrade] = useState(false);
  const [livestockTradeValue, setLivestockTradeValue] = useState("");

  // بيانات زكاة ESOP/RSU (تُرسل عبر EsopZakatSection.onChange)
  const [esopData, setEsopData] = useState<import("./EsopZakatSection").EsopReportData | undefined>();
  const [fxRates, setFxRates] = useState<FxRate[]>([]);


  // قاعدة الأنشطة الزراعية الملحقة (عسل + أسماك + دواجن) — تُضمّ لعروض التجارة
  const [agriTradeBase, setAgriTradeBase] = useState(0);

  // الديون والالتزامات — تصنيف شرعي مفصّل
  // ① الديون الحالة (واجبة السداد الآن)
  const [debtPersonalLoan, setDebtPersonalLoan] = useState("");    // قروض شخصية
  const [debtBankLoan, setDebtBankLoan] = useState("");            // ديون مصرفية
  const [debtConsumerFinance, setDebtConsumerFinance] = useState(""); // تمويل استهلاكي
  const [debtCarInstall, setDebtCarInstall] = useState("");        // أقساط سيارات/سلع حالَّة
  const [debtTradePayable, setDebtTradePayable] = useState("");    // ديون تجارية مستحقة
  const [debtPurchases, setDebtPurchases] = useState("");          // أثمان مشتريات لم تُسدد
  // ② الديون المؤجلة — رأي العمل المعاصر
  const [debtDeferredYearly, setDebtDeferredYearly] = useState(""); // قسط السنة فقط من الديون المؤجلة
  const [debtDeferredPolicy, setDebtDeferredPolicy] = useState<"yearly" | "full" | "none">("yearly");
  const [debtMortgage, setDebtMortgage] = useState("");            // أقساط تمويل عقاري (إجمالي متبقي)
  const [debtMahr, setDebtMahr] = useState("");                    // مهر مؤجل
  // ③ النفقة الواجبة إذا صارت ديناً
  const [debtAlimony, setDebtAlimony] = useState("");              // نفقة زوجة/أولاد/أقارب بحكم أو اتفاق
  // نفقات ضرورية مستحقة (فواتير وإيجارات)
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

    // ج) المجوهرات — استبعاد وزن الأحجار الكريمة (المصنعية مستبعَدة تلقائياً لأن الحساب بالوزن الصافي × سعر السبيكة)
    const jewelryGramsGross =
      conv(num(jw9), 9) + conv(num(jw12), 12) + conv(num(jw14), 14) +
      conv(num(jw18), 18) + conv(num(jw21), 21) + conv(num(jw22), 22) + num(jw24);
    const jewelryGrams24Raw = Math.max(0, jewelryGramsGross - num(jwStoneGrams));
    // إعفاء حلي الزينة عند الجمهور مشروط بـ: حال غير مؤجل، وفي حدود القصد والاعتدال، واستعمال مباح
    const jwWearExempt = jwHaal && jwModeration && jwPermissible;
    const jewelryGrams24 = jewelryPurpose === "storage"
      ? jewelryGrams24Raw
      : (jewelryOpinion === "hanafi" || !jwWearExempt ? jewelryGrams24Raw : 0);

    // د) المشغولات الأخرى (كسر + ادخاري غير قابل للبس) → دائماً تُزكَّى — مع استبعاد الأحجار الكريمة
    const brokenGrossGrams =
      conv(num(brk18), 18) + conv(num(brk21), 21) + num(brk24) +
      conv(num(brkOtherWeight), num(brkOtherKarat));
    const brokenGrams24 = Math.max(0, brokenGrossGrams - num(brkStoneGrams));
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
    const securitiesTotal = securitiesTotalFromSection;
    const billsTotal = num(bills);
    const tradeShareholderBase = tradeIsShareholder
      ? num(tradeShareCompanyBase) * (num(tradeSharePct) / 100) : 0;
    const livestockTradeBase = livestockForTrade ? num(livestockTradeValue) : 0;
    const ecommerceTotal = ecommerceEnabled
      ? num(ecommerceInventory) + num(ecommerceDigitalProducts) + num(ecommerceServices) + num(ecommerceReceivables)
      : 0;
    const tradeTotal = num(inventory) + num(receivablesGood) + tradeShareholderBase + agriTradeBase + livestockTradeBase + ecommerceTotal;
    const realEstateZakatable = num(realEstateTrade) + num(realEstateRentIncome);
    const incomeUsufruct = incomeUsufructTotal;

    const goldNisabValue = GOLD_NISAB_GRAMS * gp;
    const silverNisabValue = SILVER_NISAB_GRAMS * sp;
    const moneyNisab = Math.min(goldNisabValue, silverNisabValue);

    // ① الديون الحالة — تُخصم باتفاق الفقهاء
    const dueDebts = num(debtPersonalLoan) + num(debtBankLoan) + num(debtConsumerFinance)
      + num(debtCarInstall) + num(debtTradePayable) + num(debtPurchases);
    // ② الديون المؤجلة — حسب القول المختار في الفتوى المعاصرة
    const deferredTotal = num(debtMortgage) + num(debtMahr);
    const deferredDeduction =
      debtDeferredPolicy === "yearly" ? num(debtDeferredYearly)
      : debtDeferredPolicy === "full" ? (deferredTotal || num(debtDeferredYearly))
      : 0;
    // ③ النفقة الواجبة إذا صارت ديناً — تُخصم
    const alimony = num(debtAlimony);
    const debts = dueDebts + deferredDeduction + alimony + num(expenses);
    const monetaryGross = cashTotal + securitiesTotal + digitalAssetsTotal + billsTotal + tradeTotal + realEstateZakatable + incomeUsufruct;
    const monetaryBase = monetaryGross - debts;
    const monetaryEligible = monetaryBase >= moneyNisab && monetaryBase > 0;
    const monetaryZakat = monetaryEligible ? monetaryBase * effectiveRate : 0;

    // الزروع (لا يُشترط لها حول) — تُحسب فقط إذا كان يملك أرضاً زراعية
    const cropsKgN = ownsFarmland ? num(cropsKg) : 0;
    const cropsValue = cropsKgN * num(cropsValuePerKg);
    const cropsRate = cropsIrrigation === "rain" ? 0.1 : 0.05;
    const cropsEligible = ownsFarmland && cropsKgN >= CROPS_NISAB_KG;
    const cropsZakat = cropsEligible ? cropsValue * cropsRate : 0;

    // إذا اختار المزكي معاملة الأنعام كعروض تجارة، فلا تُحسب عيناً (لتفادي الازدواج)
    const livestockAsAyn = ownsLivestock && !livestockForTrade;
    const camelsN = livestockAsAyn ? Math.floor(num(camels)) : 0;
    const cowsN = livestockAsAyn ? Math.floor(num(cows)) : 0;
    const sheepN = livestockAsAyn ? Math.floor(num(sheep)) : 0;

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
    jwStoneGrams, jwHaal, jwModeration, jwPermissible,
    brk18, brk21, brk24, brkOtherKarat, brkOtherWeight, brkStoneGrams, storageKarat, storageWeight,
    securitiesTotalFromSection, bills,
    inventory, receivablesGood, realEstateTrade, realEstateRentIncome,
    tradeIsShareholder, tradeSharePct, tradeShareCompanyBase,
    agriTradeBase, livestockForTrade, livestockTradeValue,
    ecommerceEnabled, ecommerceInventory, ecommerceDigitalProducts, ecommerceServices, ecommerceReceivables,
    incomeUsufructTotal, ownsFarmland, ownsLivestock,
    debtPersonalLoan, debtBankLoan, debtConsumerFinance, debtCarInstall, debtTradePayable, debtPurchases,
    debtDeferredPolicy, debtDeferredYearly, debtMortgage, debtMahr, debtAlimony,
    expenses, cropsKg, cropsValuePerKg, cropsIrrigation,
    camels, cows, sheep, effectiveRate, hawl, cashTotalFromSection, digitalAssetsTotal,
  ]);

  const cur = (n: number) => currency(n, currencyName);

  // === حساب زكاة الفطر التلقائية (أواخر شعبان أو رمضان) ===
  const fitrAuto = useMemo(() => {
    const today = new Date();
    const h = gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const active = (h.hm === 8 && h.hd >= 25) || h.hm === 9;
    if (!active) return { active: false, total: 0, hijri: h };
    const persons = Math.max(0, Math.floor(num(fitrFamilySize)));
    const pricePerKg = WHEAT_PRICE_PER_KG[countryCode] ?? WHEAT_PRICE_PER_KG.EG;
    return { active: true, total: persons * FITR_SAA_KG * pricePerKg, hijri: h, persons, pricePerKg };
  }, [fitrFamilySize, countryCode]);
  const fitrContribution = fitrEnabled && fitrAuto.active ? fitrAuto.total : 0;



  return (
    <div dir="rtl" className="text-right">
      {/* تقرير الطباعة الاحترافي — يظهر فقط عند الطباعة */}
      <PrintReport
        data={{
          name, profession, countryCode, currencyName,
          calendarBasis, effectiveRate,
          rows: [
            { label: "زكاة الذهب", gross: calc.totalGoldValue, nisab: calc.goldNisabValue, eligible: calc.goldEligible, zakat: calc.goldZakat },
            { label: "زكاة الفضة", gross: calc.silverValue, nisab: calc.silverNisabValue, eligible: calc.silverEligible, zakat: calc.silverZakat },
            { label: "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية", gross: calc.cashTotal, eligible: true, zakat: 0 },
            { label: "زكاة الأوراق المالية ووثائق التأمين", gross: calc.securitiesTotal, eligible: true, zakat: 0 },
            { label: "زكاة الأوراق التجارية (الكمبيالات وأوراق القبض)", gross: calc.billsTotal, eligible: true, zakat: 0 },
            { label: "زكاة الدخل وعروض التجارة والمستغلات", gross: calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal, eligible: true, zakat: 0 },
            { label: "زكاة الزروع والثمار", gross: calc.cropsValue, eligible: calc.cropsEligible, zakat: calc.cropsZakat },
          ],
          livestock: { camels: calc.camelsN, cows: calc.cowsN, sheep: calc.sheepN, show: ownsLivestock, mode: livestockForTrade ? "trade" : "grazing", tradeValue: livestockForTrade ? num(livestockTradeValue) : 0 },
          esop: esopData,
          monetaryGross: calc.monetaryGross,
          debts: calc.debts,
          monetaryBase: calc.monetaryBase,
          moneyNisab: calc.moneyNisab,
          totalZakat: calc.total,
          hawlComplete: hawl ? hawl.hawlComplete : null,
          hawlDate: nisabStartDate,
          goldPricePerGram: num(goldPrice),
          silverPricePerGram: num(silverPrice),
          accountantName, accountantLicense, accountantPreamble,
          accountantOpinion, opinionType,
          previousYearZakat,
          auditEntries: includeAuditReport ? auditEntries : undefined,
        }}
      />

      <Tabs defaultValue="calc" className="space-y-5" dir="rtl">
        <TabsList dir="rtl" className="grid grid-cols-2 w-full max-w-2xl mx-auto print:hidden">
          <TabsTrigger value="calc" className="gap-1.5 text-sm py-2.5">
            <Calculator className="h-4 w-4" /> حساب الزكاة
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-sm py-2.5">
            <ShieldCheck className="h-4 w-4" /> المراجعة والتدقيق والإمتثال
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calc" className="mt-0">
          <div className="grid lg:grid-cols-3 gap-6">


      {/* تقرير الطباعة الاحترافي — يظهر فقط عند الطباعة */}
      <PrintReport
        data={{
          name, profession, countryCode, currencyName,
          calendarBasis, effectiveRate,
          rows: [
            { label: "زكاة الذهب", gross: calc.totalGoldValue, nisab: calc.goldNisabValue, eligible: calc.goldEligible, zakat: calc.goldZakat },
            { label: "زكاة الفضة", gross: calc.silverValue, nisab: calc.silverNisabValue, eligible: calc.silverEligible, zakat: calc.silverZakat },
            { label: "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية", gross: calc.cashTotal, eligible: true, zakat: 0 },
            { label: "زكاة الأوراق المالية ووثائق التأمين", gross: calc.securitiesTotal, eligible: true, zakat: 0 },
            { label: "زكاة الأوراق التجارية (الكمبيالات وأوراق القبض)", gross: calc.billsTotal, eligible: true, zakat: 0 },
            { label: "زكاة الدخل وعروض التجارة والمستغلات", gross: calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal, eligible: true, zakat: 0 },
            { label: "زكاة الزروع والثمار", gross: calc.cropsValue, eligible: calc.cropsEligible, zakat: calc.cropsZakat },
          ],
          livestock: { camels: calc.camelsN, cows: calc.cowsN, sheep: calc.sheepN, show: ownsLivestock, mode: livestockForTrade ? "trade" : "grazing", tradeValue: livestockForTrade ? num(livestockTradeValue) : 0 },
          esop: esopData,
          monetaryGross: calc.monetaryGross,
          debts: calc.debts,
          monetaryBase: calc.monetaryBase,
          moneyNisab: calc.moneyNisab,
          totalZakat: calc.total,
          hawlComplete: hawl ? hawl.hawlComplete : null,
          hawlDate: nisabStartDate,
          goldPricePerGram: num(goldPrice),
          silverPricePerGram: num(silverPrice),
          accountantName, accountantLicense, accountantPreamble,
          accountantOpinion, opinionType,
          previousYearZakat,
          auditEntries: includeAuditReport ? auditEntries : undefined,
        }}
      />


      <div className="lg:col-span-2 space-y-6">
        {/* بيانات المزكي + الإقرار وشرط الحول */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              بيانات المزكي والإقرار وشرط الحَوْل
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

            <div className="md:col-span-2">
              <Separator className="my-2" />
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
                <CalendarClock className="h-4 w-4" /> الإقرار وشرط الحَوْل
              </div>
            </div>

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

            <div className="space-y-1.5 md:col-span-2">
              <Label className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                سجل بلوغ النصاب الموحَّد (يطبَّق على جميع أنواع الأصول)
              </Label>
              <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                <Input type="date" value={nisabStartDate} onChange={(e) => setNisabStartDate(e.target.value)} />
                <Button type="button" variant="outline" size="sm" disabled={nisabSaving || !nisabStartDate}
                  onClick={async () => {
                    setNisabSaving(true);
                    const hijri_label = hawl ? formatHijri(hawl.hijriStart) : null;
                    const payload = {
                      owner_label: name || "بدون اسم",
                      unified_nisab_date: nisabStartDate,
                      hijri_label,
                      calendar_basis: calendarBasis,
                      notes: notes || null,
                    };
                    const { data, error } = nisabRecordId
                      ? await supabase.from("nisab_records").update(payload).eq("id", nisabRecordId).select().single()
                      : await supabase.from("nisab_records").insert(payload).select().single();
                    if (!error && data) { setNisabRecordId(data.id); setNisabSaveMsg("تم الحفظ ✓"); }
                    else setNisabSaveMsg("تعذّر الحفظ");
                    setNisabSaving(false);
                    setTimeout(() => setNisabSaveMsg(""), 2500);
                  }}>
                  {nisabSaving ? "..." : nisabRecordId ? "تحديث السجل" : "حفظ السجل"}
                </Button>
                {nisabSaveMsg && <span className="text-xs text-primary">{nisabSaveMsg}</span>}
              </div>
              {hawl && (
                <p className="text-xs text-muted-foreground">
                  الموافق هجريًا: <b>{formatHijri(hawl.hijriStart)}</b>
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Info className="inline h-3 w-3 ml-1" />
                وفقاً للجمهور (ضم المستفاد إلى ما عنده من جنسه): تاريخ بلوغ النصاب الأول يصبح <b>المرجع الموحَّد</b> لحَوْل جميع الأصول النقدية (ذهب، فضة، نقد، عروض تجارة، أسهم). الزروع والثمار لا يشترط لها حول.
              </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>أساس حساب الحول</Label>
              <RadioGroup value={calendarBasis} onValueChange={(v) => setCalendarBasis(v as "hijri" | "gregorian")} className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="hijri" id="cb-h" /><Label htmlFor="cb-h" className="text-sm">هجري — نسبة 2.5%</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="gregorian" id="cb-g" /><Label htmlFor="cb-g" className="text-sm">ميلادي — نسبة 2.577% (معدّلة)</Label></div>
              </RadioGroup>
            </div>

            {hawl && (
              <div className="md:col-span-2">
                <Alert className={hawl.hawlComplete ? "border-primary/30 bg-primary/5" : "border-destructive/40 bg-destructive/5"}>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {hawl.hawlComplete ? (
                      <>اكتمل الحَوْل (مضى <b>{hawl.daysPassed} يومًا</b> ≥ {HAWL_DAYS_HIJRI} يوم هجري). تجب الزكاة على جميع الأصول النقدية تحت هذا السجل الموحَّد.</>
                    ) : (
                      <>لم يكتمل الحول بعد — مضى <b>{hawl.daysPassed} يومًا</b> ويتبقى <b>{hawl.daysRemaining} يومًا</b> لإكمال 354 يومًا هجريًا. لا تجب زكاة النقد والذهب الآن (الزروع والثمار لا تشترط حولًا).</>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {calendarBasis === "gregorian" && (
              <div className="md:col-span-2">
                <Alert className="border-gold/30 bg-gold/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    وفق قرار الندوة السابعة لقضايا الزكاة (الكويت 1417هـ): من حسب زكاته على السنة الميلادية يُضاعف المعدل من 2.5% إلى <b>2.577%</b> لجبر فرق 11 يومًا تقريبًا بين السنتين.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="md:col-span-2">
              <Label className="mb-2 block">ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي ملاحظات إضافية" rows={2} />
            </div>
          </CardContent>
        </Card>


        {/* الأبواب */}
        <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-3">
          {/* زكاة الذهب */}
          <AccordionItem id="section-gold" value="gold" className="border rounded-xl shadow-soft bg-card px-4">
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
                <div className="grid md:grid-cols-3 gap-3 pt-2 border-t">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label className="text-xs">من كسب حلال</Label>
                    <Switch checked={sbHalal} onCheckedChange={setSbHalal} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label className="text-xs">مملوكة ملكاً تاماً</Label>
                    <Switch checked={sbFullyOwned} onCheckedChange={setSbFullyOwned} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الاقتناء</Label>
                    <Input type="date" value={sbAcquireDate} onChange={(e) => setSbAcquireDate(e.target.value)} />
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
                <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label className="text-xs">من كسب حلال</Label>
                    <Switch checked={coinHalal} onCheckedChange={setCoinHalal} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label className="text-xs">مملوكة ملكاً تاماً</Label>
                    <Switch checked={coinFullyOwned} onCheckedChange={setCoinFullyOwned} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الاقتناء</Label>
                    <Input type="date" value={coinAcquireDate} onChange={(e) => setCoinAcquireDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">غرض الاقتناء</Label>
                    <RadioGroup value={coinPurpose} onValueChange={(v) => setCoinPurpose(v as "storage" | "wear")} className="flex gap-4 pt-1">
                      <div className="flex items-center gap-2"><RadioGroupItem value="wear" id="cp-w" /><Label htmlFor="cp-w" className="text-sm">حلي وزينة</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="storage" id="cp-s" /><Label htmlFor="cp-s" className="text-sm">ادخار وحفظ قيمة</Label></div>
                    </RadioGroup>
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
                  <NumField
                    label="وزن الأحجار الكريمة المُدمجة (للاستبعاد)"
                    value={jwStoneGrams}
                    onChange={setJwStoneGrams}
                    unit="جم"
                    hint="الألماس · الياقوت · الزمرد · اللؤلؤ — لا زكاة فيها لذاتها"
                  />
                  <div className="rounded-md border bg-primary/5 border-primary/20 p-3 text-[11px] leading-relaxed">
                    <b className="text-primary">المصنعية مستبعَدة تلقائياً</b> — لأن الحساب يتم بوزن الذهب الصافي × سعر الجرام، فلا تدخل أجرة الصياغة في الوعاء.
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">غرض الاقتناء</Label>
                    <RadioGroup value={jewelryPurpose} onValueChange={(v) => setJewelryPurpose(v as "storage" | "wear")} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="wear" id="jp-w" /><Label htmlFor="jp-w" className="text-sm">حلي وزينة</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="storage" id="jp-s" /><Label htmlFor="jp-s" className="text-sm">ادخار وحفظ قيمة</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الاقتناء</Label>
                    <Input type="date" value={jwAcquireDate} onChange={(e) => setJwAcquireDate(e.target.value)} />
                  </div>
                  {jewelryPurpose === "wear" && (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm">إخضاع حلي الزينة للزكاة (رأي الحنفية)</Label>
                        <p className="text-[10px] text-muted-foreground">إيقافه = رأي الجمهور (لا زكاة على المستعمل بشروطه)</p>
                      </div>
                      <Switch checked={jewelryOpinion === "hanafi"} onCheckedChange={(v) => setJewelryOpinion(v ? "hanafi" : "majority")} />
                    </div>
                  )}
                </div>
                {jewelryPurpose === "wear" && jewelryOpinion === "majority" && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="text-xs font-semibold text-primary">شروط إعفاء حلي الزينة (رأي الجمهور)</div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <div className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
                        <Label htmlFor="jw-haal" className="text-[11px]">حال غير مؤجل (مستعمل فعلاً)</Label>
                        <Switch id="jw-haal" checked={jwHaal} onCheckedChange={setJwHaal} />
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
                        <Label htmlFor="jw-mod" className="text-[11px]">في حدود القصد والاعتدال</Label>
                        <Switch id="jw-mod" checked={jwModeration} onCheckedChange={setJwModeration} />
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5">
                        <Label htmlFor="jw-perm" className="text-[11px]">استعمال مباح (لا تبرّج محرّم)</Label>
                        <Switch id="jw-perm" checked={jwPermissible} onCheckedChange={setJwPermissible} />
                      </div>
                    </div>
                    {!(jwHaal && jwModeration && jwPermissible) && (
                      <p className="text-[11px] text-destructive leading-relaxed">
                        ⚠ لاختلال أحد الشروط الثلاثة يخضع الحلي للزكاة احتياطاً حتى على رأي الجمهور.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* د) المشغولات الذهبية الأخرى */}
              <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
                <div className="text-sm font-semibold text-primary">د · المشغولات الذهبية الأخرى</div>
                <p className="text-xs text-muted-foreground">ذهب مستعمل وكسر (للتهشيم — قِدَم الطراز — مكسور) + ذهب ادخاري غير قابل للبس</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <NumField label="عيار 24" value={brk24} onChange={setBrk24} unit="جم" />
                  <NumField label="عيار 21" value={brk21} onChange={setBrk21} unit="جم" />
                  <NumField label="عيار 18" value={brk18} onChange={setBrk18} unit="جم" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm">عيار آخر</Label>
                      <Select value={brkOtherKarat} onValueChange={setBrkOtherKarat}>
                        <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["9", "12", "14", "22"].map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <Input type="number" min="0" value={brkOtherWeight} onChange={(e) => setBrkOtherWeight(e.target.value)} placeholder="0" dir="ltr" style={{ textAlign: "right" }} className="pl-10" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">جم</span>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <NumField
                    label="وزن الأحجار الكريمة في المشغولات (للاستبعاد)"
                    value={brkStoneGrams}
                    onChange={setBrkStoneGrams}
                    unit="جم"
                  />
                  <div className="rounded-md border bg-primary/5 border-primary/20 p-3 text-[11px] leading-relaxed flex items-center">
                    <span><b className="text-primary">المصنعية مستبعَدة تلقائياً</b> — الحساب بوزن الذهب الصافي فقط.</span>
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
                <div className="grid md:grid-cols-3 gap-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الاقتناء</Label>
                    <Input type="date" value={brkAcquireDate} onChange={(e) => setBrkAcquireDate(e.target.value)} />
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
          <AccordionItem id="section-silver" value="silver" className="border rounded-xl shadow-soft bg-card px-4">
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
                <div className="space-y-1.5">
                  <Label className="text-xs">تاريخ الاقتناء</Label>
                  <Input type="date" value={svAcquireDate} onChange={(e) => setSvAcquireDate(e.target.value)} />
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
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs">تاريخ الاقتناء</Label>
                  <Input type="date" value={svCoinAcquireDate} onChange={(e) => setSvCoinAcquireDate(e.target.value)} />
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

                <div className="grid md:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">غرض الاقتناء</Label>
                    <RadioGroup value={silverPurpose} onValueChange={(v) => setSilverPurpose(v as "storage" | "wear")} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="wear" id="sp-w" /><Label htmlFor="sp-w" className="text-sm">حلي وزينة</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="storage" id="sp-s" /><Label htmlFor="sp-s" className="text-sm">ادخار وحفظ قيمة</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الاقتناء</Label>
                    <Input type="date" value={svJewelryAcquireDate} onChange={(e) => setSvJewelryAcquireDate(e.target.value)} />
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

              {/* الإجمالي الفضي */}
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
              </div>

              {/* إجمالي وعاء الذهب + الفضة — الزكاة الواجبة ثم الأسعار المرجعية اللحظية */}
              <div className="rounded-xl border-2 border-gold/50 bg-gold/10 p-4 space-y-3">
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

                {/* الأسعار المرجعية — تحديث لحظي حسب الدولة المسجلة في بيانات المزكي */}
                <Separator />
                <div className="text-xs font-semibold text-primary flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" />
                  الأسعار المرجعية اليوم ({country.name}) — تحديث لحظي حسب الدولة المسجلة في بيانات المزكي
                </div>
                <div className="grid md:grid-cols-2 gap-3 rounded-lg border bg-background/60 p-3">
                  <NumField label="سعر جرام الذهب عيار 24" value={goldPrice} onChange={setGoldPrice} unit={currencyName} />
                  <NumField label="سعر جرام الفضة الخالصة (عيار 999)" value={silverPrice} onChange={setSilverPrice} unit={currencyName} />
                  <div className="md:col-span-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 text-right">
                    نصاب الذهب: <b>{cur(calc.goldNisabValue)}</b> — نصاب الفضة: <b>{cur(calc.silverNisabValue)}</b> — الأنفع للفقراء: <b>{cur(calc.moneyNisab)}</b>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* النقد */}
          <AccordionItem id="section-cash" value="cash" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Landmark className="h-5 w-5 text-primary" /> زكاة الأوراق النقدية والحسابات والبطاقات والمحافظ البنكية
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <CashBankSection
                countryCode={countryCode}
                currencyName={currencyName}
                onTotalChange={setCashTotalFromSection}
              />
              <div className="pt-3 border-t border-dashed">
                <div className="mb-2 text-sm font-semibold text-primary">حاسبة تطهير الفوائد الربوية (تُلحق بالنقد والبنوك)</div>
                <RibaPurificationCalc currencyName={currencyName} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* الأوراق المالية */}
          <AccordionItem id="section-securities" value="securities" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" /> زكاة الأوراق المالية ووثائق التأمين
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <SecuritiesSection
                currencyName={currencyName}
                onTotalChange={setSecuritiesTotalFromSection}
              />
              <EsopZakatSection currencyName={currencyName} onChange={setEsopData} />
            </AccordionContent>
          </AccordionItem>

          {/* الأوراق التجارية */}
          <AccordionItem id="section-bills" value="bills" className="border rounded-xl shadow-soft bg-card px-4">
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

          {/* العملات الرقمية والمحافظ الاستثمارية — AAOIFI 35 */}
          <AccordionItem id="section-digital-assets" value="digital-assets" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-5 w-5 text-gold" /> زكاة العملات الرقمية والمحافظ الاستثمارية
                <Badge variant="outline" className="text-[10px] mr-2">AAOIFI 35</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <DigitalAssetsSection
                currencyName={currencyName}
                onTotalChange={setDigitalAssetsTotal}
              />
              <CryptoFatwasCard />
            </AccordionContent>
          </AccordionItem>

          {/* زكاة دخل وعروض التجارة والمستغلات والإيرادات (مدمجة) */}
          <AccordionItem id="section-income-trade-usufruct" value="income-trade-usufruct" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Package className="h-5 w-5 text-primary" /> زكاة الدخل وعروض التجارة والمستغلات والإيرادات
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* أولاً: عروض التجارة والديون */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Package className="h-4 w-4" /> أولاً: عروض التجارة والديون
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <NumField label="قيمة البضاعة بسعر السوق" value={inventory} onChange={setInventory} unit={currencyName} hint="تُقوَّم بسعر بيع الجملة يوم وجوب الزكاة" />
                  <NumField label="ديون مرجوّة لك على الغير" value={receivablesGood} onChange={setReceivablesGood} unit={currencyName} hint="على مَليء مُقرّ بها" />
                  <NumField
                    label="ديون متعذّرة (على معسر أو جاحد)"
                    value={receivablesBad} onChange={setReceivablesBad} unit={currencyName}
                    hint="لا تُزكَّى حتى تُقبض، ثم زكاة سنة واحدة فقط — لا تُحتسب الآن"
                  />
                </div>

                {/* هل أنت مساهم في شركة */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">هل أنت مساهم / شريك في شركة قائمة؟</Label>
                    <Switch checked={tradeIsShareholder} onCheckedChange={setTradeIsShareholder} />
                  </div>
                  {tradeIsShareholder && (
                    <>
                      <Alert className="border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          إن كانت الشركة تُخرج زكاتها كاملةً عن وعائها فلا تُكرّر الحساب — اتركها صفراً. وإلا أدخل الوعاء الزكوي للشركة (من تبويب «زكاة الشركات») ونسبة حصتك.
                        </AlertDescription>
                      </Alert>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">اسم الشركة</Label>
                          <Input value={tradeShareCompany} onChange={(e) => setTradeShareCompany(e.target.value)} placeholder="…" />
                        </div>
                        <NumField label="نسبة حصتك %" value={tradeSharePct} onChange={setTradeSharePct} unit="%" />
                        <NumField label="وعاء الشركة الزكوي" value={tradeShareCompanyBase} onChange={setTradeShareCompanyBase} unit={currencyName} />
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <p className="text-[11px] text-muted-foreground">
                          نصيبك المُحتسب: <b className="text-primary">{cur(num(tradeShareCompanyBase) * (num(tradeSharePct) / 100))}</b>
                        </p>
                        <Button
                          type="button" variant="outline" size="sm"
                          onClick={() => {
                            const el = document.getElementById("tab-company") as HTMLElement | null;
                            el?.click();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Landmark className="h-3.5 w-3.5 ml-1" />
                          فتح تبويب «زكاة الشركات» لحساب الوعاء
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* تصنيف النشاط التجاري + تاريخ التشغيل + ربط الشركة */}
              <TradeActivityClassification
                value={tradeActivity}
                onChange={(next) => {
                  setTradeActivity(next);
                  // مزامنة تلقائية: لو فعّل «شركة» ولديه اسم — يفعّل بند المساهم/الشركة
                  if (next.isCompany && !tradeIsShareholder) setTradeIsShareholder(true);
                  if (next.isCompany && next.companyName && !tradeShareCompany) {
                    setTradeShareCompany(next.companyName);
                  }
                }}
                onOpenCompanyTab={() => {
                  const el = document.getElementById("tab-company") as HTMLElement | null;
                  el?.click();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />

              {/* المتجر الإلكتروني والمنتجات والخدمات الرقمية */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Store className="h-4 w-4" /> المتجر الإلكتروني والمنتجات والخدمات الرقمية
                  </div>
                  <Switch checked={ecommerceEnabled} onCheckedChange={setEcommerceEnabled} />
                </div>
                {ecommerceEnabled && (
                  <>
                    <Alert className="border-primary/20 bg-primary/5">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs leading-relaxed text-right">
                        <b>المتجر الإلكتروني:</b> يُزكَّى بقيمة البضاعة المعروضة للبيع + المنتجات الرقمية + الخدمات الرقمية المُدّخَرة + المستحقات المرجوّة. لا زكاة في الأصول الرقمية المُعدّة للبيع إذا كانت ضمن «العملات الرقمية» (تُحسب هناك). والعبرة بالقيمة السوقية يوم الوجوب.
                      </AlertDescription>
                    </Alert>

                    <EcommerceItemsTable
                      items={ecommerceItems}
                      onItemsChange={setEcommerceItems}
                      currencyName={currencyName}
                    />

                    {ecommerceItems.length > 0 && (
                      <div className="text-[11px] text-muted-foreground text-right">
                        الحقول أدناه مُغذّاة تلقائيًا من سجل البنود. يمكنك تعديلها يدويًا
                        بعد تفريغ السجل.
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <NumField
                        label="قيمة بضاعة المتجر (منتجات مادية)"
                        value={ecommerceInventory} onChange={setEcommerceInventory} unit={currencyName}
                        hint="تُقوَّم بسعر البيع يوم وجوب الزكاة"
                      />
                      <NumField
                        label="المنتجات الرقمية (قوالب · كتب إلكترونية · دورات · برامج)"
                        value={ecommerceDigitalProducts} onChange={setEcommerceDigitalProducts} unit={currencyName}
                        hint="قيمة المخزون الرقمي المُدّخر للتجارة"
                      />
                      <NumField
                        label="الخدمات الرقمية المُدّخَرة (اشتراكات · استضافة · تراخيص)"
                        value={ecommerceServices} onChange={setEcommerceServices} unit={currencyName}
                        hint="صافي الإيراد المُدّخر من الخدمات الرقمية"
                      />
                      <NumField
                        label="مستحقات المتجر (ديون مرجوّة على العملاء)"
                        value={ecommerceReceivables} onChange={setEcommerceReceivables} unit={currencyName}
                        hint="طلبات لم تُسدَّد بعد على منصات البيع أو التحويل"
                      />
                    </div>
                    <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">إجمالي قاعدة المتجر الإلكتروني والرقمي</span>
                      <span className="text-lg font-bold text-primary">
                        {cur(num(ecommerceInventory) + num(ecommerceDigitalProducts) + num(ecommerceServices) + num(ecommerceReceivables))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* ثانياً: العقار */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Home className="h-4 w-4" /> ثانياً: زكاة العقار
                </div>
                <Alert className="border-primary/20 bg-background">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed text-right">
                    <b>نطاق العقار:</b> يشمل الأرض الفضاء، أو المبنى، أو الأرض والمبنى معاً.
                    <br />
                    <b>عقار السكن الخاص:</b> لا زكاة فيه إجماعًا.
                    <br />
                    <b>عقار التجارة</b> (مُعدّ للبيع — أرضاً كان أو مبنىً أو كليهما): يُزكَّى بكامل قيمته السوقية يوم وجوب الزكاة.
                    <br />
                    <b>عقار الإيجار/الاستغلال:</b> لا زكاة في رقبته، وإنما في صافي إيراده المُدّخر بعد النفقات إذا بلغ النصاب وحال عليه الحول.
                  </AlertDescription>
                </Alert>
                {/* عقار التجارة */}
                <div className="rounded-md border border-primary/15 bg-background p-3 space-y-3">
                  <div className="text-sm font-semibold">أ) عقار للتجارة (يُزكَّى بالقيمة السوقية)</div>
                  <div className="space-y-2">
                    <Label className="text-xs">تركيب العقار</Label>
                    <RadioGroup
                      value={reTradeComp}
                      onValueChange={(v) => setReTradeComp(v as RealEstateComp)}
                      className="flex flex-wrap gap-3"
                    >
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <RadioGroupItem value="land" id="re-trade-land" /> أرض فقط
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <RadioGroupItem value="building" id="re-trade-building" /> مبنى فقط
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <RadioGroupItem value="both" id="re-trade-both" /> أرض ومبنى معاً
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(reTradeComp === "land" || reTradeComp === "both") && (
                      <NumField label="قيمة الأرض السوقية" value={reTradeLand} onChange={setReTradeLand} unit={currencyName} />
                    )}
                    {(reTradeComp === "building" || reTradeComp === "both") && (
                      <NumField label="قيمة المبنى السوقية" value={reTradeBuilding} onChange={setReTradeBuilding} unit={currencyName} />
                    )}
                  </div>
                  {reTradeComp === "both" && (num(reTradeLand) > 0 || num(reTradeBuilding) > 0) && (
                    <div className="text-xs text-muted-foreground">
                      الإجمالي الخاضع للزكاة: <b>{fmt(num(reTradeLand) + num(reTradeBuilding))} {currencyName}</b>
                      {" "}(أرض {fmt(num(reTradeLand))} + مبنى {fmt(num(reTradeBuilding))})
                    </div>
                  )}
                </div>

                {/* عقار الإيجار/الاستغلال */}
                <div className="rounded-md border border-primary/15 bg-background p-3 space-y-3">
                  <div className="text-sm font-semibold">ب) عقار للإيجار/الاستغلال (يُزكَّى صافي الإيراد المُدّخر)</div>
                  <div className="space-y-2">
                    <Label className="text-xs">تركيب العقار</Label>
                    <RadioGroup
                      value={reRentComp}
                      onValueChange={(v) => setReRentComp(v as RealEstateComp)}
                      className="flex flex-wrap gap-3"
                    >
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <RadioGroupItem value="land" id="re-rent-land" /> أرض فقط
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <RadioGroupItem value="building" id="re-rent-building" /> مبنى فقط
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <RadioGroupItem value="both" id="re-rent-both" /> أرض ومبنى معاً
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(reRentComp === "land" || reRentComp === "both") && (
                      <NumField label="صافي إيراد الأرض المُدّخر" value={reRentLandIncome} onChange={setReRentLandIncome} unit={currencyName} hint="بعد المصاريف والنفقات الضرورية" />
                    )}
                    {(reRentComp === "building" || reRentComp === "both") && (
                      <NumField label="صافي إيراد المبنى المُدّخر" value={reRentBuildingIncome} onChange={setReRentBuildingIncome} unit={currencyName} hint="بعد المصاريف والنفقات الضرورية" />
                    )}
                  </div>
                  {reRentComp === "both" && (num(reRentLandIncome) > 0 || num(reRentBuildingIncome) > 0) && (
                    <div className="text-xs text-muted-foreground">
                      إجمالي الإيراد الخاضع للزكاة: <b>{fmt(num(reRentLandIncome) + num(reRentBuildingIncome))} {currencyName}</b>
                      {" "}(أرض {fmt(num(reRentLandIncome))} + مبنى {fmt(num(reRentBuildingIncome))})
                    </div>
                  )}
                </div>

              </div>

              {/* ثالثاً: المستغلات والدخل والإيرادات */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <HandHeart className="h-4 w-4" /> ثالثاً: المستغلات والدخل والإيرادات
                </div>
                <IncomeUsufructSection
                  currencyName={currencyName}
                  onTotalChange={setIncomeUsufructTotal}
                />
              </div>

              {/* رابعاً: حاسبة زكاة الراتب — أداة متقدمة مُدمجة ضمن قسم الدخل */}
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gold">
                  <Calculator className="h-4 w-4" /> رابعاً: حاسبة زكاة الراتب (أداة متقدمة)
                </div>
                <SalaryZakatCalculator currencyName={currencyName} nisabValue={calc.moneyNisab} />
              </div>
            </AccordionContent>
          </AccordionItem>



          {/* الزروع */}
          <AccordionItem id="section-crops" value="crops" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Wheat className="h-5 w-5 text-gold" /> زكاة الزروع والثمار
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <Label className="text-sm font-semibold">هل تملك أرضاً زراعية؟</Label>
                <Switch checked={ownsFarmland} onCheckedChange={setOwnsFarmland} />
              </div>
              {ownsFarmland && (
                <>
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
                </>
              )}

              {/* تبويب فرعي: العسل + الثروة السمكية + مزارع الدواجن (تُلحق بالزروع والثمار) */}
              <div className="pt-4 border-t border-dashed">
                <div className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
                  <Wheat className="h-4 w-4" /> أنشطة زراعية وحيوانية ملحقة (العسل / الثروة السمكية / الدواجن)
                </div>
                <RikazSection mode="agri-extras" hideCountry currency={currencyName} onTradeBaseChange={setAgriTradeBase} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* الأنعام */}
          <AccordionItem id="section-livestock" value="livestock" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Sprout className="h-5 w-5 text-primary" /> زكاة الأنعام (الإبل والبقر والغنم)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <Label className="text-sm font-semibold">هل تملك مواشي / أنعام سائمة؟</Label>
                <Switch checked={ownsLivestock} onCheckedChange={setOwnsLivestock} />
              </div>
              {ownsLivestock && (
                <>
                  <div className="flex items-center justify-between rounded-lg border bg-gold/5 border-gold/30 p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold">هل هذه الأنعام مُعدّة للتجارة (للبيع)؟</Label>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-primary transition-colors" aria-label="متى تُعدّ الأنعام للتجارة؟">
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-right leading-relaxed bg-card text-card-foreground border shadow-lg">
                              <div className="space-y-1.5 text-xs">
                                <p><b>متى تُعدّ الأنعام للتجارة؟</b></p>
                                <p>إذا اقتنيتها بنية <b>البيع والربح</b> (تربية تجارية، مزارع تسمين، تجارة مواشي) — لا للنسل واللبن والاستهلاك.</p>
                                <p><b>كيف تُحسب؟</b> تُقوَّم القطيع كاملاً بسعر السوق يوم وجوب الزكاة، ثم 2.5% × القيمة السوقية الإجمالية، وتُضمّ النتيجة لقاعدة عروض التجارة في الإجمالي.</p>
                                <p className="text-muted-foreground">المرجع: AAOIFI رقم 35 / قرار المجمع الفقهي رقم 28.</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">إن نعم، تُعامل معاملة <b>عروض التجارة</b> (2.5% من القيمة السوقية) وتُضمّ تلقائياً لقاعدة عروض التجارة — ولا تُحسب عيناً منعاً للازدواج.</p>
                    </div>
                    <Switch checked={livestockForTrade} onCheckedChange={setLivestockForTrade} />
                  </div>

                  {livestockForTrade ? (
                    <>
                      <Alert className="border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          أدخل القيمة السوقية الإجمالية للقطيع (للبيع) — تُحسب 2.5% وتُضمّ لقاعدة عروض التجارة في الإجمالي.
                        </AlertDescription>
                      </Alert>
                      <NumField
                        label="القيمة السوقية الإجمالية للأنعام (للتجارة)"
                        value={livestockTradeValue} onChange={setLivestockTradeValue} unit={currencyName}
                        hint="بسعر السوق يوم وجوب الزكاة"
                      />
                    </>
                  ) : (
                    <>
                      <Alert className="border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          الأنعام السائمة (للنسل واللبن لا للتجارة) تُزكَّى عيناً (لا قيمتها)، ويُشترط بلوغ النصاب وحولان الحول وسومُها (رعيها) أكثر السنة.
                        </AlertDescription>
                      </Alert>
                      <div className="grid md:grid-cols-3 gap-4">
                        <NumField label="عدد الإبل" value={camels} onChange={setCamels} hint="النصاب: 5" />
                        <NumField label="عدد البقر/الجاموس" value={cows} onChange={setCows} hint="النصاب: 30" />
                        <NumField label="عدد الغنم/المعز" value={sheep} onChange={setSheep} hint="النصاب: 40" />
                      </div>
                      <div className="space-y-2 text-sm">
                        {calc.camelsN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>الإبل ({calc.camelsN}):</b> {camelZakat(calc.camelsN)}</div>}
                        {calc.cowsN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>البقر ({calc.cowsN}):</b> {cowZakat(calc.cowsN)}</div>}
                        {calc.sheepN > 0 && <div className="rounded-md bg-muted/50 p-2"><b>الغنم ({calc.sheepN}):</b> {sheepZakat(calc.sheepN)}</div>}
                      </div>
                    </>
                  )}
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* الركاز والمعادن — تبويب مستقل */}
          <AccordionItem id="section-rikaz-metals" value="rikaz-metals" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Sprout className="h-5 w-5 text-gold" /> زكاة الركاز والمعادن
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <RikazSection mode="rikaz-metals" />
            </AccordionContent>
          </AccordionItem>


          {/* الديون */}
          <AccordionItem id="section-debts" value="debts" className="border rounded-xl shadow-soft bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-base font-semibold">
                <MinusCircle className="h-5 w-5 text-destructive" /> الديون والالتزامات (تُخصم)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-4">
              {/* ① الديون الحالة */}
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <Badge className="bg-destructive text-destructive-foreground">①</Badge>
                  الديون الحالة (واجبة السداد الآن) — تُخصم باتفاق الفقهاء
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <NumField label="قروض شخصية" value={debtPersonalLoan} onChange={setDebtPersonalLoan} unit={currencyName} />
                  <NumField label="ديون مصرفية" value={debtBankLoan} onChange={setDebtBankLoan} unit={currencyName} hint="أصل الدين دون الفوائد الربوية" />
                  <NumField label="تمويل استهلاكي" value={debtConsumerFinance} onChange={setDebtConsumerFinance} unit={currencyName} hint="مرابحة / تورق / تقسيط حلال — الأصل المستحق" />
                  <NumField label="أقساط سيارات أو سلع حالَّة" value={debtCarInstall} onChange={setDebtCarInstall} unit={currencyName} />
                  <NumField label="ديون تجارية مستحقة" value={debtTradePayable} onChange={setDebtTradePayable} unit={currencyName} />
                  <NumField label="أثمان مشتريات لم تُسدد" value={debtPurchases} onChange={setDebtPurchases} unit={currencyName} />
                </div>
              </div>

              {/* ② الديون المؤجلة */}
              <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white">②</Badge>
                  الديون المؤجلة (طويلة الأجل) — على خلاف بين العلماء
                </div>
                <Alert className="border-amber-500/30 bg-background">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    <b>الجمهور:</b> يُخصم كل الدين حالًّا ومؤجلًا. <b>الأحوط:</b> يُخصم قسط السنة فقط. <b>الشافعية (قول قوي):</b> لا يُخصم الدين المؤجل أصلًا. والعمل المعاصر: إن لم يكن لديك مال زائد عن الحاجة فيجوز الخصم، والأحوط خصم قسط السنة فقط.
                  </AlertDescription>
                </Alert>
                <div>
                  <Label className="mb-2 block text-xs">السياسة المختارة لخصم المؤجل</Label>
                  <RadioGroup value={debtDeferredPolicy} onValueChange={(v) => setDebtDeferredPolicy(v as "yearly" | "full" | "none")} className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 border rounded-md px-3 py-1.5"><RadioGroupItem value="yearly" id="dp-y" /><Label htmlFor="dp-y" className="text-xs cursor-pointer">قسط السنة فقط (الأحوط)</Label></div>
                    <div className="flex items-center gap-2 border rounded-md px-3 py-1.5"><RadioGroupItem value="full" id="dp-f" /><Label htmlFor="dp-f" className="text-xs cursor-pointer">خصم كامل الدين (الجمهور)</Label></div>
                    <div className="flex items-center gap-2 border rounded-md px-3 py-1.5"><RadioGroupItem value="none" id="dp-n" /><Label htmlFor="dp-n" className="text-xs cursor-pointer">لا يُخصم (الشافعية)</Label></div>
                  </RadioGroup>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <NumField label="أقساط تمويل عقاري (إجمالي متبقي)" value={debtMortgage} onChange={setDebtMortgage} unit={currencyName} />
                  <NumField label="مهر الزوجة المؤجل" value={debtMahr} onChange={setDebtMahr} unit={currencyName} />
                  <NumField label="قسط السنة فقط من الديون المؤجلة" value={debtDeferredYearly} onChange={setDebtDeferredYearly} unit={currencyName} hint="يُستخدم مع سياسة «قسط السنة»" />
                </div>
              </div>

              {/* ③ النفقة الواجبة */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Badge className="bg-primary">③</Badge>
                  النفقة الواجبة إذا صارت دينًا — تُخصم
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  نفقة الزوجة أو الأولاد بحكم قضاء أو اتفاق، ونفقة الأقارب الواجبة شرعاً متى ثبتت في الذمة كَدَين.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <NumField label="نفقة واجبة مستحقة (زوجة/أولاد/أقارب)" value={debtAlimony} onChange={setDebtAlimony} unit={currencyName} hint="بحكم قضاء أو اتفاق" />
                  <NumField label="نفقات ضرورية مستحقة" value={expenses} onChange={setExpenses} unit={currencyName} hint="فواتير وإيجارات مستحقة" />
                </div>
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
            {(() => {
              const prepaid = num(prepaidZakat);
              const netDue = Math.max(0, calc.total - prepaid) + fitrContribution;
              return (
                <>
                  <div className="text-4xl font-black tracking-tight">
                    {fmt(netDue)}
                    <span className="text-lg font-medium opacity-80 mr-2">{currencyName}</span>
                  </div>
                  <p className="text-xs opacity-80 mt-2">
                    نسبة: {(effectiveRate * 100).toFixed(3)}% — تقويم {calendarBasis === "hijri" ? "هجري" : "ميلادي"}
                  </p>
                  {prepaid > 0 && (
                    <p className="text-xs opacity-80 mt-1">
                      الإجمالي قبل خصم المعجَّل: <b>{fmt(calc.total)}</b> — مدفوع مقدماً: <b>{fmt(prepaid)}</b>
                    </p>
                  )}
                  {fitrContribution > 0 && (
                    <p className="text-xs opacity-80 mt-1">
                      🌾 يشمل زكاة الفطر تلقائياً: <b>{fmt(fitrContribution)} {currencyName}</b>
                    </p>
                  )}
                  {name && <p className="text-xs opacity-80 mt-1">{name}{profession && ` — ${profession}`}</p>}
                  {hawl && (
                    <p className="text-xs opacity-80 mt-1">
                      {hawl.hawlComplete ? "✓ اكتمل الحول" : `⏳ الحول لم يكتمل (${hawl.daysRemaining} يوم متبقي)`}
                    </p>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* خطة توزيع الزكاة على المصارف الثمانية */}
        <EightChannelsDistribution
          netDue={Math.max(0, calc.total - num(prepaidZakat)) + fitrContribution}
          currencyName={currencyName}
        />

        {/* تعجيل الزكاة */}
        <Card className="shadow-soft print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> تعجيل الزكاة (مدفوعة مقدماً)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">
                يجوز تعجيل الزكاة لسنة أو سنتين عند الجمهور إذا بلغ المال النصاب،
                لحديث: «أنّ النبي ﷺ تعجَّل من العباس صدقة سنتين» (رواه أبو داود والترمذي).
                المبلغ المُعجَّل يُخصم من الواجب هذا العام.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">المبلغ المعجَّل المدفوع</Label>
                <Input type="number" min="0" step="0.01" value={prepaidZakat}
                  onChange={(e) => setPrepaidZakat(e.target.value)}
                  dir="ltr" style={{ textAlign: "right" }} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">عدد السنوات المعجَّلة</Label>
                <Input type="number" min="1" max="2" step="1" value={prepaidYears}
                  onChange={(e) => setPrepaidYears(e.target.value)}
                  dir="ltr" style={{ textAlign: "right" }} />
              </div>
            </div>
            {num(prepaidZakat) > 0 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-xs">
                <div>الواجب الإجمالي: <b>{cur(calc.total)}</b></div>
                <div>المعجَّل: <b>{cur(num(prepaidZakat))}</b> عن <b>{prepaidYears}</b> سنة</div>
                <div className="text-primary font-bold">
                  المتبقي للسداد الآن: {cur(Math.max(0, calc.total - num(prepaidZakat)))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <SaveToHistoryCard
          payload={{
            record_type: "individual",
            hijri_year: (() => { const d = new Date(); return formatHijri(gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate())); })(),
            currency: currencyName,
            total_assets: calc.monetaryGross + calc.totalGoldValue + calc.silverValue + calc.cropsValue,
            total_liabilities: calc.debts,
            zakat_base: calc.monetaryBase,
            zakat_due: calc.total,
            prepaid_zakat: num(prepaidZakat),
            net_due: Math.max(0, calc.total - num(prepaidZakat)),
          }}
        />

        {/* === زكاة الفطر التلقائية === */}
        {(() => {
          const today = new Date();
          const h = gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
          // مفعّل: أواخر شعبان (اليوم 25+) أو طوال رمضان
          const isLateShaaban = h.hm === 8 && h.hd >= 25;
          const isRamadan = h.hm === 9;
          const fitrActive = isLateShaaban || isRamadan;
          if (!fitrActive) return null;
          const persons = Math.max(0, Math.floor(num(fitrFamilySize)));
          const pricePerKg = WHEAT_PRICE_PER_KG[countryCode] ?? WHEAT_PRICE_PER_KG.EG;
          const fitrTotal = persons * FITR_SAA_KG * pricePerKg;
          return (
            <Card className="border-gold/40 bg-gold/5 shadow-soft print:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wheat className="h-4 w-4 text-gold" /> زكاة الفطر (إضافة تلقائية)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="border-gold/30 bg-gold/10">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    تم تفعيلها تلقائيًا لأن التاريخ الهجري الحالي هو
                    <b> {isRamadan ? "شهر رمضان" : "أواخر شعبان"}</b> ({h.hd}/{h.hm}/{h.hy}هـ).
                    صاع نبوي ≈ {FITR_SAA_KG} كجم من القمح × سعر الكيلو في {country.name}.
                  </AlertDescription>
                </Alert>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">إدراج في الإجمالي</Label>
                  <Switch checked={fitrEnabled} onCheckedChange={setFitrEnabled} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">عدد أفراد الأسرة</Label>
                  <Input
                    type="number" min="1" step="1" value={fitrFamilySize}
                    onChange={(e) => setFitrFamilySize(e.target.value)}
                    dir="ltr" style={{ textAlign: "right" }}
                  />
                </div>
                <div className="rounded-md bg-background border border-gold/30 p-2 text-xs space-y-0.5">
                  <div>سعر الكيلو المرجعي: <b>{cur(pricePerKg)}</b></div>
                  <div>إجمالي الوزن: <b>{fmt(persons * FITR_SAA_KG)} كجم</b></div>
                  <div className="text-gold-foreground font-bold pt-1 border-t border-gold/20">
                    قيمة زكاة الفطر النقدية: {cur(fitrTotal)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}



        <Card className="shadow-soft border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
              <span>تفصيل النتيجة — مدمج من جميع التبويبات</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">AAOIFI 35</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px] print:hidden"
                  onClick={() => {
                    const f = (n: number) => cur(n);
                    const lines: string[] = [];
                    lines.push("تفصيل النتيجة — حساب الزكاة");
                    lines.push(`المُزكِّي: ${name || "—"}  |  العملة: ${currencyName}`);
                    lines.push(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`);
                    lines.push("");
                    lines.push("① مكوّنات الوعاء (قبل الخصم):");
                    const items = [
                      ["الذهب (قيمة)", calc.totalGoldValue, "2.5%"],
                      ["الفضة (قيمة)", calc.silverValue, "2.5%"],
                      ["النقد والبنوك والمحافظ", calc.cashTotal, "2.5%"],
                      ["الأوراق المالية ووثائق التأمين", calc.securitiesTotal, "2.5%"],
                      ["العملات الرقمية والمحافظ الاستثمارية", digitalAssetsTotal, "2.5%"],
                      ["الأوراق التجارية (الكمبيالات)", calc.billsTotal, "2.5%"],
                      ["عروض التجارة", calc.tradeTotal, "2.5%"],
                      ["العقار (تجارة + إيجار مُدّخر)", calc.realEstateZakatable, "2.5%"],
                      ["المستغلات والدخل والإيرادات", incomeUsufructTotal, "2.5%"],
                      ["الزروع والثمار", calc.cropsValue, calc.cropsRate === 0.1 ? "10%" : "5%"],
                    ] as Array<[string, number, string]>;
                    items.filter((x) => (x[1] as number) > 0).forEach((it) => {
                      lines.push(`  • ${it[0]} (${it[2]}): ${f(it[1] as number)}`);
                    });
                    const grossMonetary = calc.monetaryGross + calc.totalGoldValue + calc.silverValue;
                    const grossAll = grossMonetary + calc.cropsValue;
                    lines.push(`  إجمالي قبل الخصم: ${f(grossAll)}`);
                    lines.push("");
                    lines.push(`② الخصومات والديون: −${f(calc.debts)}`);
                    lines.push("");
                    lines.push("③ صافي الأوعية بعد الخصم:");
                    lines.push(`  الوعاء النقدي/المالي: ${f(calc.monetaryBase)}`);
                    lines.push(`  وعاء الذهب والفضة: ${f(calc.totalGoldValue + calc.silverValue)}`);
                    if (calc.cropsValue > 0) lines.push(`  وعاء الزروع والثمار: ${f(calc.cropsValue)}`);
                    lines.push("");
                    lines.push("④ الزكاة المستحقة:");
                    lines.push(`  زكاة الذهب: ${f(calc.goldZakat)}`);
                    lines.push(`  زكاة الفضة: ${f(calc.silverZakat)}`);
                    lines.push(`  زكاة النقد والاستثمارات (صافي): ${f(calc.monetaryZakat)}`);
                    lines.push(`  زكاة الزروع والثمار: ${f(calc.cropsZakat)}`);
                    lines.push(`  الإجمالي: ${f(calc.goldZakat + calc.silverZakat + calc.monetaryZakat + calc.cropsZakat)}`);
                    navigator.clipboard.writeText(lines.join("\n")).then(
                      () => toast.success("تم نسخ تفصيل النتيجة"),
                      () => toast.error("تعذّر النسخ — انسخ يدوياً"),
                    );
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> نسخ
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* ① مكوّنات الوعاء الزكوي (إجمالي قبل الخصم) — مع روابط تنقل */}
            {(() => {
              const items = [
                { k: "الذهب (قيمة)", v: calc.totalGoldValue, rate: "2.5%", section: "gold" },
                { k: "الفضة (قيمة)", v: calc.silverValue, rate: "2.5%", section: "silver" },
                { k: "النقد والبنوك والمحافظ", v: calc.cashTotal, rate: "2.5%", section: "cash" },
                { k: "الأوراق المالية ووثائق التأمين", v: calc.securitiesTotal, rate: "2.5%", section: "securities" },
                { k: "العملات الرقمية والمحافظ الاستثمارية", v: digitalAssetsTotal, rate: "2.5%", section: "digital-assets" },
                { k: "الأوراق التجارية (الكمبيالات)", v: calc.billsTotal, rate: "2.5%", section: "bills" },
                { k: "عروض التجارة", v: calc.tradeTotal, rate: "2.5%", section: "income-trade-usufruct" },
                { k: "العقار (تجارة + إيجار مُدّخر)", v: calc.realEstateZakatable, rate: "2.5%", section: "income-trade-usufruct" },
                { k: "المستغلات والدخل والإيرادات", v: incomeUsufructTotal, rate: "2.5%", section: "income-trade-usufruct" },
                { k: "الزروع والثمار", v: calc.cropsValue, rate: calc.cropsRate === 0.1 ? "10%" : "5%", section: "crops" },
              ].filter((x) => x.v > 0);
              const grossMonetary = calc.monetaryGross + calc.totalGoldValue + calc.silverValue;
              const grossAll = grossMonetary + calc.cropsValue;
              return (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                  <div className="text-xs font-bold text-primary mb-2">① مكوّنات الوعاء الزكوي (قبل الخصم)</div>
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">لا توجد مكوّنات للوعاء حاليّاً</div>
                  )}
                  {items.map((it) => (
                    <div key={it.k} className="text-xs flex justify-between items-center gap-2">
                      <button
                        type="button"
                        onClick={() => jumpToSection(it.section)}
                        className="text-start hover:text-primary hover:underline underline-offset-2 cursor-pointer"
                        title="فتح التبويب المصدر"
                      >
                        • {it.k} <span className="text-[10px] text-muted-foreground">({it.rate})</span>
                      </button>
                      <b className="tabular-nums">{cur(it.v)}</b>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="text-xs flex justify-between">
                    <span>إجمالي الوعاء النقدي والمالي قبل الخصم</span>
                    <b className="text-primary tabular-nums">{cur(grossMonetary)}</b>
                  </div>
                  {calc.cropsValue > 0 && (
                    <div className="text-xs flex justify-between">
                      <span>إجمالي وعاء الزروع والثمار (مستقل)</span>
                      <b className="tabular-nums">{cur(calc.cropsValue)}</b>
                    </div>
                  )}
                  <div className="text-sm flex justify-between pt-1 border-t border-primary/20">
                    <span className="font-bold">الإجمالي الكلي للأوعية قبل الخصم</span>
                    <b className="text-primary text-base tabular-nums">{cur(grossAll)}</b>
                  </div>
                </div>
              );
            })()}

            {/* ② تفصيل قاعدة عروض التجارة — مع روابط */}
            {calc.tradeTotal > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <div className="text-xs font-bold text-primary flex items-center justify-between">
                  <span>تفصيل قاعدة عروض التجارة (2.5%)</span>
                  <span className="text-foreground">قاعدة: <b className="tabular-nums">{cur(calc.tradeTotal)}</b></span>
                </div>
                {num(inventory) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• البضاعة بسعر السوق</button>
                    <b className="tabular-nums">{cur(num(inventory))}</b>
                  </div>
                )}
                {num(receivablesGood) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• ديون مرجوّة</button>
                    <b className="tabular-nums">{cur(num(receivablesGood))}</b>
                  </div>
                )}
                {tradeIsShareholder && num(tradeShareCompanyBase) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• نصيبك من وعاء الشركة</button>
                    <b className="tabular-nums">{cur(num(tradeShareCompanyBase) * (num(tradeSharePct) / 100))}</b>
                  </div>
                )}
                {agriTradeBase > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("crops")} className="hover:text-primary hover:underline underline-offset-2 text-start">• العسل/الأسماك/الدواجن (ملحقة)</button>
                    <b className="tabular-nums">{cur(agriTradeBase)}</b>
                  </div>
                )}
                {livestockForTrade && num(livestockTradeValue) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("livestock")} className="hover:text-primary hover:underline underline-offset-2 text-start">• الأنعام للتجارة</button>
                    <b className="tabular-nums">{cur(num(livestockTradeValue))}</b>
                  </div>
                )}
                {ecommerceEnabled && (num(ecommerceInventory) + num(ecommerceDigitalProducts) + num(ecommerceServices) + num(ecommerceReceivables)) > 0 && (
                  <>
                    {num(ecommerceInventory) > 0 && (
                      <div className="text-xs flex justify-between">
                        <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• بضاعة المتجر الإلكتروني</button>
                        <b className="tabular-nums">{cur(num(ecommerceInventory))}</b>
                      </div>
                    )}
                    {num(ecommerceDigitalProducts) > 0 && (
                      <div className="text-xs flex justify-between">
                        <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• منتجات رقمية</button>
                        <b className="tabular-nums">{cur(num(ecommerceDigitalProducts))}</b>
                      </div>
                    )}
                    {num(ecommerceServices) > 0 && (
                      <div className="text-xs flex justify-between">
                        <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• خدمات رقمية مُدّخَرة</button>
                        <b className="tabular-nums">{cur(num(ecommerceServices))}</b>
                      </div>
                    )}
                    {num(ecommerceReceivables) > 0 && (
                      <div className="text-xs flex justify-between">
                        <button type="button" onClick={() => jumpToSection("income-trade-usufruct")} className="hover:text-primary hover:underline underline-offset-2 text-start">• مستحقات المتجر</button>
                        <b className="tabular-nums">{cur(num(ecommerceReceivables))}</b>
                      </div>
                    )}
                  </>
                )}
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-primary/10">
                  مُنعَ الازدواج تلقائياً مع زكاة الزروع وزكاة الأنعام عيناً.
                </div>
              </div>
            )}

            {/* ③ الخصومات والديون — مع روابط لتبويب الديون */}
            {calc.debts > 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <div className="text-xs font-bold text-destructive flex items-center justify-between">
                  <button type="button" onClick={() => jumpToSection("debts")} className="text-start hover:underline">
                    <MinusCircle className="inline h-3.5 w-3.5 ml-1" />② الخصومات والديون والالتزامات
                  </button>
                  <span>الإجمالي: <b className="tabular-nums">−{cur(calc.debts)}</b></span>
                </div>
                {(num(debtPersonalLoan) + num(debtBankLoan) + num(debtConsumerFinance) + num(debtCarInstall) + num(debtTradePayable) + num(debtPurchases)) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("debts")} className="hover:text-destructive hover:underline underline-offset-2 text-start">• ديون حالّة (قروض/أقساط/مستحقات تجارية)</button>
                    <b className="tabular-nums">−{cur(num(debtPersonalLoan) + num(debtBankLoan) + num(debtConsumerFinance) + num(debtCarInstall) + num(debtTradePayable) + num(debtPurchases))}</b>
                  </div>
                )}
                {(debtDeferredPolicy !== "none" && (num(debtDeferredYearly) + (debtDeferredPolicy === "full" ? (num(debtMortgage) + num(debtMahr)) : 0)) > 0) && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("debts")} className="hover:text-destructive hover:underline underline-offset-2 text-start">• ديون مؤجلة (حسب السياسة: {debtDeferredPolicy === "full" ? "كامل" : "قسط السنة"})</button>
                    <b className="tabular-nums">−{cur(debtDeferredPolicy === "yearly" ? num(debtDeferredYearly) : (num(debtMortgage) + num(debtMahr) || num(debtDeferredYearly)))}</b>
                  </div>
                )}
                {num(debtAlimony) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("debts")} className="hover:text-destructive hover:underline underline-offset-2 text-start">• نفقة واجبة (ديناً)</button>
                    <b className="tabular-nums">−{cur(num(debtAlimony))}</b>
                  </div>
                )}
                {num(expenses) > 0 && (
                  <div className="text-xs flex justify-between">
                    <button type="button" onClick={() => jumpToSection("debts")} className="hover:text-destructive hover:underline underline-offset-2 text-start">• نفقات ضرورية مستحقة</button>
                    <b className="tabular-nums">−{cur(num(expenses))}</b>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-destructive/20">
                  تُخصم الديون من الوعاء النقدي/المالي فقط — لا تُخصم من زكاة الزروع ولا الأنعام عيناً.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs text-muted-foreground text-center">
                ② لا توجد خصومات أو ديون مُسجَّلة
              </div>
            )}

            {/* تحقق تلقائي: مطابقة الوعاء + خصم الديون مرة واحدة */}
            {(() => {
              const sumMonetary =
                calc.cashTotal + calc.securitiesTotal + digitalAssetsTotal +
                calc.billsTotal + calc.tradeTotal + calc.realEstateZakatable +
                incomeUsufructTotal;
              const diff = Math.abs(sumMonetary - calc.monetaryGross);
              const matches = diff < 0.5;
              const netExpected = Math.max(0, sumMonetary - calc.debts);
              const netDiff = Math.abs(netExpected - calc.monetaryBase);
              const debtOnce = netDiff < 0.5;
              const ok = matches && debtOnce;
              return (
                <div className={`rounded-lg border p-3 text-xs ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                    التحقق التلقائي للوعاء والخصومات
                  </div>
                  <div className="flex justify-between"><span>مجموع التبويبات النقدية/المالية</span><b className="tabular-nums">{cur(sumMonetary)}</b></div>
                  <div className="flex justify-between"><span>الإجمالي المُحتسَب (monetaryGross)</span><b className="tabular-nums">{cur(calc.monetaryGross)}</b></div>
                  <div className="flex justify-between"><span>الفرق</span><b className={`tabular-nums ${matches ? "text-emerald-600" : "text-amber-700"}`}>{matches ? "مُطابق ✓" : cur(diff)}</b></div>
                  <Separator className="my-1.5" />
                  <div className="flex justify-between"><span>الصافي المتوقّع بعد خصم الديون مرة واحدة</span><b className="tabular-nums">{cur(netExpected)}</b></div>
                  <div className="flex justify-between"><span>الصافي الفعلي (monetaryBase)</span><b className="tabular-nums">{cur(calc.monetaryBase)}</b></div>
                  <div className="flex justify-between"><span>الفرق</span><b className={`tabular-nums ${debtOnce ? "text-emerald-600" : "text-amber-700"}`}>{debtOnce ? "خُصمت مرة واحدة ✓" : cur(netDiff)}</b></div>
                </div>
              );
            })()}

            {/* ④ صافي الوعاء بعد الخصم */}
            <div className="rounded-lg border border-primary/30 bg-card p-3 space-y-1">
              <div className="text-xs font-bold text-primary mb-1">③ صافي الأوعية بعد الخصم</div>
              <div className="text-xs flex justify-between">
                <span>الوعاء النقدي/المالي (بعد خصم {cur(calc.debts)})</span>
                <b className="tabular-nums">{cur(calc.monetaryBase)}</b>
              </div>
              <div className="text-xs flex justify-between">
                <span>وعاء الذهب والفضة</span>
                <b className="tabular-nums">{cur(calc.totalGoldValue + calc.silverValue)}</b>
              </div>
              {calc.cropsValue > 0 && (
                <div className="text-xs flex justify-between">
                  <span>وعاء الزروع والثمار</span>
                  <b className="tabular-nums">{cur(calc.cropsValue)}</b>
                </div>
              )}
              <Separator className="my-1" />
              <div className="text-xs text-muted-foreground">
                نصاب المال (الأنفع للفقراء): <b>{cur(calc.moneyNisab)}</b>
              </div>
            </div>

            {/* ⑤ الزكاة المستحقة على كل وعاء */}
            {(() => {
              const incomeTradeGross = calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal;
              // معامل توزيع خصم الديون على الأوعية النقدية/المالية بنسبة كل وعاء من الإجمالي
              const distRate = calc.monetaryEligible && calc.monetaryGross > 0
                ? (calc.monetaryZakat / calc.monetaryGross)
                : 0;
              const z = (g: number) => g * distRate;
              return (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                  <div className="text-xs font-bold text-primary mb-1">④ الزكاة المستحقة على كل وعاء</div>
                  <SectionResult format={cur} label="زكاة الذهب" value={calc.goldZakat} eligible={calc.goldEligible} />
                  <SectionResult format={cur} label="زكاة الفضة" value={calc.silverZakat} eligible={calc.silverEligible} />
                  <SectionResult format={cur} label="زكاة الأوراق النقدية والحسابات والبطاقات والمحافظ البنكية" value={z(calc.cashTotal)} eligible={calc.monetaryEligible} />
                  <SectionResult format={cur} label="زكاة الأوراق المالية (الأسهم والسندات والصكوك) ووثائق التأمين" value={z(calc.securitiesTotal)} eligible={calc.monetaryEligible} />
                  <SectionResult format={cur} label="زكاة الأوراق التجارية" value={z(calc.billsTotal)} eligible={calc.monetaryEligible} />
                  <SectionResult format={cur} label="زكاة الأصول الرقمية والمحافظ الاستثمارية" value={z(digitalAssetsTotal)} eligible={calc.monetaryEligible} />
                  <SectionResult format={cur} label="زكاة الدخل وعروض التجارة والمستغلات والإيرادات" value={z(incomeTradeGross)} eligible={calc.monetaryEligible} />
                  <SectionResult format={cur} label="زكاة الزروع والثمار" value={calc.cropsZakat} eligible={calc.cropsEligible} />
                  {ownsLivestock && !livestockForTrade && (calc.camelsN > 0 || calc.cowsN > 0 || calc.sheepN > 0) && (
                    <div className="text-xs text-muted-foreground pt-1 border-t border-primary/10">
                      <b className="text-primary">زكاة الأنعام:</b> تُؤدَّى عيناً (تفاصيلها أدناه)
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-1 border-t border-primary/10">
                    <b className="text-primary">زكاة الركاز والمعادن:</b> تُحسب داخل قسم «زكاة الركاز والمعادن» (الركاز 20% — المعادن 2.5%)
                  </div>
                  {calc.debts > 0 && (
                    <div className="text-[10px] text-muted-foreground pt-1">
                      * تم توزيع خصم الديون ({cur(calc.debts)}) على الأوعية النقدية/المالية بنسبة كل وعاء.
                    </div>
                  )}
                </div>
              );
            })()}

            {ownsLivestock && !livestockForTrade && (calc.camelsN > 0 || calc.cowsN > 0 || calc.sheepN > 0) && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <div className="text-xs font-bold text-primary">زكاة الأنعام (تُؤدّى عيناً لا قيمةً):</div>
                {calc.camelsN > 0 && <div className="text-xs">• الإبل ({calc.camelsN}): <b>{camelZakat(calc.camelsN)}</b></div>}
                {calc.cowsN > 0 && <div className="text-xs">• البقر ({calc.cowsN}): <b>{cowZakat(calc.cowsN)}</b></div>}
                {calc.sheepN > 0 && <div className="text-xs">• الغنم ({calc.sheepN}): <b>{sheepZakat(calc.sheepN)}</b></div>}
              </div>
            )}

            {fitrContribution > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <SectionResult format={cur} label="🌾 زكاة الفطر (تلقائي — رمضان)" value={fitrContribution} />
              </div>
            )}

            {calc.hawlBlocks && (
              <Alert className="border-destructive/40 bg-destructive/5 mt-2">
                <AlertDescription className="text-xs">
                  لم يكتمل الحول — تم إيقاف حساب زكاة الذهب والنقد. ستظهر تلقائيًا عند اكتمال 354 يومًا هجريًا.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>


        <div className="print:hidden">
          <CurrencyConverterCard
            reportCurrency={currencyName}
            value={fxRates}
            onChange={setFxRates}
          />
        </div>


        <Card className="border-primary/20 shadow-soft print:hidden">
          <CardContent className="pt-6 space-y-2">
            <Button className="w-full" size="lg" onClick={() => downloadZakatPdf({
              name, profession, countryCode, currencyName,
              calendarBasis, effectiveRate,
              rows: [
                { label: "زكاة الذهب", gross: calc.totalGoldValue, nisab: calc.goldNisabValue, eligible: calc.goldEligible, zakat: calc.goldZakat },
                { label: "زكاة الفضة", gross: calc.silverValue, nisab: calc.silverNisabValue, eligible: calc.silverEligible, zakat: calc.silverZakat },
                { label: "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية", gross: calc.cashTotal, eligible: true, zakat: 0 },
                { label: "زكاة الأوراق المالية ووثائق التأمين", gross: calc.securitiesTotal, eligible: true, zakat: 0 },
                { label: "زكاة الأوراق التجارية (الكمبيالات وأوراق القبض)", gross: calc.billsTotal, eligible: true, zakat: 0 },
                { label: "زكاة الدخل وعروض التجارة والمستغلات", gross: calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal, eligible: true, zakat: 0 },
                { label: "زكاة الزروع والثمار", gross: calc.cropsValue, eligible: calc.cropsEligible, zakat: calc.cropsZakat },
              ],
              livestock: { camels: calc.camelsN, cows: calc.cowsN, sheep: calc.sheepN, show: ownsLivestock, mode: livestockForTrade ? "trade" : "grazing", tradeValue: livestockForTrade ? num(livestockTradeValue) : 0 },
          esop: esopData,
              monetaryGross: calc.monetaryGross, debts: calc.debts, monetaryBase: calc.monetaryBase,
              moneyNisab: calc.moneyNisab, totalZakat: calc.total,
              hawlComplete: hawl ? hawl.hawlComplete : null, hawlDate: nisabStartDate,
              goldPricePerGram: num(goldPrice), silverPricePerGram: num(silverPrice),
              accountantName, accountantLicense, accountantPreamble,
              accountantOpinion, opinionType, previousYearZakat,
              auditEntries: includeAuditReport ? auditEntries : undefined,
            }, `zakat-${name || "report"}-${new Date().toISOString().slice(0,10)}.pdf`)}>
              <FileText className="h-4 w-4 ml-2" />
              تحميل التقرير PDF
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => downloadReportExcel({
              name, profession, countryCode, currencyName,
              calendarBasis, effectiveRate,
              rows: [
                { label: "زكاة الذهب", gross: calc.totalGoldValue, nisab: calc.goldNisabValue, eligible: calc.goldEligible, zakat: calc.goldZakat },
                { label: "زكاة الفضة", gross: calc.silverValue, nisab: calc.silverNisabValue, eligible: calc.silverEligible, zakat: calc.silverZakat },
                { label: "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية", gross: calc.cashTotal, eligible: true, zakat: 0 },
                { label: "زكاة الأوراق المالية ووثائق التأمين", gross: calc.securitiesTotal, eligible: true, zakat: 0 },
                { label: "زكاة الأوراق التجارية (الكمبيالات وأوراق القبض)", gross: calc.billsTotal, eligible: true, zakat: 0 },
                { label: "زكاة الدخل وعروض التجارة والمستغلات", gross: calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal, eligible: true, zakat: 0 },
                { label: "زكاة الزروع والثمار", gross: calc.cropsValue, eligible: calc.cropsEligible, zakat: calc.cropsZakat },
              ],
              livestock: { camels: calc.camelsN, cows: calc.cowsN, sheep: calc.sheepN, show: ownsLivestock, mode: livestockForTrade ? "trade" : "grazing", tradeValue: livestockForTrade ? num(livestockTradeValue) : 0 },
          esop: esopData,
              monetaryGross: calc.monetaryGross, debts: calc.debts, monetaryBase: calc.monetaryBase,
              moneyNisab: calc.moneyNisab, totalZakat: calc.total,
              hawlComplete: hawl ? hawl.hawlComplete : null, hawlDate: nisabStartDate,
              goldPricePerGram: num(goldPrice), silverPricePerGram: num(silverPrice),
              accountantName, accountantLicense, accountantPreamble,
              accountantOpinion, opinionType, previousYearZakat,
              auditEntries: includeAuditReport ? auditEntries : undefined,
            }, `zakat-${name || "report"}-${new Date().toISOString().slice(0,10)}.xlsx`)}>
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              تحميل التقرير Excel
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <CheckCircle2 className="h-4 w-4 ml-2" />
              طباعة التقرير
            </Button>
          </CardContent>
        </Card>

      </div>

          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <Alert className="border-primary/30 bg-primary/5">
                <ClipboardCheck className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  هذا القسم مُخصَّص للمحاسب/المدقق الشرعي لمراجعة بيانات المُزكِّي وإبداء الرأي
                  المهني المناسب الذي يظهر لاحقاً في التقرير المطبوع. <b>تنبيه:</b> هذه أداة
                  مساعدة للحساب وفق مدخلات المستخدم وليست فتوى شرعية ملزمة.
                </AlertDescription>
              </Alert>

              {/* سجل التدقيق الشرعي للأوعية الزكوية (مَنقول من تبويب الحساب) */}
              <ShariaAuditTrail />

              {/* أدوات متقدمة للمراجعة والامتثال */}
              <Card className="shadow-soft border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" /> أدوات المراجعة والتخطيط المتقدمة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AdvanceMultiYearZakat annualZakat={calc.total} currencyName={currencyName} />
                  <SensitivityProjection annualZakat={calc.total} currencyName={currencyName} />
                  <InflationAdjusterCard currencyName={currencyName} />
                  <ZakatStatsDashboard />
                </CardContent>
              </Card>


              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> بيانات المحاسب الشرعي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">اسم محاسب الزكاة</Label>
                      <Input value={accountantName} onChange={(e) => setAccountantName(e.target.value)} placeholder="الاسم الكامل" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">رقم القيد / الترخيص</Label>
                      <Input value={accountantLicense} onChange={(e) => setAccountantLicense(e.target.value)} placeholder="رقم الترخيص" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ديباجة المحاسب (تظهر في رأس التقرير)</Label>
                    <Textarea
                      value={accountantPreamble}
                      onChange={(e) => setAccountantPreamble(e.target.value)}
                      rows={6}
                      className="text-xs leading-6"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> صنف النتيجة الشرعية التقديرية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RadioGroup value={opinionType} onValueChange={(v) => setOpinionType(v as "clean" | "qualified" | "adverse")} className="space-y-2">
                    <label htmlFor="op-clean" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="clean" id="op-clean" className="mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <b>نتيجة التقييم الزكوي</b> — الوعاء الزكوي مستوفٍ شروط الوجوب وفق البيانات المُدخَلة.
                      </div>
                    </label>
                    <label htmlFor="op-qual" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="qualified" id="op-qual" className="mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <b>خلاصة الفحص الزكوي</b> — توجد بنود تحتاج إلى مراجعة فقهية أو محاسبية تخصصية قبل اعتماد النتيجة.
                      </div>
                    </label>
                    <label htmlFor="op-adv" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="adverse" id="op-adv" className="mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <b>ملخص التحقق من النصاب</b> — الوعاء الزكوي أقل من النصاب الشرعي ولا تجب الزكاة في هذا الحول.
                      </div>
                    </label>
                  </RadioGroup>

                  <div className="space-y-1">
                    <Label className="text-xs">نص الرأي المهني التفصيلي (اختياري)</Label>
                    <Textarea
                      value={accountantOpinion}
                      onChange={(e) => setAccountantOpinion(e.target.value)}
                      rows={3}
                      placeholder="ملاحظات المحاسب على بنود التقرير أو تحفظاته…"
                      className="text-xs leading-6"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">إجمالي زكاة العام السابق (للمقارنة)</Label>
                    <Input type="number" min="0" step="0.01" value={previousYearZakat}
                      onChange={(e) => setPreviousYearZakat(e.target.value)}
                      dir="ltr" style={{ textAlign: "right" }} placeholder="0" />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    <Info className="inline h-3 w-3 ml-1" />
                    تظهر النتيجة الشرعية التقديرية والمقارنة في التقرير المطبوع، إضافةً إلى رقم تسلسلي وبصمة SHA‑256 ورابط تحقق إلكتروني.
                  </p>
                </CardContent>
              </Card>

              {/* خيار دمج سجل المراجعة والتدقيق ضمن التقرير */}
              <Card className="shadow-soft border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> دمج سجل المراجعة والتدقيق ضمن التقرير
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3 rounded-md border p-3 bg-muted/30">
                    <div className="space-y-1 flex-1">
                      <Label className="text-sm font-bold">إدراج ملحق المراجعة والتدقيق</Label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        عند التفعيل، يُضاف ملحق في نهاية تقرير الزكاة يتضمن سجل العمليات السابقة (الحفظ والحساب)
                        ببصمة فريدة (SHA‑256) والمراجع الشرعية المستخدمة. يتطلب تسجيل الدخول.
                      </p>
                    </div>
                    <Switch checked={includeAuditReport} onCheckedChange={setIncludeAuditReport} />
                  </div>
                  {includeAuditReport && (
                    <Alert className="border-primary/30 bg-primary/5">
                      <ShieldCheck className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {auditLoading
                          ? "جاري تحميل سجلات المراجعة…"
                          : auditEntries.length > 0
                            ? `سيُضاف ملحق يحتوي ${auditEntries.length} عملية مُسجَّلة في تقرير الزكاة.`
                            : "لا توجد سجلات بعد. سجّل دخولك واحفظ أول حساب زكاة لتظهر السجلات هنا."}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>


              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" /> قائمة فحص الإمتثال الشرعي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs space-y-2 leading-relaxed">
                    {[
                      "تم التحقق من بلوغ النصاب الشرعي (ذهب/فضة) وفق الأسعار اللحظية.",
                      "تم احتساب الحَوْل بالتقويم الهجري (354 يوماً) ما لم يُختَر التقويم الميلادي بنسبة 2.577%.",
                      "تم خصم الديون الحالّة وقسط السنة من الديون المؤجلة فقط.",
                      "لم تُدخَل بنود محرَّمة شرعاً ضمن الوعاء (فوائد ربوية، عوائد محرَّمة) دون تطهير.",
                      "تم تصنيف الذهب بين زينة وادخار وفق غرض الاقتناء.",
                      "تم تطبيق مبدأ الأنفع للفقراء عند اختلاف نصابي الذهب والفضة.",
                    ].map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* المعايير الشرعية حسب النشاط — مدمَجة في تبويب المراجعة والتدقيق */}
              <ShariaStandardsCard defaultSector="general" />
            </div>

            <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <Card className="border-gold/30 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-gold" /> ملخص للمراجعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <Row label="إجمالي الأصول النقدية" value={cur(calc.monetaryGross)} />
                  <Row label="الديون المخصومة" value={cur(calc.debts)} />
                  <Row label="الوعاء الصافي" value={cur(calc.monetaryBase)} highlight />
                  <Row label="النصاب المُعتمد (الأنفع)" value={cur(calc.moneyNisab)} />
                  <Separator className="my-2" />
                  <Row label="إجمالي الزكاة المستحقة" value={cur(calc.total)} highlight />
                  {parseFloat(previousYearZakat || "0") > 0 && (
                    <Row label="الفرق عن العام السابق" value={cur(calc.total - parseFloat(previousYearZakat))} />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      

    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${highlight ? "bg-primary/10 font-bold text-primary" : ""}`}>
      <span>{label}</span>
      <span dir="ltr">{value}</span>
    </div>
  );
}
