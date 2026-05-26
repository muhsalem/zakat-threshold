import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Info, RefreshCw, Wallet, Smartphone, CreditCard, Building2, PiggyBank, Banknote, Bitcoin, Award } from "lucide-react";
import { COUNTRY_PRICES, currency as fmtCurrency, num } from "@/lib/zakat";
import bankCardsImg from "@/assets/bank-cards.png";

// ===== قوائم البنوك حسب الدولة (إسلامية مستقلة + تقليدية وفروعها / نوافذها الإسلامية) =====
type TradBank = { v: string; l: string; window: string };
type CountryBanks = { islamic: string[]; traditional: TradBank[] };

const BANKS_BY_COUNTRY: Record<string, CountryBanks> = {
  EG: {
    islamic: [
      "بنك فيصل الإسلامي المصري",
      "بنك البركة مصر",
      "مصرف أبوظبي الإسلامي — ADIB مصر",
      "البنك المصري الخليجي",
    ],
    traditional: [
      { v: "nbe", l: "البنك الأهلي المصري — NBE", window: "كنانة — للمعاملات الإسلامية" },
      { v: "misr", l: "بنك مصر", window: "شعاع — فروع المعاملات الإسلامية" },
      { v: "umb", l: "المصرف المتحد", window: "فروع المعاملات الإسلامية" },
      { v: "cib", l: "البنك التجاري الدولي — CIB", window: "—" },
      { v: "qnb_eg", l: "بنك QNB الأهلي", window: "—" },
      { v: "aaib", l: "البنك العربي الأفريقي الدولي", window: "—" },
      { v: "hsbc_eg", l: "بنك HSBC مصر", window: "—" },
      { v: "banque_du_caire", l: "بنك القاهرة", window: "—" },
    ],
  },
  SA: {
    islamic: ["مصرف الراجحي", "بنك البلاد", "بنك الجزيرة", "مصرف الإنماء"],
    traditional: [
      { v: "snb", l: "البنك الأهلي السعودي — SNB", window: "الأهلي إسلامي" },
      { v: "riyad", l: "بنك الرياض", window: "نافذة إسلامية" },
      { v: "sabb", l: "البنك السعودي البريطاني — SABB", window: "أمانة" },
      { v: "anb", l: "البنك العربي الوطني — ANB", window: "تيسير الإسلامية" },
      { v: "bsf", l: "البنك السعودي الفرنسي", window: "كنوز الإسلامي" },
    ],
  },
  AE: {
    islamic: [
      "بنك دبي الإسلامي",
      "مصرف أبوظبي الإسلامي — ADIB",
      "مصرف الإمارات الإسلامي",
      "مصرف الشارقة الإسلامي",
      "مصرف عجمان",
    ],
    traditional: [
      { v: "fab", l: "بنك أبوظبي الأول — FAB", window: "FAB Islamic" },
      { v: "enbd", l: "بنك الإمارات دبي الوطني — ENBD", window: "Emirates Islamic" },
      { v: "adcb", l: "بنك أبوظبي التجاري — ADCB", window: "ADCB Islamic" },
      { v: "mashreq", l: "بنك المشرق", window: "المشرق الإسلامي" },
      { v: "hsbc_ae", l: "HSBC الإمارات", window: "Amanah — أمانة" },
    ],
  },
  KW: {
    islamic: ["بيت التمويل الكويتي — KFH", "بنك بوبيان", "بنك وربة", "بنك الكويت الدولي — KIB"],
    traditional: [
      { v: "nbk", l: "بنك الكويت الوطني — NBK", window: "—" },
      { v: "gbk", l: "بنك الخليج", window: "—" },
      { v: "cbk", l: "البنك التجاري الكويتي", window: "—" },
      { v: "burgan", l: "بنك برقان", window: "—" },
    ],
  },
  QA: {
    islamic: [
      "مصرف قطر الإسلامي — QIB",
      "بنك دخان",
      "مصرف الريان",
      "البنك الإسلامي القطري الدولي — QIIB",
    ],
    traditional: [
      { v: "qnb", l: "بنك قطر الوطني — QNB", window: "QNB First Islamic" },
      { v: "cbq", l: "البنك التجاري — CBQ", window: "—" },
      { v: "doha", l: "بنك الدوحة", window: "—" },
    ],
  },
  BH: {
    islamic: [
      "بنك البحرين الإسلامي — BisB",
      "بيت التمويل الخليجي — GFH",
      "بنك السلام البحرين",
      "بنك الإثمار",
      "مصرف الخير",
    ],
    traditional: [
      { v: "aub_bh", l: "البنك الأهلي المتحد — AUB", window: "—" },
      { v: "nbb", l: "بنك البحرين الوطني — NBB", window: "—" },
      { v: "bbk", l: "بنك البحرين والكويت — BBK", window: "—" },
    ],
  },
  OM: {
    islamic: ["بنك نزوى", "بنك العز الإسلامي"],
    traditional: [
      { v: "muscat", l: "بنك مسقط", window: "ميثاق" },
      { v: "sohar", l: "بنك صحار الدولي", window: "صحار الإسلامي" },
      { v: "dhofar", l: "بنك ظفار", window: "مزن" },
      { v: "nbo", l: "البنك الوطني العماني", window: "المزن" },
    ],
  },
  JO: {
    islamic: [
      "البنك الإسلامي الأردني",
      "البنك العربي الإسلامي الدولي",
      "بنك صفوة الإسلامي",
    ],
    traditional: [
      { v: "arab", l: "البنك العربي", window: "—" },
      { v: "housing", l: "بنك الإسكان", window: "إسكان إسلامي" },
      { v: "cab", l: "البنك التجاري الأردني", window: "—" },
    ],
  },
  PS: {
    islamic: ["البنك الإسلامي الفلسطيني", "البنك الإسلامي العربي"],
    traditional: [
      { v: "bop", l: "بنك فلسطين", window: "—" },
      { v: "tnb", l: "البنك الوطني — TNB", window: "—" },
    ],
  },
  TR: {
    islamic: ["كويت ترك", "البركة تركيا", "ضمان تركيا", "زراعت بنك مشاركة"],
    traditional: [
      { v: "ziraat", l: "زراعت بنكاسي", window: "زراعت كاتيليم" },
      { v: "isbank", l: "İş Bankası", window: "—" },
      { v: "garanti", l: "Garanti BBVA", window: "—" },
    ],
  },
};

