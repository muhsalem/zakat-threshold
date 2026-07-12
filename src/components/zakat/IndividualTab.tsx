import HijriDateField, { toHijri } from "./HijriDateField";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Coins,
  Landmark,
  TrendingUp,
  FileText,
  Package,
  Wheat,
  Home,
  MinusCircle,
  Calculator,
  Info,
  CheckCircle2,
  Sprout,
  CalendarClock,
  HandHeart,
  ShieldCheck,
  ClipboardCheck,
  Copy,
  AlertTriangle,
  Store,
  MonitorSmartphone,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import {
  ZAKAT_RATE,
  ZAKAT_RATE_GREGORIAN,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  CROPS_NISAB_KG,
  HAWL_DAYS_HIJRI,
  num,
  fmt,
  currency,
  camelZakat,
  cowZakat,
  sheepZakat,
  COUNTRY_PRICES,
  checkHawl,
  formatHijri,
  gregorianToHijri,
  ZAKAT_RECIPIENTS,
} from "@/lib/zakat";
import { SaveToHistoryCard } from "./SaveToHistoryCard";
import SalaryZakatCalculator from "./SalaryZakatCalculator";
import RibaPurificationCalc from "./RibaPurificationCalc";
import { CashBankSection } from "./CashBankSection";
import { SecuritiesSection } from "./SecuritiesSection";
import { EsopZakatSection } from "./EsopZakatSection";
import { LivePricesCard } from "./LivePricesCard";
import { EightChannelsDistribution } from "./EightChannelsDistribution";
import { downloadZakatPdf } from "./ReactPdfReport";
import { downloadReportExcel } from "@/lib/exportExcel";
import { CurrencyConverterCard } from "./CurrencyConverterCard";
import type { FxRate } from "@/lib/fx";
import { HawlSchedule } from "./HawlSchedule";
import ComplianceChecklist from "./ComplianceChecklist";

import { FileSpreadsheet } from "lucide-react";
import { IncomeUsufructSection } from "./IncomeUsufructSection";
import { PrintReport } from "./PrintReport";
import { RikazSection } from "./RikazSection";
import { DigitalAssetsSection } from "./DigitalAssetsSection";
import { CryptoFatwasCard } from "./CryptoFatwasCard";
import { useAuditEntries } from "@/hooks/useAuditEntries";
import { useMadhab } from "@/lib/madhabContext";
import {
  buildBaseReportData as buildBaseReportDataShared,
  buildDeductionsList as buildDeductionsListShared,
} from "@/lib/zakat/report-builders";
import { GoldSilverSection } from "./individual/gold-silver/GoldSilverSection";
import { CashBankAccordionSection } from "./individual/cash-bank/CashBankAccordionSection";
import { TradeGoodsSubsection } from "./individual/trade/TradeGoodsSubsection";
import {
  EcommerceItemsTable,
  computeEcommerceTotals,
  type EcommerceItem,
} from "./EcommerceItemsTable";
import TradeActivityClassification, {
  emptyTradeActivitySelection,
  type TradeActivitySelection,
} from "./TradeActivityClassification";

import { supabase } from "@/integrations/supabase/client";
import { NumField, SectionResult, Row } from "./individual/shared";
import { IndividualAuditTab } from "./individual/audit/IndividualAuditTab";

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
    "بسم الله الرحمن الرحيم\nأشهد بصفتي محاسب الزكاة المعتمد أنّ هذا الإقرار قد أُعِدّ بناءً على البيانات المُقدَّمة من المُزكِّي وفقاً للمعايير الشرعية المعتمدة (AAOIFI رقم 35 لزكاة الشركات والأفراد) وعلى ضوء فتاوى المجامع الفقهية المعاصرة، وبعد التحقق من بلوغ النصاب وحولان الحول وفق التقويم الهجري، وخصم الديون المستحقة والنفقات الواجبة. وقد رُوعي مبدأ «الأنفع للفقراء» في تقدير النصاب، وأُجريت عمليات التطهير على العوائد غير الشرعية. والله المستعان وعليه التُّكلان.",
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
    EG: 22,
    SA: 5,
    AE: 5,
    KW: 0.5,
    QA: 5,
    BH: 0.5,
    OM: 0.5,
    JO: 1,
    MA: 12,
    DZ: 90,
    TN: 3,
    IQ: 1300,
    SY: 5500,
    LB: 50000,
    YE: 250,
    SD: 600,
    LY: 5,
    PS: 4,
    TR: 35,
    US: 1.2,
    EU: 1.1,
    GB: 0.95,
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
  const [sb9, setSb9] = useState("");
  const [sb14, setSb14] = useState("");
  const [sb18, setSb18] = useState("");
  const [sb21, setSb21] = useState("");
  const [sb22, setSb22] = useState("");
  const [sb24, setSb24] = useState("");
  const [ounces, setOunces] = useState("");
  const [sbHalal, setSbHalal] = useState(true);
  const [sbFullyOwned, setSbFullyOwned] = useState(true);
  const [sbAcquireDate, setSbAcquireDate] = useState("");
  // ب) الجنيهات والعملات الذهبية (عيار 21)
  const [coinQuarter, setCoinQuarter] = useState(""); // 2.125 جم
  const [coinHalf, setCoinHalf] = useState(""); // 4.25 جم
  const [coinFull, setCoinFull] = useState(""); // 8.5 جم
  const [coinCustomKarat, setCoinCustomKarat] = useState("21");
  const [coinCustomWeight, setCoinCustomWeight] = useState("8.5");
  const [coinCustomQty, setCoinCustomQty] = useState("");
  const [coinHalal, setCoinHalal] = useState(true);
  const [coinFullyOwned, setCoinFullyOwned] = useState(true);
  const [coinAcquireDate, setCoinAcquireDate] = useState("");
  const [coinPurpose, setCoinPurpose] = useState<"storage" | "wear">("storage");
  const [jwAcquireDate, setJwAcquireDate] = useState("");
  // ج) المجوهرات
  const [jw9, setJw9] = useState("");
  const [jw12, setJw12] = useState("");
  const [jw14, setJw14] = useState("");
  const [jw18, setJw18] = useState("");
  const [jw21, setJw21] = useState("");
  const [jw22, setJw22] = useState("");
  const [jw24, setJw24] = useState("");
  // وزن الأحجار الكريمة المُدمجة (لاستبعادها) — المصنعية مستبعَدة تلقائياً
  const [jwStoneGrams, setJwStoneGrams] = useState("");
  const [jewelryPurpose, setJewelryPurpose] = useState<"storage" | "wear">("wear");
  const [jewelryOpinion, setJewelryOpinion] = useState<"majority" | "hanafi">("majority");
  // R1: مزامنة رأي الحلي مع المرجعية الفقهية العامة (Madhab Selector)
  const { rules: madhabRules, madhab } = useMadhab();
  useEffect(() => {
    setJewelryOpinion(madhabRules.jewelryWornZakatable ? "hanafi" : "majority");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [madhab]);
  // شروط إعفاء حلي الزينة عند رأي الجمهور
  const [jwHaal, setJwHaal] = useState(true); // حال غير مؤجل (مستعمل فعلاً)
  const [jwModeration, setJwModeration] = useState(true); // في حدود القصد والاعتدال
  const [jwPermissible, setJwPermissible] = useState(true); // استعمال مباح (لا تبرّج محرّم ولا تشبّه)
  // د) المشغولات الذهبية الأخرى
  const [brk18, setBrk18] = useState("");
  const [brk21, setBrk21] = useState("");
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
  const [sv999, setSv999] = useState("");
  const [sv960, setSv960] = useState("");
  const [sv925, setSv925] = useState("");
  const [sv900, setSv900] = useState("");
  const [sv835, setSv835] = useState("");
  const [sv800, setSv800] = useState("");
  const [sv750, setSv750] = useState("");
  const [svOunces, setSvOunces] = useState("");
  // ب) الجنيهات والعملات الفضية
  const [coinLira, setCoinLira] = useState(""); // ليرة عثمانية 12جم عيار 830
  const [coinRiyal, setCoinRiyal] = useState(""); // ريال فضة (وزن كلي بعيار 900)
  const [coinSvOtherKarat, setCoinSvOtherKarat] = useState("800");
  const [coinSvOther, setCoinSvOther] = useState("");
  // ج) مجوهرات ومشغولات وأدوات
  const [svJewelry, setSvJewelry] = useState(""); // مجوهرات وإكسسوارات
  const [svJewelryKarat, setSvJewelryKarat] = useState("925");
  const [svUtensils, setSvUtensils] = useState(""); // ملاعق صواني فناجين سبح
  const [svUtensilsKarat, setSvUtensilsKarat] = useState("925");
  const [svTools, setSvTools] = useState(""); // أدوات ومستلزمات وتحف
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
  const [tradeActivity, setTradeActivity] = useState<TradeActivitySelection>(
    emptyTradeActivitySelection(),
  );
  // المتجر الإلكتروني والمنتجات والخدمات الرقمية
  const [ecommerceEnabled, setEcommerceEnabled] = useState(false);
  const [ecommerceInventory, setEcommerceInventory] = useState(""); // بضاعة المتجر
  const [ecommerceDigitalProducts, setEcommerceDigitalProducts] = useState(""); // منتجات رقمية
  const [ecommerceServices, setEcommerceServices] = useState(""); // خدمات رقمية
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
  const [reTradeLand, setReTradeLand] = useState(""); // قيمة الأرض السوقية
  const [reTradeBuilding, setReTradeBuilding] = useState(""); // قيمة المبنى السوقية
  // عقار الإيجار/الاستغلال (يُزكَّى صافي الإيراد المُدّخر)
  const [reRentComp, setReRentComp] = useState<RealEstateComp>("both");
  const [reRentLandIncome, setReRentLandIncome] = useState(""); // صافي إيراد الأرض
  const [reRentBuildingIncome, setReRentBuildingIncome] = useState(""); // صافي إيراد المبنى
  // قيم مشتقة للحفاظ على التكامل مع باقي الحسابات
  const realEstateTrade =
    reTradeComp === "land"
      ? reTradeLand
      : reTradeComp === "building"
        ? reTradeBuilding
        : String(num(reTradeLand) + num(reTradeBuilding));
  const realEstateRentIncome =
    reRentComp === "land"
      ? reRentLandIncome
      : reRentComp === "building"
        ? reRentBuildingIncome
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
  const [esopData, setEsopData] = useState<
    import("./EsopZakatSection").EsopReportData | undefined
  >();
  const [fxRates, setFxRates] = useState<FxRate[]>([]);

  // قاعدة الأنشطة الزراعية الملحقة (عسل + أسماك + دواجن) — تُضمّ لعروض التجارة
  const [agriTradeBase, setAgriTradeBase] = useState(0);
  // إجمالي زكاة الركاز والمعادن والثروات المستحدثة — تُضاف للتقرير الإجمالي
  const [rikazTotal, setRikazTotal] = useState(0);

  // الديون والالتزامات — تصنيف شرعي مفصّل
  // ① الديون الحالة (واجبة السداد الآن)
  const [debtPersonalLoan, setDebtPersonalLoan] = useState(""); // قروض شخصية
  const [debtBankLoan, setDebtBankLoan] = useState(""); // ديون مصرفية
  const [debtConsumerFinance, setDebtConsumerFinance] = useState(""); // تمويل استهلاكي
  const [debtCarInstall, setDebtCarInstall] = useState(""); // أقساط سيارات/سلع حالَّة
  const [debtTradePayable, setDebtTradePayable] = useState(""); // ديون تجارية مستحقة
  const [debtPurchases, setDebtPurchases] = useState(""); // أثمان مشتريات لم تُسدد
  // ② الديون المؤجلة — رأي العمل المعاصر
  const [debtDeferredYearly, setDebtDeferredYearly] = useState(""); // قسط السنة فقط من الديون المؤجلة
  const [debtDeferredPolicy, setDebtDeferredPolicy] = useState<"yearly" | "full" | "none">(
    "yearly",
  );
  const [debtMortgage, setDebtMortgage] = useState(""); // أقساط تمويل عقاري (إجمالي متبقي)
  const [debtMahr, setDebtMahr] = useState(""); // مهر مؤجل
  // ③ النفقة الواجبة إذا صارت ديناً
  const [debtAlimony, setDebtAlimony] = useState(""); // نفقة زوجة/أولاد/أقارب بحكم أو اتفاق
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
      conv(num(sb9), 9) +
      conv(num(sb14), 14) +
      conv(num(sb18), 18) +
      conv(num(sb21), 21) +
      conv(num(sb22), 22) +
      num(sb24) +
      num(ounces) * OUNCE_G;

    // ب) الجنيهات والعملات الذهبية (الجنيه المصري عيار 21)
    const coinsGrams21 = num(coinQuarter) * 2.125 + num(coinHalf) * 4.25 + num(coinFull) * 8.5;
    const coinsCustomGrams = num(coinCustomWeight) * num(coinCustomQty);
    const coinsGrams24 = conv(coinsGrams21, 21) + conv(coinsCustomGrams, num(coinCustomKarat));

    // ج) المجوهرات — استبعاد وزن الأحجار الكريمة (المصنعية مستبعَدة تلقائياً لأن الحساب بالوزن الصافي × سعر السبيكة)
    const jewelryGramsGross =
      conv(num(jw9), 9) +
      conv(num(jw12), 12) +
      conv(num(jw14), 14) +
      conv(num(jw18), 18) +
      conv(num(jw21), 21) +
      conv(num(jw22), 22) +
      num(jw24);
    const jewelryGrams24Raw = Math.max(0, jewelryGramsGross - num(jwStoneGrams));
    // إعفاء حلي الزينة عند الجمهور مشروط بـ: حال غير مؤجل، وفي حدود القصد والاعتدال، واستعمال مباح
    const jwWearExempt = jwHaal && jwModeration && jwPermissible;
    const jewelryGrams24 =
      jewelryPurpose === "storage"
        ? jewelryGrams24Raw
        : jewelryOpinion === "hanafi" || !jwWearExempt
          ? jewelryGrams24Raw
          : 0;

    // د) المشغولات الأخرى (كسر + ادخاري غير قابل للبس) → دائماً تُزكَّى — مع استبعاد الأحجار الكريمة
    const brokenGrossGrams =
      conv(num(brk18), 18) +
      conv(num(brk21), 21) +
      num(brk24) +
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
      num(sv999) +
      convSv(num(sv960), 960) +
      convSv(num(sv925), 925) +
      convSv(num(sv900), 900) +
      convSv(num(sv835), 835) +
      convSv(num(sv800), 800) +
      convSv(num(sv750), 750) +
      num(svOunces) * OUNCE_SV;

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
    const svJewelryG999 =
      silverPurpose === "storage"
        ? svJewelryG999Raw
        : silverOpinion === "hanafi"
          ? svJewelryG999Raw
          : 0;

    const silverGrams = svSabaikG999 + svCoinsG999 + svJewelryG999;
    const silverValue = silverGrams * sp;
    const silverEligible = silverGrams >= SILVER_NISAB_GRAMS;
    const silverZakat = silverEligible ? silverValue * effectiveRate : 0;

    const cashTotal = cashTotalFromSection;
    const securitiesTotal = securitiesTotalFromSection;
    const billsTotal = num(bills);
    const tradeShareholderBase = tradeIsShareholder
      ? num(tradeShareCompanyBase) * (num(tradeSharePct) / 100)
      : 0;
    const livestockTradeBase = livestockForTrade ? num(livestockTradeValue) : 0;
    const ecommerceTotal = ecommerceEnabled
      ? num(ecommerceInventory) +
        num(ecommerceDigitalProducts) +
        num(ecommerceServices) +
        num(ecommerceReceivables)
      : 0;
    const tradeTotal =
      num(inventory) +
      num(receivablesGood) +
      tradeShareholderBase +
      agriTradeBase +
      livestockTradeBase +
      ecommerceTotal;
    const realEstateZakatable = num(realEstateTrade) + num(realEstateRentIncome);
    const incomeUsufruct = incomeUsufructTotal;

    const goldNisabValue = GOLD_NISAB_GRAMS * gp;
    const silverNisabValue = SILVER_NISAB_GRAMS * sp;
    const moneyNisab = Math.min(goldNisabValue, silverNisabValue);

    // ① الديون الحالة — تُخصم باتفاق الفقهاء
    const dueDebts =
      num(debtPersonalLoan) +
      num(debtBankLoan) +
      num(debtConsumerFinance) +
      num(debtCarInstall) +
      num(debtTradePayable) +
      num(debtPurchases);
    // ② الديون المؤجلة — حسب القول المختار في الفتوى المعاصرة
    const deferredTotal = num(debtMortgage) + num(debtMahr);
    const deferredDeduction =
      debtDeferredPolicy === "yearly"
        ? num(debtDeferredYearly)
        : debtDeferredPolicy === "full"
          ? deferredTotal || num(debtDeferredYearly)
          : 0;
    // ③ النفقة الواجبة إذا صارت ديناً — تُخصم
    const alimony = num(debtAlimony);
    const debts = dueDebts + deferredDeduction + alimony + num(expenses);
    const monetaryGross =
      cashTotal +
      securitiesTotal +
      digitalAssetsTotal +
      billsTotal +
      tradeTotal +
      realEstateZakatable +
      incomeUsufruct;
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
    const monetaryGoldZakat = hawlBlocks ? 0 : goldZakat + silverZakat + monetaryZakat;
    const total = monetaryGoldZakat + cropsZakat + rikazTotal;

    return {
      sabaikGrams24,
      coinsGrams24,
      jewelryGrams24,
      jewelryGrams24Raw,
      otherGrams24,
      totalGold24,
      totalGoldValue,
      goldEligible,
      goldZakat: hawlBlocks ? 0 : goldZakat,
      svSabaikG999,
      svCoinsG999,
      svJewelryG999,
      svJewelryG999Raw,
      silverGrams,
      silverValue,
      silverEligible,
      silverZakat: hawlBlocks ? 0 : silverZakat,
      cashTotal,
      securitiesTotal,
      billsTotal,
      tradeTotal,
      realEstateZakatable,
      debts,
      monetaryGross,
      monetaryBase,
      monetaryEligible,
      monetaryZakat: hawlBlocks ? 0 : monetaryZakat,
      moneyNisab,
      goldNisabValue,
      silverNisabValue,
      cropsValue,
      cropsRate,
      cropsEligible,
      cropsZakat,
      camelsN,
      cowsN,
      sheepN,
      total,
      hawlBlocks,
    };
  }, [
    goldPrice,
    silverPrice,
    sb9,
    sb14,
    sb18,
    sb21,
    sb22,
    sb24,
    ounces,
    coinQuarter,
    coinHalf,
    coinFull,
    coinCustomKarat,
    coinCustomWeight,
    coinCustomQty,
    jw9,
    jw12,
    jw14,
    jw18,
    jw21,
    jw22,
    jw24,
    jewelryPurpose,
    jewelryOpinion,
    jwStoneGrams,
    jwHaal,
    jwModeration,
    jwPermissible,
    brk18,
    brk21,
    brk24,
    brkOtherKarat,
    brkOtherWeight,
    brkStoneGrams,
    storageKarat,
    storageWeight,
    securitiesTotalFromSection,
    bills,
    inventory,
    receivablesGood,
    realEstateTrade,
    realEstateRentIncome,
    tradeIsShareholder,
    tradeSharePct,
    tradeShareCompanyBase,
    agriTradeBase,
    livestockForTrade,
    livestockTradeValue,
    ecommerceEnabled,
    ecommerceInventory,
    ecommerceDigitalProducts,
    ecommerceServices,
    ecommerceReceivables,
    incomeUsufructTotal,
    ownsFarmland,
    ownsLivestock,
    debtPersonalLoan,
    debtBankLoan,
    debtConsumerFinance,
    debtCarInstall,
    debtTradePayable,
    debtPurchases,
    debtDeferredPolicy,
    debtDeferredYearly,
    debtMortgage,
    debtMahr,
    debtAlimony,
    expenses,
    cropsKg,
    cropsValuePerKg,
    cropsIrrigation,
    camels,
    cows,
    sheep,
    effectiveRate,
    hawl,
    cashTotalFromSection,
    digitalAssetsTotal,
    rikazTotal,
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
    return {
      active: true,
      total: persons * FITR_SAA_KG * pricePerKg,
      hijri: h,
      persons,
      pricePerKg,
    };
  }, [fitrFamilySize, countryCode]);
  const fitrContribution = fitrEnabled && fitrAuto.active ? fitrAuto.total : 0;

  /** بناء بيان الخصومات والمبرّرات الشرعية لإثبات سبب الاحتساب أو الاستبعاد. */
  const buildDeductionsList = () =>
    buildDeductionsListShared({
      debtPersonalLoan,
      debtBankLoan,
      debtConsumerFinance,
      debtCarInstall,
      debtTradePayable,
      debtPurchases,
      debtAlimony,
      debtDeferredYearly,
      debtMortgage,
      debtMahr,
      debtDeferredPolicy,
    });

  /** بناء بيانات FX لإدراجها في PDF/Excel. */
  const buildFxPayload = () => {
    if (fxRates.length === 0) return undefined;
    return {
      reportCurrency: currencyName,
      rates: fxRates.map((r) => ({ from: r.from, to: currencyName, rate: r.rate })),
      entries: [] as Array<{
        label: string;
        originalAmount: number;
        originalCurrency: string;
        rate: number;
        convertedAmount: number;
      }>,
      source: "أسعار صرف يدوية أدخلها المُزكِّي",
    };
  };

  /** بيانات التقرير الأساسية المشتركة بين تصدير PDF و Excel. */
  const buildBaseReportData = () =>
    buildBaseReportDataShared({
      name,
      profession,
      countryCode,
      currencyName,
      calendarBasis,
      effectiveRate,
      calc,
      incomeUsufructTotal,
      rikazTotal,
      ownsLivestock,
      livestockForTrade,
      livestockTradeValue,
      esopData,
      hawl,
      nisabStartDate,
      goldPrice,
      silverPrice,
      accountantName,
      accountantLicense,
      accountantPreamble,
      accountantOpinion,
      opinionType,
      previousYearZakat,
      includeAuditReport,
      auditEntries,
    });

  return (
    <div dir="rtl" className="text-right">
      {/* تقرير الطباعة الاحترافي — يظهر فقط عند الطباعة */}
      <PrintReport
        data={{
          name,
          profession,
          countryCode,
          currencyName,
          calendarBasis,
          effectiveRate,
          rows: [
            {
              label: "زكاة الذهب",
              gross: calc.totalGoldValue,
              nisab: calc.goldNisabValue,
              eligible: calc.goldEligible,
              zakat: calc.goldZakat,
            },
            {
              label: "زكاة الفضة",
              gross: calc.silverValue,
              nisab: calc.silverNisabValue,
              eligible: calc.silverEligible,
              zakat: calc.silverZakat,
            },
            {
              label: "زكاة الأوراق النقدية والحسابات البنكية والمحافظ الرقمية",
              gross: calc.cashTotal,
              eligible: true,
              zakat: 0,
            },
            {
              label: "زكاة الأوراق المالية ووثائق التأمين",
              gross: calc.securitiesTotal,
              eligible: true,
              zakat: 0,
            },
            {
              label: "زكاة الأوراق التجارية (الكمبيالات وأوراق القبض)",
              gross: calc.billsTotal,
              eligible: true,
              zakat: 0,
            },
            {
              label: "زكاة الدخل وعروض التجارة والمستغلات",
              gross: calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal,
              eligible: true,
              zakat: 0,
            },
            {
              label: "زكاة الزروع والثمار",
              gross: calc.cropsValue,
              eligible: calc.cropsEligible,
              zakat: calc.cropsZakat,
            },
            {
              label: "زكاة الركاز والمعادن",
              gross: rikazTotal,
              eligible: rikazTotal > 0,
              zakat: rikazTotal,
            },
          ],
          livestock: {
            camels: calc.camelsN,
            cows: calc.cowsN,
            sheep: calc.sheepN,
            show: ownsLivestock,
            mode: livestockForTrade ? "trade" : "grazing",
            tradeValue: livestockForTrade ? num(livestockTradeValue) : 0,
          },
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
          accountantName,
          accountantLicense,
          accountantPreamble,
          accountantOpinion,
          opinionType,
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
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسم المزكي"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>المهنة</Label>
                    <Input
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="المهنة أو النشاط"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الدولة</Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRY_PRICES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name} ({c.currency})
                          </SelectItem>
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
                    <RadioGroup
                      value={calculatedBefore}
                      onValueChange={(v) => setCalculatedBefore(v as "yes" | "no")}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id="cb-yes" />
                        <Label htmlFor="cb-yes">نعم</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id="cb-no" />
                        <Label htmlFor="cb-no">لا</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      هل تريد تثبيت تاريخ الحساب (لأعوام سابقة أو لاحقة)؟
                    </Label>
                    <RadioGroup
                      value={pinDate}
                      onValueChange={(v) => setPinDate(v as "yes" | "no")}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id="pd-yes" />
                        <Label htmlFor="pd-yes">نعم</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id="pd-no" />
                        <Label htmlFor="pd-no">لا</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      سجل بلوغ النصاب الموحَّد (يطبَّق على جميع أنواع الأصول)
                    </Label>
                    <div className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">ميلادي</Label>
                        <Input
                          type="date"
                          value={nisabStartDate}
                          onChange={(e) => setNisabStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          ما يقابله بالهجري (أم القرى)
                        </Label>
                        <div className="h-9 flex items-center justify-between rounded-md border bg-background px-3 text-sm font-semibold text-primary">
                          <span>{toHijri(nisabStartDate) || "—"}</span>
                          {nisabStartDate && (
                            <Badge variant="secondary" className="text-[9px]">
                              تقويم أم القرى
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={nisabSaving || !nisabStartDate}
                        onClick={async () => {
                          setNisabSaving(true);
                          const hijri_label =
                            toHijri(nisabStartDate) || (hawl ? formatHijri(hawl.hijriStart) : null);
                          const payload = {
                            owner_label: name || "بدون اسم",
                            unified_nisab_date: nisabStartDate,
                            hijri_label,
                            calendar_basis: calendarBasis,
                            notes: notes || null,
                          };
                          const { data, error } = nisabRecordId
                            ? await supabase
                                .from("nisab_records")
                                .update(payload)
                                .eq("id", nisabRecordId)
                                .select()
                                .single()
                            : await supabase
                                .from("nisab_records")
                                .insert(payload)
                                .select()
                                .single();
                          if (!error && data) {
                            setNisabRecordId(data.id);
                            setNisabSaveMsg("تم الحفظ ✓");
                          } else setNisabSaveMsg("تعذّر الحفظ");
                          setNisabSaving(false);
                          setTimeout(() => setNisabSaveMsg(""), 2500);
                        }}
                      >
                        {nisabSaving ? "..." : nisabRecordId ? "تحديث السجل" : "حفظ السجل"}
                      </Button>
                      {nisabSaveMsg && <span className="text-xs text-primary">{nisabSaveMsg}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      <Info className="inline h-3 w-3 ml-1" />
                      مصدر التحويل: <b>Intl ICU CLDR — تقويم أم القرى</b>. يُؤكَّد التحويل تلقائياً
                      عند إدخال التاريخ الميلادي ويُحفظ في سجل النصاب.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <Info className="inline h-3 w-3 ml-1" />
                      وفقاً للجمهور (ضم المستفاد إلى ما عنده من جنسه): تاريخ بلوغ النصاب الأول يصبح{" "}
                      <b>المرجع الموحَّد</b> لحَوْل جميع الأصول النقدية (ذهب، فضة، نقد، عروض تجارة،
                      أسهم). الزروع والثمار لا يشترط لها حول.
                    </p>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>أساس حساب الحول</Label>
                    <RadioGroup
                      value={calendarBasis}
                      onValueChange={(v) => setCalendarBasis(v as "hijri" | "gregorian")}
                      className="flex flex-wrap gap-4 pt-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="hijri" id="cb-h" />
                        <Label htmlFor="cb-h" className="text-sm">
                          هجري — نسبة 2.5%
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="gregorian" id="cb-g" />
                        <Label htmlFor="cb-g" className="text-sm">
                          ميلادي — نسبة 2.577% (معدّلة)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {hawl && (
                    <div className="md:col-span-2">
                      <Alert
                        className={
                          hawl.hawlComplete
                            ? "border-primary/30 bg-primary/5"
                            : "border-destructive/40 bg-destructive/5"
                        }
                      >
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {hawl.hawlComplete ? (
                            <>
                              اكتمل الحَوْل (مضى <b>{hawl.daysPassed} يومًا</b> ≥ {HAWL_DAYS_HIJRI}{" "}
                              يوم هجري). تجب الزكاة على جميع الأصول النقدية تحت هذا السجل الموحَّد.
                            </>
                          ) : (
                            <>
                              لم يكتمل الحول بعد — مضى <b>{hawl.daysPassed} يومًا</b> ويتبقى{" "}
                              <b>{hawl.daysRemaining} يومًا</b> لإكمال 354 يومًا هجريًا. لا تجب زكاة
                              النقد والذهب الآن (الزروع والثمار لا تشترط حولًا).
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {nisabStartDate && (
                    <div className="md:col-span-2">
                      <HawlSchedule startDateISO={nisabStartDate} basis={calendarBasis} />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <ComplianceChecklist
                      inputs={{
                        goldGrams24: calc.totalGold24,
                        silverGrams: calc.silverGrams,
                        monetaryBase: calc.monetaryBase,
                        moneyNisab: calc.moneyNisab,
                        debts: calc.debts,
                        hawlComplete: hawl ? hawl.hawlComplete : null,
                        hawlDaysRemaining: hawl?.daysRemaining,
                        hawlDaysPassed: hawl?.daysPassed,
                        jewelryWornGrams: jewelryPurpose === "wear" ? calc.jewelryGrams24Raw : 0,
                        jewelryOpinion,
                        jewelryPurpose,
                        cropsKg: calc.cropsValue > 0 ? calc.cropsValue : 0,
                        camelsN: calc.camelsN,
                        cowsN: calc.cowsN,
                        sheepN: calc.sheepN,
                        fullOwnership: true,
                        moneyIsGrowth: true,
                      }}
                    />
                  </div>

                  {calendarBasis === "gregorian" && (
                    <div className="md:col-span-2">
                      <Alert className="border-gold/30 bg-gold/5">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          وفق قرار الندوة السابعة لقضايا الزكاة (الكويت 1417هـ): من حسب زكاته على
                          السنة الميلادية يُضاعف المعدل من 2.5% إلى <b>2.577%</b> لجبر فرق 11 يومًا
                          تقريبًا بين السنتين.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Label className="mb-2 block">ملاحظات</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي ملاحظات إضافية"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* الأبواب */}
              <Accordion
                type="multiple"
                value={openSections}
                onValueChange={setOpenSections}
                className="space-y-3"
              >
                {/* زكاة الذهب والفضة — مستخرجة إلى GoldSilverSection */}
                <GoldSilverSection
                  sb24={sb24} setSb24={setSb24}
                  sb22={sb22} setSb22={setSb22}
                  sb21={sb21} setSb21={setSb21}
                  sb18={sb18} setSb18={setSb18}
                  sb14={sb14} setSb14={setSb14}
                  sb9={sb9} setSb9={setSb9}
                  ounces={ounces} setOunces={setOunces}
                  sbHalal={sbHalal} setSbHalal={setSbHalal}
                  sbFullyOwned={sbFullyOwned} setSbFullyOwned={setSbFullyOwned}
                  sbAcquireDate={sbAcquireDate} setSbAcquireDate={setSbAcquireDate}
                  coinFull={coinFull} setCoinFull={setCoinFull}
                  coinHalf={coinHalf} setCoinHalf={setCoinHalf}
                  coinQuarter={coinQuarter} setCoinQuarter={setCoinQuarter}
                  coinCustomKarat={coinCustomKarat} setCoinCustomKarat={setCoinCustomKarat}
                  coinCustomWeight={coinCustomWeight} setCoinCustomWeight={setCoinCustomWeight}
                  coinCustomQty={coinCustomQty} setCoinCustomQty={setCoinCustomQty}
                  coinHalal={coinHalal} setCoinHalal={setCoinHalal}
                  coinFullyOwned={coinFullyOwned} setCoinFullyOwned={setCoinFullyOwned}
                  coinAcquireDate={coinAcquireDate} setCoinAcquireDate={setCoinAcquireDate}
                  coinPurpose={coinPurpose} setCoinPurpose={setCoinPurpose}
                  jw24={jw24} setJw24={setJw24}
                  jw22={jw22} setJw22={setJw22}
                  jw21={jw21} setJw21={setJw21}
                  jw18={jw18} setJw18={setJw18}
                  jw14={jw14} setJw14={setJw14}
                  jw12={jw12} setJw12={setJw12}
                  jw9={jw9} setJw9={setJw9}
                  jwStoneGrams={jwStoneGrams} setJwStoneGrams={setJwStoneGrams}
                  jewelryPurpose={jewelryPurpose} setJewelryPurpose={setJewelryPurpose}
                  jwAcquireDate={jwAcquireDate} setJwAcquireDate={setJwAcquireDate}
                  jewelryOpinion={jewelryOpinion} setJewelryOpinion={setJewelryOpinion}
                  jwHaal={jwHaal} setJwHaal={setJwHaal}
                  jwModeration={jwModeration} setJwModeration={setJwModeration}
                  jwPermissible={jwPermissible} setJwPermissible={setJwPermissible}
                  brk24={brk24} setBrk24={setBrk24}
                  brk21={brk21} setBrk21={setBrk21}
                  brk18={brk18} setBrk18={setBrk18}
                  brkOtherKarat={brkOtherKarat} setBrkOtherKarat={setBrkOtherKarat}
                  brkOtherWeight={brkOtherWeight} setBrkOtherWeight={setBrkOtherWeight}
                  brkStoneGrams={brkStoneGrams} setBrkStoneGrams={setBrkStoneGrams}
                  storageKarat={storageKarat} setStorageKarat={setStorageKarat}
                  storageWeight={storageWeight} setStorageWeight={setStorageWeight}
                  brkAcquireDate={brkAcquireDate} setBrkAcquireDate={setBrkAcquireDate}
                  sv999={sv999} setSv999={setSv999}
                  sv960={sv960} setSv960={setSv960}
                  sv925={sv925} setSv925={setSv925}
                  sv900={sv900} setSv900={setSv900}
                  sv835={sv835} setSv835={setSv835}
                  sv800={sv800} setSv800={setSv800}
                  sv750={sv750} setSv750={setSv750}
                  svOunces={svOunces} setSvOunces={setSvOunces}
                  svAcquireDate={svAcquireDate} setSvAcquireDate={setSvAcquireDate}
                  coinLira={coinLira} setCoinLira={setCoinLira}
                  coinRiyal={coinRiyal} setCoinRiyal={setCoinRiyal}
                  coinSvOtherKarat={coinSvOtherKarat} setCoinSvOtherKarat={setCoinSvOtherKarat}
                  coinSvOther={coinSvOther} setCoinSvOther={setCoinSvOther}
                  svCoinAcquireDate={svCoinAcquireDate} setSvCoinAcquireDate={setSvCoinAcquireDate}
                  svJewelry={svJewelry} setSvJewelry={setSvJewelry}
                  svJewelryKarat={svJewelryKarat} setSvJewelryKarat={setSvJewelryKarat}
                  svUtensils={svUtensils} setSvUtensils={setSvUtensils}
                  svUtensilsKarat={svUtensilsKarat} setSvUtensilsKarat={setSvUtensilsKarat}
                  svTools={svTools} setSvTools={setSvTools}
                  svToolsKarat={svToolsKarat} setSvToolsKarat={setSvToolsKarat}
                  silverPurpose={silverPurpose} setSilverPurpose={setSilverPurpose}
                  svJewelryAcquireDate={svJewelryAcquireDate} setSvJewelryAcquireDate={setSvJewelryAcquireDate}
                  silverOpinion={silverOpinion} setSilverOpinion={setSilverOpinion}
                  goldPrice={goldPrice} setGoldPrice={setGoldPrice}
                  silverPrice={silverPrice} setSilverPrice={setSilverPrice}
                  calc={calc}
                  effectiveRate={effectiveRate}
                  currencyName={currencyName}
                  countryName={country.name}
                  cur={cur}
                />


                {/* النقد */}
                <CashBankAccordionSection
                  countryCode={countryCode}
                  currencyName={currencyName}
                  onCashTotalChange={setCashTotalFromSection}
                />


                {/* الأوراق المالية */}
                <AccordionItem
                  id="section-securities"
                  value="securities"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <TrendingUp className="h-5 w-5 text-primary" /> زكاة الأوراق المالية ووثائق
                      التأمين
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
                <AccordionItem
                  id="section-bills"
                  value="bills"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <FileText className="h-5 w-5 text-primary" /> زكاة الأوراق التجارية
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <NumField
                      label="كمبيالات وشيكات وأوراق قبض محققة الأداء"
                      value={bills}
                      onChange={setBills}
                      unit={currencyName}
                      hint="المرجوة السداد فقط؛ أما المشكوك في تحصيلها فلا تُزكَّى حتى تُقبض، ثم زكاة سنة واحدة"
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* العملات الرقمية والمحافظ الاستثمارية — AAOIFI 35 */}
                <AccordionItem
                  id="section-digital-assets"
                  value="digital-assets"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <TrendingUp className="h-5 w-5 text-gold" /> زكاة العملات الرقمية والمحافظ
                      الاستثمارية
                      <Badge variant="outline" className="text-[10px] mr-2">
                        AAOIFI 35
                      </Badge>
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
                <AccordionItem
                  id="section-income-trade-usufruct"
                  value="income-trade-usufruct"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <Package className="h-5 w-5 text-primary" /> زكاة الدخل وعروض التجارة
                      والمستغلات والإيرادات
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    {/* أولاً: عروض التجارة والديون */}
                    <TradeGoodsSubsection
                      currencyName={currencyName}
                      inventory={inventory}
                      setInventory={setInventory}
                      receivablesGood={receivablesGood}
                      setReceivablesGood={setReceivablesGood}
                      receivablesBad={receivablesBad}
                      setReceivablesBad={setReceivablesBad}
                      tradeIsShareholder={tradeIsShareholder}
                      setTradeIsShareholder={setTradeIsShareholder}
                      tradeShareCompany={tradeShareCompany}
                      setTradeShareCompany={setTradeShareCompany}
                      tradeSharePct={tradeSharePct}
                      setTradeSharePct={setTradeSharePct}
                      tradeShareCompanyBase={tradeShareCompanyBase}
                      setTradeShareCompanyBase={setTradeShareCompanyBase}
                      num={num}
                      cur={cur}
                    />


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
                              <b>المتجر الإلكتروني:</b> يُزكَّى بقيمة البضاعة المعروضة للبيع +
                              المنتجات الرقمية + الخدمات الرقمية المُدّخَرة + المستحقات المرجوّة. لا
                              زكاة في الأصول الرقمية المُعدّة للبيع إذا كانت ضمن «العملات الرقمية»
                              (تُحسب هناك). والعبرة بالقيمة السوقية يوم الوجوب.
                            </AlertDescription>
                          </Alert>

                          <EcommerceItemsTable
                            items={ecommerceItems}
                            onItemsChange={setEcommerceItems}
                            currencyName={currencyName}
                          />

                          {ecommerceItems.length > 0 && (
                            <div className="text-[11px] text-muted-foreground text-right">
                              الحقول أدناه مُغذّاة تلقائيًا من سجل البنود. يمكنك تعديلها يدويًا بعد
                              تفريغ السجل.
                            </div>
                          )}
                          <div className="grid md:grid-cols-2 gap-4">
                            <NumField
                              label="قيمة بضاعة المتجر (منتجات مادية)"
                              value={ecommerceInventory}
                              onChange={setEcommerceInventory}
                              unit={currencyName}
                              hint="تُقوَّم بسعر البيع يوم وجوب الزكاة"
                            />
                            <NumField
                              label="المنتجات الرقمية (قوالب · كتب إلكترونية · دورات · برامج)"
                              value={ecommerceDigitalProducts}
                              onChange={setEcommerceDigitalProducts}
                              unit={currencyName}
                              hint="قيمة المخزون الرقمي المُدّخر للتجارة"
                            />
                            <NumField
                              label="الخدمات الرقمية المُدّخَرة (اشتراكات · استضافة · تراخيص)"
                              value={ecommerceServices}
                              onChange={setEcommerceServices}
                              unit={currencyName}
                              hint="صافي الإيراد المُدّخر من الخدمات الرقمية"
                            />
                            <NumField
                              label="مستحقات المتجر (ديون مرجوّة على العملاء)"
                              value={ecommerceReceivables}
                              onChange={setEcommerceReceivables}
                              unit={currencyName}
                              hint="طلبات لم تُسدَّد بعد على منصات البيع أو التحويل"
                            />
                          </div>
                          <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              إجمالي قاعدة المتجر الإلكتروني والرقمي
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {cur(
                                num(ecommerceInventory) +
                                  num(ecommerceDigitalProducts) +
                                  num(ecommerceServices) +
                                  num(ecommerceReceivables),
                              )}
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
                          <b>عقار التجارة</b> (مُعدّ للبيع — أرضاً كان أو مبنىً أو كليهما): يُزكَّى
                          بكامل قيمته السوقية يوم وجوب الزكاة.
                          <br />
                          <b>عقار الإيجار/الاستغلال:</b> لا زكاة في رقبته، وإنما في صافي إيراده
                          المُدّخر بعد النفقات إذا بلغ النصاب وحال عليه الحول.
                        </AlertDescription>
                      </Alert>
                      {/* عقار التجارة */}
                      <div className="rounded-md border border-primary/15 bg-background p-3 space-y-3">
                        <div className="text-sm font-semibold">
                          أ) عقار للتجارة (يُزكَّى بالقيمة السوقية)
                        </div>
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
                            <NumField
                              label="قيمة الأرض السوقية"
                              value={reTradeLand}
                              onChange={setReTradeLand}
                              unit={currencyName}
                            />
                          )}
                          {(reTradeComp === "building" || reTradeComp === "both") && (
                            <NumField
                              label="قيمة المبنى السوقية"
                              value={reTradeBuilding}
                              onChange={setReTradeBuilding}
                              unit={currencyName}
                            />
                          )}
                        </div>
                        {reTradeComp === "both" &&
                          (num(reTradeLand) > 0 || num(reTradeBuilding) > 0) && (
                            <div className="text-xs text-muted-foreground">
                              الإجمالي الخاضع للزكاة:{" "}
                              <b>
                                {fmt(num(reTradeLand) + num(reTradeBuilding))} {currencyName}
                              </b>{" "}
                              (أرض {fmt(num(reTradeLand))} + مبنى {fmt(num(reTradeBuilding))})
                            </div>
                          )}
                      </div>

                      {/* عقار الإيجار/الاستغلال */}
                      <div className="rounded-md border border-primary/15 bg-background p-3 space-y-3">
                        <div className="text-sm font-semibold">
                          ب) عقار للإيجار/الاستغلال (يُزكَّى صافي الإيراد المُدّخر)
                        </div>
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
                            <NumField
                              label="صافي إيراد الأرض المُدّخر"
                              value={reRentLandIncome}
                              onChange={setReRentLandIncome}
                              unit={currencyName}
                              hint="بعد المصاريف والنفقات الضرورية"
                            />
                          )}
                          {(reRentComp === "building" || reRentComp === "both") && (
                            <NumField
                              label="صافي إيراد المبنى المُدّخر"
                              value={reRentBuildingIncome}
                              onChange={setReRentBuildingIncome}
                              unit={currencyName}
                              hint="بعد المصاريف والنفقات الضرورية"
                            />
                          )}
                        </div>
                        {reRentComp === "both" &&
                          (num(reRentLandIncome) > 0 || num(reRentBuildingIncome) > 0) && (
                            <div className="text-xs text-muted-foreground">
                              إجمالي الإيراد الخاضع للزكاة:{" "}
                              <b>
                                {fmt(num(reRentLandIncome) + num(reRentBuildingIncome))}{" "}
                                {currencyName}
                              </b>{" "}
                              (أرض {fmt(num(reRentLandIncome))} + مبنى{" "}
                              {fmt(num(reRentBuildingIncome))})
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
                      <SalaryZakatCalculator
                        currencyName={currencyName}
                        nisabValue={calc.moneyNisab}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* الزروع */}
                <AccordionItem
                  id="section-crops"
                  value="crops"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
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
                          <NumField
                            label="كمية المحصول"
                            value={cropsKg}
                            onChange={setCropsKg}
                            unit="كجم"
                            hint={`النصاب: ${CROPS_NISAB_KG} كجم (5 أوسق)`}
                          />
                          <NumField
                            label="سعر الكيلوجرام"
                            value={cropsValuePerKg}
                            onChange={setCropsValuePerKg}
                            unit={currencyName}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">طريقة الري</Label>
                          <RadioGroup
                            value={cropsIrrigation}
                            onValueChange={(v) => setCropsIrrigation(v as "rain" | "irrigated")}
                            className="flex flex-col md:flex-row gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="rain" id="rain" />
                              <Label htmlFor="rain">سُقي بلا كلفة (مطر/أنهار) — 10%</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="irrigated" id="irr" />
                              <Label htmlFor="irr">سُقي بكلفة (آلات/شراء) — 5%</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        {calc.cropsEligible && (
                          <div className="rounded-lg bg-muted/50 p-3 text-xs">
                            قيمة المحصول: <b>{cur(calc.cropsValue)}</b> — النسبة:{" "}
                            <b>{(calc.cropsRate * 100).toFixed(0)}%</b>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          ملاحظة: الزروع لا تشترط حولًا، وإنما تجب يوم الحصاد.
                        </p>
                      </>
                    )}

                    {/* تبويب فرعي: العسل + الثروة السمكية + مزارع الدواجن (تُلحق بالزروع والثمار) */}
                    <div className="pt-4 border-t border-dashed">
                      <div className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
                        <Wheat className="h-4 w-4" /> أنشطة زراعية وحيوانية ملحقة (العسل / الثروة
                        السمكية / الدواجن)
                      </div>
                      <RikazSection
                        mode="agri-extras"
                        currency={currencyName}
                        onTradeBaseChange={setAgriTradeBase}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* الأنعام */}
                <AccordionItem
                  id="section-livestock"
                  value="livestock"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
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
                              <Label className="text-sm font-semibold">
                                هل هذه الأنعام مُعدّة للتجارة (للبيع)؟
                              </Label>
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      aria-label="متى تُعدّ الأنعام للتجارة؟"
                                    >
                                      <HelpCircle className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    className="max-w-xs text-right leading-relaxed bg-card text-card-foreground border shadow-lg"
                                  >
                                    <div className="space-y-1.5 text-xs">
                                      <p>
                                        <b>متى تُعدّ الأنعام للتجارة؟</b>
                                      </p>
                                      <p>
                                        إذا اقتنيتها بنية <b>البيع والربح</b> (تربية تجارية، مزارع
                                        تسمين، تجارة مواشي) — لا للنسل واللبن والاستهلاك.
                                      </p>
                                      <p>
                                        <b>كيف تُحسب؟</b> تُقوَّم القطيع كاملاً بسعر السوق يوم وجوب
                                        الزكاة، ثم 2.5% × القيمة السوقية الإجمالية، وتُضمّ النتيجة
                                        لقاعدة عروض التجارة في الإجمالي.
                                      </p>
                                      <p className="text-muted-foreground">
                                        المرجع: AAOIFI رقم 35 / قرار المجمع الفقهي رقم 28.
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              إن نعم، تُعامل معاملة <b>عروض التجارة</b> (2.5% من القيمة السوقية)
                              وتُضمّ تلقائياً لقاعدة عروض التجارة — ولا تُحسب عيناً منعاً للازدواج.
                            </p>
                          </div>
                          <Switch
                            checked={livestockForTrade}
                            onCheckedChange={setLivestockForTrade}
                          />
                        </div>

                        {livestockForTrade ? (
                          <>
                            <Alert className="border-primary/20 bg-primary/5">
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                أدخل القيمة السوقية الإجمالية للقطيع (للبيع) — تُحسب 2.5% وتُضمّ
                                لقاعدة عروض التجارة في الإجمالي.
                              </AlertDescription>
                            </Alert>
                            <NumField
                              label="القيمة السوقية الإجمالية للأنعام (للتجارة)"
                              value={livestockTradeValue}
                              onChange={setLivestockTradeValue}
                              unit={currencyName}
                              hint="بسعر السوق يوم وجوب الزكاة"
                            />
                          </>
                        ) : (
                          <>
                            <Alert className="border-primary/20 bg-primary/5">
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                الأنعام السائمة (للنسل واللبن لا للتجارة) تُزكَّى عيناً (لا قيمتها)،
                                ويُشترط بلوغ النصاب وحولان الحول وسومُها (رعيها) أكثر السنة.
                              </AlertDescription>
                            </Alert>
                            <div className="grid md:grid-cols-3 gap-4">
                              <NumField
                                label="عدد الإبل"
                                value={camels}
                                onChange={setCamels}
                                hint="النصاب: 5"
                              />
                              <NumField
                                label="عدد البقر/الجاموس"
                                value={cows}
                                onChange={setCows}
                                hint="النصاب: 30"
                              />
                              <NumField
                                label="عدد الغنم/المعز"
                                value={sheep}
                                onChange={setSheep}
                                hint="النصاب: 40"
                              />
                            </div>
                            <div className="space-y-2 text-sm">
                              {calc.camelsN > 0 && (
                                <div className="rounded-md bg-muted/50 p-2">
                                  <b>الإبل ({calc.camelsN}):</b> {camelZakat(calc.camelsN)}
                                </div>
                              )}
                              {calc.cowsN > 0 && (
                                <div className="rounded-md bg-muted/50 p-2">
                                  <b>البقر ({calc.cowsN}):</b> {cowZakat(calc.cowsN)}
                                </div>
                              )}
                              {calc.sheepN > 0 && (
                                <div className="rounded-md bg-muted/50 p-2">
                                  <b>الغنم ({calc.sheepN}):</b> {sheepZakat(calc.sheepN)}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* الركاز والمعادن — تبويب مستقل */}
                <AccordionItem
                  id="section-rikaz-metals"
                  value="rikaz-metals"
                  className="border rounded-xl shadow-soft bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <Sprout className="h-5 w-5 text-gold" /> زكاة الركاز والمعادن
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <RikazSection
                      mode="rikaz-metals"
                      currency={currencyName}
                      onTotalChange={setRikazTotal}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* الديون */}
                <DebtsAccordionSection
                  currencyName={currencyName}
                  debtPersonalLoan={debtPersonalLoan}
                  setDebtPersonalLoan={setDebtPersonalLoan}
                  debtBankLoan={debtBankLoan}
                  setDebtBankLoan={setDebtBankLoan}
                  debtConsumerFinance={debtConsumerFinance}
                  setDebtConsumerFinance={setDebtConsumerFinance}
                  debtCarInstall={debtCarInstall}
                  setDebtCarInstall={setDebtCarInstall}
                  debtTradePayable={debtTradePayable}
                  setDebtTradePayable={setDebtTradePayable}
                  debtPurchases={debtPurchases}
                  setDebtPurchases={setDebtPurchases}
                  debtDeferredPolicy={debtDeferredPolicy}
                  setDebtDeferredPolicy={setDebtDeferredPolicy}
                  debtMortgage={debtMortgage}
                  setDebtMortgage={setDebtMortgage}
                  debtMahr={debtMahr}
                  setDebtMahr={setDebtMahr}
                  debtDeferredYearly={debtDeferredYearly}
                  setDebtDeferredYearly={setDebtDeferredYearly}
                  debtAlimony={debtAlimony}
                  setDebtAlimony={setDebtAlimony}
                  expenses={expenses}
                  setExpenses={setExpenses}
                />

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
                          <span className="text-lg font-medium opacity-80 mr-2">
                            {currencyName}
                          </span>
                        </div>
                        <p className="text-xs opacity-80 mt-2">
                          نسبة: {(effectiveRate * 100).toFixed(3)}% — تقويم{" "}
                          {calendarBasis === "hijri" ? "هجري" : "ميلادي"}
                        </p>
                        {prepaid > 0 && (
                          <p className="text-xs opacity-80 mt-1">
                            الإجمالي قبل خصم المعجَّل: <b>{fmt(calc.total)}</b> — مدفوع مقدماً:{" "}
                            <b>{fmt(prepaid)}</b>
                          </p>
                        )}
                        {fitrContribution > 0 && (
                          <p className="text-xs opacity-80 mt-1">
                            🌾 يشمل زكاة الفطر تلقائياً:{" "}
                            <b>
                              {fmt(fitrContribution)} {currencyName}
                            </b>
                          </p>
                        )}
                        {name && (
                          <p className="text-xs opacity-80 mt-1">
                            {name}
                            {profession && ` — ${profession}`}
                          </p>
                        )}
                        {hawl && (
                          <p className="text-xs opacity-80 mt-1">
                            {hawl.hawlComplete
                              ? "✓ اكتمل الحول"
                              : `⏳ الحول لم يكتمل (${hawl.daysRemaining} يوم متبقي)`}
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
                      يجوز تعجيل الزكاة لسنة أو سنتين عند الجمهور إذا بلغ المال النصاب، لحديث: «أنّ
                      النبي ﷺ تعجَّل من العباس صدقة سنتين» (رواه أبو داود والترمذي). المبلغ
                      المُعجَّل يُخصم من الواجب هذا العام.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">المبلغ المعجَّل المدفوع</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prepaidZakat}
                        onChange={(e) => setPrepaidZakat(e.target.value)}
                        dir="ltr"
                        style={{ textAlign: "right" }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">عدد السنوات المعجَّلة</Label>
                      <Input
                        type="number"
                        min="1"
                        max="2"
                        step="1"
                        value={prepaidYears}
                        onChange={(e) => setPrepaidYears(e.target.value)}
                        dir="ltr"
                        style={{ textAlign: "right" }}
                      />
                    </div>
                  </div>
                  {num(prepaidZakat) > 0 && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-xs">
                      <div>
                        الواجب الإجمالي: <b>{cur(calc.total)}</b>
                      </div>
                      <div>
                        المعجَّل: <b>{cur(num(prepaidZakat))}</b> عن <b>{prepaidYears}</b> سنة
                      </div>
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
                  hijri_year: (() => {
                    const d = new Date();
                    return formatHijri(
                      gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate()),
                    );
                  })(),
                  currency: currencyName,
                  total_assets:
                    calc.monetaryGross + calc.totalGoldValue + calc.silverValue + calc.cropsValue,
                  total_liabilities: calc.debts,
                  zakat_base: calc.monetaryBase,
                  zakat_due: calc.total,
                  prepaid_zakat: num(prepaidZakat),
                  net_due: Math.max(0, calc.total - num(prepaidZakat)),
                  snapshot: {
                    calc,
                    prepaidZakat: num(prepaidZakat),
                    prepaidYears: num(prepaidYears),
                    countryCode,
                    currencyName,
                    savedAt: new Date().toISOString(),
                  },
                }}
              />

              {/* === زكاة الفطر التلقائية === */}
              {(() => {
                const today = new Date();
                const h = gregorianToHijri(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  today.getDate(),
                );
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
                          <b> {isRamadan ? "شهر رمضان" : "أواخر شعبان"}</b> ({h.hd}/{h.hm}/{h.hy}
                          هـ). صاع نبوي ≈ {FITR_SAA_KG} كجم من القمح × سعر الكيلو في {country.name}.
                        </AlertDescription>
                      </Alert>
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">إدراج في الإجمالي</Label>
                        <Switch checked={fitrEnabled} onCheckedChange={setFitrEnabled} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">عدد أفراد الأسرة</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={fitrFamilySize}
                          onChange={(e) => setFitrFamilySize(e.target.value)}
                          dir="ltr"
                          style={{ textAlign: "right" }}
                        />
                      </div>
                      <div className="rounded-md bg-background border border-gold/30 p-2 text-xs space-y-0.5">
                        <div>
                          سعر الكيلو المرجعي: <b>{cur(pricePerKg)}</b>
                        </div>
                        <div>
                          إجمالي الوزن: <b>{fmt(persons * FITR_SAA_KG)} كجم</b>
                        </div>
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
                      <Badge variant="outline" className="text-[10px]">
                        AAOIFI 35
                      </Badge>
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
                            [
                              "الزروع والثمار",
                              calc.cropsValue,
                              calc.cropsRate === 0.1 ? "10%" : "5%",
                            ],
                          ] as Array<[string, number, string]>;
                          items
                            .filter((x) => (x[1] as number) > 0)
                            .forEach((it) => {
                              lines.push(`  • ${it[0]} (${it[2]}): ${f(it[1] as number)}`);
                            });
                          const grossMonetary =
                            calc.monetaryGross + calc.totalGoldValue + calc.silverValue;
                          const grossAll = grossMonetary + calc.cropsValue + rikazTotal;
                          lines.push(`  إجمالي قبل الخصم: ${f(grossAll)}`);
                          lines.push("");
                          lines.push(`② الخصومات والديون: −${f(calc.debts)}`);
                          lines.push("");
                          lines.push("③ صافي الأوعية بعد الخصم:");
                          lines.push(`  الوعاء النقدي/المالي: ${f(calc.monetaryBase)}`);
                          lines.push(
                            `  وعاء الذهب والفضة: ${f(calc.totalGoldValue + calc.silverValue)}`,
                          );
                          if (calc.cropsValue > 0)
                            lines.push(`  وعاء الزروع والثمار: ${f(calc.cropsValue)}`);
                          lines.push("");
                          lines.push("④ الزكاة المستحقة:");
                          lines.push(`  زكاة الذهب: ${f(calc.goldZakat)}`);
                          lines.push(`  زكاة الفضة: ${f(calc.silverZakat)}`);
                          lines.push(`  زكاة النقد والاستثمارات (صافي): ${f(calc.monetaryZakat)}`);
                          lines.push(`  زكاة الزروع والثمار: ${f(calc.cropsZakat)}`);
                          if (rikazTotal > 0)
                            lines.push(`  زكاة الركاز والمعادن: ${f(rikazTotal)}`);
                          lines.push(`  الإجمالي: ${f(calc.total)}`);
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
                      {
                        k: "النقد والبنوك والمحافظ",
                        v: calc.cashTotal,
                        rate: "2.5%",
                        section: "cash",
                      },
                      {
                        k: "الأوراق المالية ووثائق التأمين",
                        v: calc.securitiesTotal,
                        rate: "2.5%",
                        section: "securities",
                      },
                      {
                        k: "العملات الرقمية والمحافظ الاستثمارية",
                        v: digitalAssetsTotal,
                        rate: "2.5%",
                        section: "digital-assets",
                      },
                      {
                        k: "الأوراق التجارية (الكمبيالات)",
                        v: calc.billsTotal,
                        rate: "2.5%",
                        section: "bills",
                      },
                      {
                        k: "عروض التجارة",
                        v: calc.tradeTotal,
                        rate: "2.5%",
                        section: "income-trade-usufruct",
                      },
                      {
                        k: "العقار (تجارة + إيجار مُدّخر)",
                        v: calc.realEstateZakatable,
                        rate: "2.5%",
                        section: "income-trade-usufruct",
                      },
                      {
                        k: "المستغلات والدخل والإيرادات",
                        v: incomeUsufructTotal,
                        rate: "2.5%",
                        section: "income-trade-usufruct",
                      },
                      {
                        k: "الزروع والثمار",
                        v: calc.cropsValue,
                        rate: calc.cropsRate === 0.1 ? "10%" : "5%",
                        section: "crops",
                      },
                      {
                        k: "الركاز والمعادن",
                        v: rikazTotal,
                        rate: "20% / 2.5%",
                        section: "rikaz-metals",
                      },
                    ].filter((x) => x.v > 0);
                    const grossMonetary =
                      calc.monetaryGross + calc.totalGoldValue + calc.silverValue;
                    const grossAll = grossMonetary + calc.cropsValue + rikazTotal;
                    return (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                        <div className="text-xs font-bold text-primary mb-2">
                          ① مكوّنات الوعاء الزكوي (قبل الخصم)
                        </div>
                        {items.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            لا توجد مكوّنات للوعاء حاليّاً
                          </div>
                        )}
                        {items.map((it) => (
                          <div
                            key={it.k}
                            className="text-xs flex justify-between items-center gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => jumpToSection(it.section)}
                              className="text-start hover:text-primary hover:underline underline-offset-2 cursor-pointer"
                              title="فتح التبويب المصدر"
                            >
                              • {it.k}{" "}
                              <span className="text-[10px] text-muted-foreground">({it.rate})</span>
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
                        <span className="text-foreground">
                          قاعدة: <b className="tabular-nums">{cur(calc.tradeTotal)}</b>
                        </span>
                      </div>
                      {num(inventory) > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("income-trade-usufruct")}
                            className="hover:text-primary hover:underline underline-offset-2 text-start"
                          >
                            • البضاعة بسعر السوق
                          </button>
                          <b className="tabular-nums">{cur(num(inventory))}</b>
                        </div>
                      )}
                      {num(receivablesGood) > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("income-trade-usufruct")}
                            className="hover:text-primary hover:underline underline-offset-2 text-start"
                          >
                            • ديون مرجوّة
                          </button>
                          <b className="tabular-nums">{cur(num(receivablesGood))}</b>
                        </div>
                      )}
                      {tradeIsShareholder && num(tradeShareCompanyBase) > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("income-trade-usufruct")}
                            className="hover:text-primary hover:underline underline-offset-2 text-start"
                          >
                            • نصيبك من وعاء الشركة
                          </button>
                          <b className="tabular-nums">
                            {cur(num(tradeShareCompanyBase) * (num(tradeSharePct) / 100))}
                          </b>
                        </div>
                      )}
                      {agriTradeBase > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("crops")}
                            className="hover:text-primary hover:underline underline-offset-2 text-start"
                          >
                            • العسل/الأسماك/الدواجن (ملحقة)
                          </button>
                          <b className="tabular-nums">{cur(agriTradeBase)}</b>
                        </div>
                      )}
                      {livestockForTrade && num(livestockTradeValue) > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("livestock")}
                            className="hover:text-primary hover:underline underline-offset-2 text-start"
                          >
                            • الأنعام للتجارة
                          </button>
                          <b className="tabular-nums">{cur(num(livestockTradeValue))}</b>
                        </div>
                      )}
                      {ecommerceEnabled &&
                        num(ecommerceInventory) +
                          num(ecommerceDigitalProducts) +
                          num(ecommerceServices) +
                          num(ecommerceReceivables) >
                          0 && (
                          <>
                            {num(ecommerceInventory) > 0 && (
                              <div className="text-xs flex justify-between">
                                <button
                                  type="button"
                                  onClick={() => jumpToSection("income-trade-usufruct")}
                                  className="hover:text-primary hover:underline underline-offset-2 text-start"
                                >
                                  • بضاعة المتجر الإلكتروني
                                </button>
                                <b className="tabular-nums">{cur(num(ecommerceInventory))}</b>
                              </div>
                            )}
                            {num(ecommerceDigitalProducts) > 0 && (
                              <div className="text-xs flex justify-between">
                                <button
                                  type="button"
                                  onClick={() => jumpToSection("income-trade-usufruct")}
                                  className="hover:text-primary hover:underline underline-offset-2 text-start"
                                >
                                  • منتجات رقمية
                                </button>
                                <b className="tabular-nums">{cur(num(ecommerceDigitalProducts))}</b>
                              </div>
                            )}
                            {num(ecommerceServices) > 0 && (
                              <div className="text-xs flex justify-between">
                                <button
                                  type="button"
                                  onClick={() => jumpToSection("income-trade-usufruct")}
                                  className="hover:text-primary hover:underline underline-offset-2 text-start"
                                >
                                  • خدمات رقمية مُدّخَرة
                                </button>
                                <b className="tabular-nums">{cur(num(ecommerceServices))}</b>
                              </div>
                            )}
                            {num(ecommerceReceivables) > 0 && (
                              <div className="text-xs flex justify-between">
                                <button
                                  type="button"
                                  onClick={() => jumpToSection("income-trade-usufruct")}
                                  className="hover:text-primary hover:underline underline-offset-2 text-start"
                                >
                                  • مستحقات المتجر
                                </button>
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
                        <button
                          type="button"
                          onClick={() => jumpToSection("debts")}
                          className="text-start hover:underline"
                        >
                          <MinusCircle className="inline h-3.5 w-3.5 ml-1" />② الخصومات والديون
                          والالتزامات
                        </button>
                        <span>
                          الإجمالي: <b className="tabular-nums">−{cur(calc.debts)}</b>
                        </span>
                      </div>
                      {num(debtPersonalLoan) +
                        num(debtBankLoan) +
                        num(debtConsumerFinance) +
                        num(debtCarInstall) +
                        num(debtTradePayable) +
                        num(debtPurchases) >
                        0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("debts")}
                            className="hover:text-destructive hover:underline underline-offset-2 text-start"
                          >
                            • ديون حالّة (قروض/أقساط/مستحقات تجارية)
                          </button>
                          <b className="tabular-nums">
                            −
                            {cur(
                              num(debtPersonalLoan) +
                                num(debtBankLoan) +
                                num(debtConsumerFinance) +
                                num(debtCarInstall) +
                                num(debtTradePayable) +
                                num(debtPurchases),
                            )}
                          </b>
                        </div>
                      )}
                      {debtDeferredPolicy !== "none" &&
                        num(debtDeferredYearly) +
                          (debtDeferredPolicy === "full" ? num(debtMortgage) + num(debtMahr) : 0) >
                          0 && (
                          <div className="text-xs flex justify-between">
                            <button
                              type="button"
                              onClick={() => jumpToSection("debts")}
                              className="hover:text-destructive hover:underline underline-offset-2 text-start"
                            >
                              • ديون مؤجلة (حسب السياسة:{" "}
                              {debtDeferredPolicy === "full" ? "كامل" : "قسط السنة"})
                            </button>
                            <b className="tabular-nums">
                              −
                              {cur(
                                debtDeferredPolicy === "yearly"
                                  ? num(debtDeferredYearly)
                                  : num(debtMortgage) + num(debtMahr) || num(debtDeferredYearly),
                              )}
                            </b>
                          </div>
                        )}
                      {num(debtAlimony) > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("debts")}
                            className="hover:text-destructive hover:underline underline-offset-2 text-start"
                          >
                            • نفقة واجبة (ديناً)
                          </button>
                          <b className="tabular-nums">−{cur(num(debtAlimony))}</b>
                        </div>
                      )}
                      {num(expenses) > 0 && (
                        <div className="text-xs flex justify-between">
                          <button
                            type="button"
                            onClick={() => jumpToSection("debts")}
                            className="hover:text-destructive hover:underline underline-offset-2 text-start"
                          >
                            • نفقات ضرورية مستحقة
                          </button>
                          <b className="tabular-nums">−{cur(num(expenses))}</b>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-destructive/20">
                        تُخصم الديون من الوعاء النقدي/المالي فقط — لا تُخصم من زكاة الزروع ولا
                        الأنعام عيناً.
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
                      calc.cashTotal +
                      calc.securitiesTotal +
                      digitalAssetsTotal +
                      calc.billsTotal +
                      calc.tradeTotal +
                      calc.realEstateZakatable +
                      incomeUsufructTotal;
                    const diff = Math.abs(sumMonetary - calc.monetaryGross);
                    const matches = diff < 0.5;
                    const netExpected = Math.max(0, sumMonetary - calc.debts);
                    const netDiff = Math.abs(netExpected - calc.monetaryBase);
                    const debtOnce = netDiff < 0.5;
                    const ok = matches && debtOnce;
                    return (
                      <div
                        className={`rounded-lg border p-3 text-xs ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          {ok ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          )}
                          التحقق التلقائي للوعاء والخصومات
                        </div>
                        <div className="flex justify-between">
                          <span>مجموع التبويبات النقدية/المالية</span>
                          <b className="tabular-nums">{cur(sumMonetary)}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>الإجمالي المُحتسَب (monetaryGross)</span>
                          <b className="tabular-nums">{cur(calc.monetaryGross)}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>الفرق</span>
                          <b
                            className={`tabular-nums ${matches ? "text-emerald-600" : "text-amber-700"}`}
                          >
                            {matches ? "مُطابق ✓" : cur(diff)}
                          </b>
                        </div>
                        <Separator className="my-1.5" />
                        <div className="flex justify-between">
                          <span>الصافي المتوقّع بعد خصم الديون مرة واحدة</span>
                          <b className="tabular-nums">{cur(netExpected)}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>الصافي الفعلي (monetaryBase)</span>
                          <b className="tabular-nums">{cur(calc.monetaryBase)}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>الفرق</span>
                          <b
                            className={`tabular-nums ${debtOnce ? "text-emerald-600" : "text-amber-700"}`}
                          >
                            {debtOnce ? "خُصمت مرة واحدة ✓" : cur(netDiff)}
                          </b>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ④ صافي الوعاء بعد الخصم */}
                  <div className="rounded-lg border border-primary/30 bg-card p-3 space-y-1">
                    <div className="text-xs font-bold text-primary mb-1">
                      ③ صافي الأوعية بعد الخصم
                    </div>
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
                    const incomeTradeGross =
                      calc.tradeTotal + calc.realEstateZakatable + incomeUsufructTotal;
                    // معامل توزيع خصم الديون على الأوعية النقدية/المالية بنسبة كل وعاء من الإجمالي
                    const distRate =
                      calc.monetaryEligible && calc.monetaryGross > 0
                        ? calc.monetaryZakat / calc.monetaryGross
                        : 0;
                    const z = (g: number) => g * distRate;
                    return (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                        <div className="text-xs font-bold text-primary mb-1">
                          ④ الزكاة المستحقة على كل وعاء
                        </div>
                        <SectionResult
                          format={cur}
                          label="زكاة الذهب"
                          value={calc.goldZakat}
                          eligible={calc.goldEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الفضة"
                          value={calc.silverZakat}
                          eligible={calc.silverEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الأوراق النقدية والحسابات والبطاقات والمحافظ البنكية"
                          value={z(calc.cashTotal)}
                          eligible={calc.monetaryEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الأوراق المالية (الأسهم والسندات والصكوك) ووثائق التأمين"
                          value={z(calc.securitiesTotal)}
                          eligible={calc.monetaryEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الأوراق التجارية"
                          value={z(calc.billsTotal)}
                          eligible={calc.monetaryEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الأصول الرقمية والمحافظ الاستثمارية"
                          value={z(digitalAssetsTotal)}
                          eligible={calc.monetaryEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الدخل وعروض التجارة والمستغلات والإيرادات"
                          value={z(incomeTradeGross)}
                          eligible={calc.monetaryEligible}
                        />
                        <SectionResult
                          format={cur}
                          label="زكاة الزروع والثمار"
                          value={calc.cropsZakat}
                          eligible={calc.cropsEligible}
                        />
                        {ownsLivestock &&
                          !livestockForTrade &&
                          (calc.camelsN > 0 || calc.cowsN > 0 || calc.sheepN > 0) && (
                            <div className="text-xs text-muted-foreground pt-1 border-t border-primary/10">
                              <b className="text-primary">زكاة الأنعام:</b> تُؤدَّى عيناً (تفاصيلها
                              أدناه)
                            </div>
                          )}
                        <SectionResult
                          format={cur}
                          label="زكاة الركاز والمعادن"
                          value={rikazTotal}
                          eligible={rikazTotal > 0}
                        />
                        {rikazTotal === 0 && (
                          <div className="text-[11px] text-muted-foreground -mt-1 leading-relaxed">
                            <b className="text-primary">زكاة الركاز والمعادن:</b> تُحسب داخل قسم
                            «زكاة الركاز والمعادن» (الركاز 20% — المعادن 2.5%)
                          </div>
                        )}

                        {calc.debts > 0 && (
                          <div className="text-[10px] text-muted-foreground pt-1">
                            * تم توزيع خصم الديون ({cur(calc.debts)}) على الأوعية النقدية/المالية
                            بنسبة كل وعاء.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {ownsLivestock &&
                    !livestockForTrade &&
                    (calc.camelsN > 0 || calc.cowsN > 0 || calc.sheepN > 0) && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                        <div className="text-xs font-bold text-primary">
                          زكاة الأنعام (تُؤدّى عيناً لا قيمةً):
                        </div>
                        {calc.camelsN > 0 && (
                          <div className="text-xs">
                            • الإبل ({calc.camelsN}): <b>{camelZakat(calc.camelsN)}</b>
                          </div>
                        )}
                        {calc.cowsN > 0 && (
                          <div className="text-xs">
                            • البقر ({calc.cowsN}): <b>{cowZakat(calc.cowsN)}</b>
                          </div>
                        )}
                        {calc.sheepN > 0 && (
                          <div className="text-xs">
                            • الغنم ({calc.sheepN}): <b>{sheepZakat(calc.sheepN)}</b>
                          </div>
                        )}
                      </div>
                    )}

                  {fitrContribution > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <SectionResult
                        format={cur}
                        label="🌾 زكاة الفطر (تلقائي — رمضان)"
                        value={fitrContribution}
                      />
                    </div>
                  )}

                  {calc.hawlBlocks && (
                    <Alert className="border-destructive/40 bg-destructive/5 mt-2">
                      <AlertDescription className="text-xs">
                        لم يكتمل الحول — تم إيقاف حساب زكاة الذهب والنقد. ستظهر تلقائيًا عند اكتمال
                        354 يومًا هجريًا.
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
                  {/* تصدير التقرير مع بيان الخصومات وأسعار الصرف وبادج QR */}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      const deductions = buildDeductionsList();
                      const fxInfo = buildFxPayload();
                      downloadZakatPdf(
                        {
                          ...buildBaseReportData(),
                          deductions,
                          fx: fxInfo,
                        },
                        `zakat-${name || "report"}-${new Date().toISOString().slice(0, 10)}.pdf`,
                      );
                    }}
                  >
                    <FileText className="h-4 w-4 ml-2" />
                    تحميل التقرير PDF
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      const deductions = buildDeductionsList();
                      const fxInfo = buildFxPayload();
                      downloadReportExcel(
                        {
                          ...buildBaseReportData(),
                          deductions,
                          fx: fxInfo,
                        },
                        `zakat-${name || "report"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
                      );
                    }}
                  >
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
          <IndividualAuditTab
            accountantName={accountantName}
            setAccountantName={setAccountantName}
            accountantLicense={accountantLicense}
            setAccountantLicense={setAccountantLicense}
            accountantPreamble={accountantPreamble}
            setAccountantPreamble={setAccountantPreamble}
            accountantOpinion={accountantOpinion}
            setAccountantOpinion={setAccountantOpinion}
            opinionType={opinionType}
            setOpinionType={setOpinionType}
            previousYearZakat={previousYearZakat}
            setPreviousYearZakat={setPreviousYearZakat}
            includeAuditReport={includeAuditReport}
            setIncludeAuditReport={setIncludeAuditReport}
            auditLoading={auditLoading}
            auditEntries={auditEntries}
            calc={calc}
            cur={cur}
            currencyName={currencyName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