function getCountryBanks(code: string): CountryBanks {
  const data = BANKS_BY_COUNTRY[code];
  const fallback: CountryBanks = {
    islamic: ["بنك إسلامي محلي", "أخرى"],
    traditional: [{ v: "other", l: "بنك تقليدي محلي", window: "—" }],
  };
  if (!data) return fallback;
  return {
    islamic: [...data.islamic, "أخرى"],
    traditional: [...data.traditional, { v: "other", l: "بنك تقليدي آخر", window: "—" }],
  };
}

type BankType = "islamic" | "traditional";

interface Props {
  countryCode: string;
  currencyName: string;
  onTotalChange: (zakatableTotal: number) => void;
}

// نشتق سعر صرف العملة الأجنبية مقابل عملة الدولة عبر سعر الذهب عيار 24
// rate(local per foreign) = country.gold24 / foreignCountry.gold24
function deriveRate(localGold24: number, foreignGold24: number): number {
  if (!localGold24 || !foreignGold24) return 0;
  return localGold24 / foreignGold24;
}

export function CashBankSection({ countryCode, currencyName, onTotalChange }: Props) {
  const country = COUNTRY_PRICES.find((c) => c.code === countryCode) ?? COUNTRY_PRICES[0];

  // أ) فلوس كاش ومدخرات
  const [cashHome, setCashHome] = useState("");

  // ب) العملات الأجنبية (متعددة)
  type FxRow = { id: number; code: string; amount: string; rate: string };
  const [fxRows, setFxRows] = useState<FxRow[]>([
    { id: 1, code: "US", amount: "", rate: "" },
  ]);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string>(new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }));

  const refreshFxRates = () => {
    setFxRows((rows) => rows.map((r) => {
      const fc = COUNTRY_PRICES.find((c) => c.code === r.code);
      if (!fc) return r;
      const rate = deriveRate(country.gold24, fc.gold24);
      return { ...r, rate: rate ? rate.toFixed(4) : "" };
    }));
    setFxUpdatedAt(new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }));
  };
  // تحديث الأسعار تلقائياً عند تغيير الدولة المختارة
  useEffect(() => { refreshFxRates(); /* eslint-disable-next-line */ }, [countryCode]);

  // قائمة بنوك الدولة (تتغيّر مع الدولة)
  const countryBanks = useMemo(() => getCountryBanks(country.code), [country.code]);

  // ج) الحسابات الجارية
  const [currType, setCurrType] = useState<BankType>("islamic");
  const [currBalance, setCurrBalance] = useState("");
  const [currOpenedAt, setCurrOpenedAt] = useState("");
  const [currBranch, setCurrBranch] = useState("");
  const [currIslamicBank, setCurrIslamicBank] = useState("");
  const [currTradBank, setCurrTradBank] = useState("");
  const [currUseWindow, setCurrUseWindow] = useState(false); // نافذة إسلامية داخل بنك تقليدي

  // د) التوفير والادخار
  const [savType, setSavType] = useState<BankType>("islamic");
  const [savBalance, setSavBalance] = useState("");
  const [savPurifyPct, setSavPurifyPct] = useState(""); // نسبة التطهير للإسلامي (لخفض الوعاء)
  const [savOpenedAt, setSavOpenedAt] = useState("");
  const [savBranch, setSavBranch] = useState("");
  const [savIslamicBank, setSavIslamicBank] = useState("");
  const [savTradBank, setSavTradBank] = useState("");
  const [savUseWindow, setSavUseWindow] = useState(false);

  // ودائع (مفصولة عن الشهادات)
  const [depType, setDepType] = useState<BankType>("traditional");
  const [depBranch, setDepBranch] = useState("");
  const [depOpenedAt, setDepOpenedAt] = useState("");
  const [depPrincipal, setDepPrincipal] = useState(""); // أصل الوديعة
  const [depIslamicBank, setDepIslamicBank] = useState("");
  const [depTradBank, setDepTradBank] = useState("");

  // شهادات (قسم مستقل)
  const [certType, setCertType] = useState<BankType>("traditional");
  const [certBranch, setCertBranch] = useState("");
  const [certOpenedAt, setCertOpenedAt] = useState("");
  const [certPrincipal, setCertPrincipal] = useState(""); // أصل الشهادات
  const [certIslamicBank, setCertIslamicBank] = useState("");
  const [certTradBank, setCertTradBank] = useState("");

  // عند تغيير الدولة → اضبط الاختيارات الافتراضية على بنوك الدولة
  useEffect(() => {
    const ib = countryBanks.islamic[0] ?? "";
    const tb = countryBanks.traditional[0]?.v ?? "";
    const isInIslamic = (v: string) => countryBanks.islamic.includes(v);
    const isInTrad = (v: string) => countryBanks.traditional.some((b) => b.v === v);
    if (!isInIslamic(currIslamicBank)) setCurrIslamicBank(ib);
    if (!isInTrad(currTradBank)) setCurrTradBank(tb);
    if (!isInIslamic(savIslamicBank)) setSavIslamicBank(ib);
    if (!isInTrad(savTradBank)) setSavTradBank(tb);
    if (!isInIslamic(depIslamicBank)) setDepIslamicBank(ib);
    if (!isInTrad(depTradBank)) setDepTradBank(tb);
    if (!isInIslamic(certIslamicBank)) setCertIslamicBank(ib);
    if (!isInTrad(certTradBank)) setCertTradBank(tb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryBanks]);

  // دفتر توفير البريد
  const [postSavings, setPostSavings] = useState("");
  const [postPrincipal, setPostPrincipal] = useState("");

  // هـ) البطاقات البنكية
  const [cardPrepaid, setCardPrepaid] = useState("");
  const [creditCardDue, setCreditCardDue] = useState("");

  // و) المحافظ الرقمية — محافظ شركات الاتصالات
  type WalletRow = { id: number; provider: string; amount: string; linked: "linked" | "standalone"; linkedBank?: string };
  const [telcoWallets, setTelcoWallets] = useState<WalletRow[]>([
    { id: 1, provider: "vodafone", amount: "", linked: "standalone" },
  ]);
  // ز) المحافظ البنكية
  const [bankWallets, setBankWallets] = useState<WalletRow[]>([
    { id: 1, provider: "meeza", amount: "", linked: "linked" },
  ]);
  // ح) محافظ العملات المشفّرة (Crypto)
  const [cryptoWallets, setCryptoWallets] = useState<WalletRow[]>([
    { id: 1, provider: "btc", amount: "", linked: "standalone" },
  ]);

  const addFx = () =>
    setFxRows((r) => [...r, { id: Date.now(), code: "US", amount: "", rate: "" }]);
  const removeFx = (id: number) => setFxRows((r) => r.filter((x) => x.id !== id));
  const updateFx = (id: number, patch: Partial<FxRow>) =>
    setFxRows((rows) => rows.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.code !== undefined) {
        const fc = COUNTRY_PRICES.find((c) => c.code === patch.code);
        if (fc) next.rate = deriveRate(country.gold24, fc.gold24).toFixed(4);
      }
      return next;
    }));

  const makeWalletOps = (setter: React.Dispatch<React.SetStateAction<WalletRow[]>>, defaultProvider: string) => ({
    add: () => setter((r) => [...r, { id: Date.now(), provider: defaultProvider, amount: "", linked: "standalone" }]),
    remove: (id: number) => setter((r) => r.filter((x) => x.id !== id)),
    update: (id: number, patch: Partial<WalletRow>) =>
      setter((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r))),
  });
  const telcoOps = makeWalletOps(setTelcoWallets, "vodafone");
  const bankOps = makeWalletOps(setBankWallets, "meeza");
  const cryptoOps = makeWalletOps(setCryptoWallets, "btc");

  // ========= الحسابات =========
  const totals = useMemo(() => {
    const tCash = num(cashHome);
    const tFx = fxRows.reduce((s, r) => s + num(r.amount) * num(r.rate), 0);
    const tCurr = num(currBalance);
    const savBal = num(savBalance);
    const tSav = savType === "islamic"
      ? Math.max(0, savBal * (1 - num(savPurifyPct) / 100))
      : savBal;
    const tDep = num(depPrincipal);
    const tCert = num(certPrincipal);
    const tPost = num(postPrincipal) || num(postSavings);
    const tCards = num(cardPrepaid);
    const tCreditDue = num(creditCardDue);
    const sumWallets = (rows: WalletRow[]) => rows.reduce((s, w) => s + (w.linked === "linked" ? 0 : num(w.amount)), 0);
    const tTelco = sumWallets(telcoWallets);
    const tBankWal = sumWallets(bankWallets);
    const tCrypto = cryptoWallets.reduce((s, w) => s + num(w.amount), 0); // العملات المشفرة تُزكَّى دائماً كنقد
    const tWallets = tTelco + tBankWal + tCrypto;

    const gross = tCash + tFx + tCurr + tSav + tDep + tCert + tPost + tCards + tWallets;
    const debts = tCreditDue;
    const zakatable = Math.max(0, gross - debts);
    return { tCash, tFx, tCurr, tSav, tDep, tCert, tPost, tCards, tCreditDue, tTelco, tBankWal, tCrypto, tWallets, gross, zakatable };
  }, [
    cashHome, fxRows, currBalance, savBalance, savPurifyPct, savType,
    depPrincipal, certPrincipal, postPrincipal, postSavings,
    cardPrepaid, creditCardDue, telcoWallets, bankWallets, cryptoWallets,
  ]);

  useEffect(() => { onTotalChange(totals.zakatable); }, [totals.zakatable, onTotalChange]);

  const cur = (n: number) => fmtCurrency(n, currencyName);

  return (
    <div className="space-y-6">
      {/* أ) كاش ومدخرات */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Wallet className="h-4 w-4" /> أ · فلوس كاش ومدخرات
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">نقد في اليد والخزنة المنزلية</Label>
          <div className="relative">
            <Input type="number" min="0" step="0.01" value={cashHome} onChange={(e) => setCashHome(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
          </div>
        </div>
      </div>

      {/* ب) العملات الأجنبية */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Banknote className="h-4 w-4" /> ب · العملات الأجنبية
          </div>
          <Button type="button" size="sm" variant="outline" onClick={refreshFxRates} className="gap-1">
            <RefreshCw className="h-3 w-3" /> تحديث الأسعار
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          الأسعار تُحتسب تلقائياً مقابل عملة <b>{country.name}</b> ({country.currency}) — آخر تحديث: <b>{fxUpdatedAt}</b>
        </p>
        <div className="space-y-2">
          {fxRows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">العملة</Label>
                <Select value={r.code} onValueChange={(v) => updateFx(r.id, { code: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRY_PRICES.filter((c) => c.code !== country.code).map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.currency} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">المبلغ</Label>
                <Input type="number" min="0" step="0.01" value={r.amount} onChange={(e) => updateFx(r.id, { amount: e.target.value })} dir="ltr" style={{ textAlign: "right" }} placeholder="0" />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">سعر الوحدة ({currencyName})</Label>
                <Input type="number" min="0" step="0.0001" value={r.rate} onChange={(e) => updateFx(r.id, { rate: e.target.value })} dir="ltr" style={{ textAlign: "right" }} />
              </div>
              <div className="col-span-2 flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => removeFx(r.id)} disabled={fxRows.length <= 1}>حذف</Button>
              </div>
              <div className="col-span-12 text-xs text-muted-foreground -mt-1">
                = <b>{cur(num(r.amount) * num(r.rate))}</b>
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addFx}>+ إضافة عملة</Button>
        </div>
      </div>

      {/* ج) الحسابات الجارية */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Building2 className="h-4 w-4" /> ج · الحسابات الجارية
          <Badge variant={currType === "islamic" ? "default" : "secondary"} className="text-[10px]">
            {currType === "islamic" ? "إسلامي" : "تقليدي"}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">نوع البنك</Label>
            <RadioGroup value={currType} onValueChange={(v) => setCurrType(v as BankType)} className="flex gap-3 pt-2">
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="islamic" id="curr-i" /><Label htmlFor="curr-i" className="text-xs cursor-pointer">بنك إسلامي</Label></div>
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="traditional" id="curr-t" /><Label htmlFor="curr-t" className="text-xs cursor-pointer">بنك تقليدي</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{currType === "islamic" ? "رصيد الحساب (الأصل + عائد حلال)" : "أصل المبلغ فقط (بدون الفوائد الربوية)"}</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={currBalance} onChange={(e) => setCurrBalance(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ فتح الحساب</Label>
            <Input type="date" value={currOpenedAt} onChange={(e) => setCurrOpenedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <BankPicker
              type={currType}
              islamicBank={currIslamicBank} setIslamicBank={setCurrIslamicBank}
              tradBank={currTradBank} setTradBank={setCurrTradBank}
              useWindow={currUseWindow} setUseWindow={setCurrUseWindow}
              branch={currBranch} setBranch={setCurrBranch}
              idPrefix="curr"
            />
          </div>
        </div>
        {currType === "traditional" && !currUseWindow && (
          <Alert className="border-info/30 bg-info/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              البنك التقليدي: أدرج <b>أصل المبلغ فقط</b> بدون الفوائد الربوية — الفوائد يُتخلَّص منها في وجوه الخير.
            </AlertDescription>
          </Alert>
        )}
        {currType === "traditional" && currUseWindow && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              نافذة إسلامية داخل بنك تقليدي — تعامل معاملة البنوك الإسلامية: زكاة الرصيد كاملاً مع خصم نسبة التطهير إن وجدت في التقرير الشرعي.
            </AlertDescription>
          </Alert>
        )}
      </div>


      {/* د) التوفير والادخار */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <PiggyBank className="h-4 w-4" /> د · التوفير والادخار
          <Badge variant={savType === "islamic" ? "default" : "secondary"} className="text-[10px]">
            {savType === "islamic" ? "حساب توفير إسلامي" : "حساب توفير تقليدي"}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">نوع البنك</Label>
            <RadioGroup value={savType} onValueChange={(v) => setSavType(v as BankType)} className="flex gap-3 pt-2">
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="islamic" id="sav-i" /><Label htmlFor="sav-i" className="text-xs cursor-pointer">بنك إسلامي</Label></div>
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="traditional" id="sav-t" /><Label htmlFor="sav-t" className="text-xs cursor-pointer">بنك تقليدي</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{savType === "islamic" ? "الرصيد (الأصل + العائد الحلال)" : "أصل المبلغ فقط (بدون الفوائد الربوية)"}</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={savBalance} onChange={(e) => setSavBalance(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
          {savType === "islamic" && (
            <div className="space-y-1.5">
              <Label className="text-xs">نسبة التطهير (من التقرير الشرعي للبنك) %</Label>
              <div className="relative">
                <Input type="number" min="0" max="100" step="0.01" value={savPurifyPct} onChange={(e) => setSavPurifyPct(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-8" placeholder="0" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ فتح الحساب</Label>
            <Input type="date" value={savOpenedAt} onChange={(e) => setSavOpenedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <BankPicker
              type={savType}
              islamicBank={savIslamicBank} setIslamicBank={setSavIslamicBank}
              tradBank={savTradBank} setTradBank={setSavTradBank}
              useWindow={savUseWindow} setUseWindow={setSavUseWindow}
              branch={savBranch} setBranch={setSavBranch}
              idPrefix="sav"
            />
          </div>
        </div>
      </div>


      {/* هـ-١) الودائع */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Banknote className="h-4 w-4" /> هـ-١ · الودائع
          <Badge variant={depType === "islamic" ? "default" : "secondary"} className="text-[10px]">
            {depType === "islamic" ? "إسلامي" : "تقليدي — أصل فقط بدون العائد الربوي"}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">نوع البنك</Label>
            <RadioGroup value={depType} onValueChange={(v) => setDepType(v as BankType)} className="flex gap-3 pt-2">
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="islamic" id="dep-i" /><Label htmlFor="dep-i" className="text-xs cursor-pointer">بنك إسلامي</Label></div>
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="traditional" id="dep-t" /><Label htmlFor="dep-t" className="text-xs cursor-pointer">بنك تقليدي</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ فتح الوديعة</Label>
            <Input type="date" value={depOpenedAt} onChange={(e) => setDepOpenedAt(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <BankPicker
              type={depType}
              islamicBank={depIslamicBank} setIslamicBank={setDepIslamicBank}
              tradBank={depTradBank} setTradBank={setDepTradBank}
              useWindow={false} setUseWindow={() => {}}
              branch={depBranch} setBranch={setDepBranch}
              idPrefix="dep" hideWindow
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">أصل الودائع</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={depPrincipal} onChange={(e) => setDepPrincipal(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* هـ-٢) الشهادات */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Award className="h-4 w-4" /> هـ-٢ · الشهادات الادخارية والاستثمارية
          <Badge variant={certType === "islamic" ? "default" : "secondary"} className="text-[10px]">
            {certType === "islamic" ? "صكوك / شهادات إسلامية" : "تقليدية — أصل فقط"}
          </Badge>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">نوع البنك</Label>
            <RadioGroup value={certType} onValueChange={(v) => setCertType(v as BankType)} className="flex gap-3 pt-2">
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="islamic" id="cert-i" /><Label htmlFor="cert-i" className="text-xs cursor-pointer">بنك إسلامي</Label></div>
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer"><RadioGroupItem value="traditional" id="cert-t" /><Label htmlFor="cert-t" className="text-xs cursor-pointer">بنك تقليدي</Label></div>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ شراء الشهادة</Label>
            <Input type="date" value={certOpenedAt} onChange={(e) => setCertOpenedAt(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <BankPicker
              type={certType}
              islamicBank={certIslamicBank} setIslamicBank={setCertIslamicBank}
              tradBank={certTradBank} setTradBank={setCertTradBank}
              useWindow={false} setUseWindow={() => {}}
              branch={certBranch} setBranch={setCertBranch}
              idPrefix="cert" hideWindow
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">أصل الشهادات (دون العائد الربوي)</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={certPrincipal} onChange={(e) => setCertPrincipal(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* هـ-٣) دفتر توفير البريد */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <PiggyBank className="h-4 w-4" /> هـ-٣ · دفتر توفير البريد
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">رصيد الدفتر الحالي (للعلم)</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={postSavings} onChange={(e) => setPostSavings(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">أصل المبلغ عند الإيداع (يُزكَّى)</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={postPrincipal} onChange={(e) => setPostPrincipal(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          دفتر توفير البريد يُعدّ من المعاملات الربوية — تُزكَّى <b>أصل المبالغ المُودَعة فقط</b> دون الفوائد المتراكمة.
        </p>
      </div>


      {/* هـ) البطاقات البنكية */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <CreditCard className="h-4 w-4" /> هـ · البطاقات البنكية
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">بطاقات Prepaid (الرصيد المتاح)</Label>
              <div className="relative">
                <Input type="number" min="0" step="0.01" value={cardPrepaid} onChange={(e) => setCardPrepaid(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
              </div>
            </div>
          </div>
          <img
            src={bankCardsImg}
            alt="البطاقات البنكية"
            width={180}
            height={120}
            loading="lazy"
            className="rounded-md hidden md:block"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          أسعار الصرف المُدخَلة تقريبية — يُرجى تحديثها من السعر الرسمي يوم إخراج الزكاة.
        </p>
      </div>

      {/* و) محافظ شركات الاتصالات */}
      <WalletGroup
        title="و · محافظ شركات الاتصالات"
        rows={telcoWallets}
        ops={telcoOps}
        currencyName={currencyName}
        providers={[
          { v: "vodafone", l: "فودافون كاش" },
          { v: "orange", l: "أورانج كاش" },
          { v: "etisalat", l: "اتصالات كاش" },
          { v: "we", l: "e& / WE Pay" },
          { v: "stc", l: "STC Pay" },
          { v: "other", l: "محفظة اتصالات أخرى" },
        ]}
        note="محافظ شركات الاتصالات تُزكَّى كنقد. إن كانت مربوطة بحساب بنكي فقد احتُسبت ضمنه — اختَر «مربوطة» لاستثنائها."
      />

      {/* ز) المحافظ البنكية */}
      <WalletGroup
        title="ز · المحافظ البنكية والدفع الإلكتروني"
        rows={bankWallets}
        ops={bankOps}
        currencyName={currencyName}
        providers={[
          { v: "meeza", l: "بطاقة ميزة الرقمية" },
          { v: "instapay", l: "إنستاباي (InstaPay)" },
          { v: "applepay", l: "Apple Pay" },
          { v: "googlepay", l: "Google Pay" },
          { v: "samsungpay", l: "Samsung Pay" },
          { v: "valu", l: "valU / تقسيط رقمي" },
          { v: "bankapp", l: "محفظة تطبيق البنك" },
          { v: "other", l: "محفظة بنكية أخرى" },
        ]}
        note="المحافظ البنكية غالبًا ما تكون مربوطة بحساب جاري — حدِّد «مربوطة» لمنع التكرار المحاسبي."
      />

      {/* ح) محافظ العملات المشفّرة */}
      <WalletGroup
        title="ح · محافظ العملات المشفّرة (Crypto)"
        rows={cryptoWallets}
        ops={cryptoOps}
        currencyName={currencyName}
        providers={[
          { v: "btc", l: "Bitcoin (BTC)" },
          { v: "eth", l: "Ethereum (ETH)" },
          { v: "usdt", l: "Tether (USDT)" },
          { v: "usdc", l: "USD Coin (USDC)" },
          { v: "bnb", l: "Binance Coin (BNB)" },
          { v: "sol", l: "Solana (SOL)" },
          { v: "xrp", l: "XRP" },
          { v: "ada", l: "Cardano (ADA)" },
          { v: "other", l: "عملة مشفّرة أخرى" },
        ]}
        note="العملات المشفّرة تُزكَّى بقيمتها السوقية يوم وجوب الزكاة كنقد. أدخل القيمة المُقوَّمة بعملتك المحلية."
        forceStandalone
      />


      {/* الملخّص */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">كاش ومدخرات</span><b>{cur(totals.tCash)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">عملات أجنبية</span><b>{cur(totals.tFx)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">حسابات جارية</span><b>{cur(totals.tCurr)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">توفير وادخار</span><b>{cur(totals.tSav)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">ودائع وشهادات</span><b>{cur(totals.tDep)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">دفتر توفير البريد</span><b>{cur(totals.tPost)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">بطاقات Prepaid</span><b>{cur(totals.tCards)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">محافظ شركات الاتصالات</span><b>{cur(totals.tTelco)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">محافظ بنكية ودفع إلكتروني</span><b>{cur(totals.tBankWal)}</b>
        </div>
        {totals.tCreditDue > 0 && (
          <div className="flex items-center justify-between text-xs text-destructive">
            <span>− دين بطاقة الائتمان</span><b>−{cur(totals.tCreditDue)}</b>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">إجمالي الوعاء النقدي الزكوي</span>
          <span className="font-bold text-primary">{cur(totals.zakatable)}</span>
        </div>
      </div>
    </div>
  );
}

type WalletRowT = { id: number; provider: string; amount: string; linked: "linked" | "standalone"; linkedBank?: string };
interface WalletOps {
  add: () => void;
  remove: (id: number) => void;
  update: (id: number, patch: Partial<WalletRowT>) => void;
}
function WalletGroup({
  title, rows, ops, currencyName, providers, note, forceStandalone,
}: {
  title: string;
  rows: WalletRowT[];
  ops: WalletOps;
  currencyName: string;
  providers: { v: string; l: string }[];
  note: string;
  forceStandalone?: boolean;
}) {
  void forceStandalone;
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Smartphone className="h-4 w-4" /> {title}
      </div>
      <p className="text-xs text-muted-foreground">{note}</p>
      <div className="space-y-2">
        {rows.map((w) => (
          <div key={w.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <Label className="text-xs">النوع</Label>
              <Select value={w.provider} onValueChange={(v) => ops.update(w.id, { provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">الرصيد</Label>
              <div className="relative">
                <Input type="number" min="0" step="0.01" value={w.amount} onChange={(e) => ops.update(w.id, { amount: e.target.value })} dir="ltr" style={{ textAlign: "right" }} className="pl-12" placeholder="0" />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{currencyName}</span>
              </div>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">الربط بحساب بنكي</Label>
              <Select value={w.linked} onValueChange={(v) => ops.update(w.id, { linked: v as "linked" | "standalone" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">مستقلة — تُزكَّى</SelectItem>
                  <SelectItem value="linked">مربوطة — تُستثنى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => ops.remove(w.id)} disabled={rows.length <= 1}>حذف</Button>
            </div>
            {w.linked === "linked" && (
              <div className="col-span-12">
                <Input value={w.linkedBank ?? ""} onChange={(e) => ops.update(w.id, { linkedBank: e.target.value })} placeholder="اسم البنك المرتبط (للتوثيق)" className="text-xs" />
                <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 mt-1">
                  ⓘ مربوطة بحساب بنكي — لن تُحتسب هنا، تأكَّد من إدراج رصيد البنك في القسم المناسب.
                </div>
              </div>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={ops.add}>+ إضافة</Button>
      </div>
    </div>
  );

}

function BankPicker({
  type, islamicBank, setIslamicBank, tradBank, setTradBank,
  useWindow, setUseWindow, branch, setBranch, idPrefix, hideWindow,
}: {
  type: BankType;
  islamicBank: string;
  setIslamicBank: (v: string) => void;
  tradBank: string;
  setTradBank: (v: string) => void;
  useWindow: boolean;
  setUseWindow: (v: boolean) => void;
  branch: string;
  setBranch: (v: string) => void;
  idPrefix: string;
  hideWindow?: boolean;
}) {
  const selectedTrad = TRADITIONAL_BANKS_WITH_WINDOWS.find((b) => b.v === tradBank);
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {type === "islamic" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">اسم البنك الإسلامي</Label>
          <Select value={islamicBank} onValueChange={setIslamicBank}>
            <SelectTrigger id={`${idPrefix}-ib`}><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {ISLAMIC_BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">اسم البنك التقليدي</Label>
            <Select value={tradBank} onValueChange={setTradBank}>
              <SelectTrigger id={`${idPrefix}-tb`}><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {TRADITIONAL_BANKS_WITH_WINDOWS.map((b) => (
                  <SelectItem key={b.v} value={b.v}>{b.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!hideWindow && (
            <div className="space-y-1.5">
              <Label className="text-xs">النافذة الإسلامية</Label>
              <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <input
                  type="checkbox"
                  id={`${idPrefix}-win`}
                  checked={useWindow}
                  onChange={(e) => setUseWindow(e.target.checked)}
                />
                <Label htmlFor={`${idPrefix}-win`} className="text-xs cursor-pointer">
                  أستخدم النافذة الإسلامية {selectedTrad?.window && selectedTrad.window !== "—" ? `(${selectedTrad.window})` : ""}
                </Label>
              </div>
            </div>
          )}
        </>
      )}
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-xs">الفرع</Label>
        <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="اسم الفرع" />
      </div>
    </div>
  );
}
