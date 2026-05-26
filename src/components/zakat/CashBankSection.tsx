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
import { Info, RefreshCw, Wallet, Smartphone, CreditCard, Building2, PiggyBank, Banknote } from "lucide-react";
import { COUNTRY_PRICES, currency as fmtCurrency, num } from "@/lib/zakat";
import bankCardsImg from "@/assets/bank-cards.png";

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

  // ج) الحسابات الجارية
  const [currType, setCurrType] = useState<BankType>("islamic");
  const [currBalance, setCurrBalance] = useState("");
  const [currOpenedAt, setCurrOpenedAt] = useState("");
  const [currBranch, setCurrBranch] = useState("");

  // د) التوفير والادخار
  const [savType, setSavType] = useState<BankType>("islamic");
  const [savBalance, setSavBalance] = useState("");
  const [savPurifyPct, setSavPurifyPct] = useState(""); // نسبة التطهير للإسلامي (لخفض الوعاء)
  const [savOpenedAt, setSavOpenedAt] = useState("");
  const [savBranch, setSavBranch] = useState("");

  // ودائع وشهادات وبريد
  const [depType, setDepType] = useState<BankType>("traditional");
  const [depBranch, setDepBranch] = useState("");
  const [depOpenedAt, setDepOpenedAt] = useState("");
  const [depPrincipal, setDepPrincipal] = useState(""); // أصل الوديعة
  const [certPrincipal, setCertPrincipal] = useState(""); // أصل الشهادات
  const [postSavings, setPostSavings] = useState(""); // دفتر توفير البريد (الرصيد الحالي)
  const [postPrincipal, setPostPrincipal] = useState(""); // أصل المبلغ عند الإيداع

  // هـ) البطاقات البنكية
  const [cardPrepaid, setCardPrepaid] = useState("");
  const [creditCardDue, setCreditCardDue] = useState("");

  // و) المحافظ الرقمية — محافظ شركات الاتصالات
  type WalletRow = { id: number; provider: string; amount: string; linked: "linked" | "standalone"; linkedBank?: string };
  const [telcoWallets, setTelcoWallets] = useState<WalletRow[]>([
    { id: 1, provider: "vodafone", amount: "", linked: "standalone" },
  ]);
  // ز) المحافظ البنكية (Meeza / Apple Pay / Google Pay / Samsung Pay / محافظ البنوك)
  const [bankWallets, setBankWallets] = useState<WalletRow[]>([
    { id: 1, provider: "meeza", amount: "", linked: "linked" },
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

  // ========= الحسابات =========
  const totals = useMemo(() => {
    const tCash = num(cashHome);
    const tFx = fxRows.reduce((s, r) => s + num(r.amount) * num(r.rate), 0);

    // الحساب الجاري: للإسلامي الرصيد كاملاً، للتقليدي الأصل فقط (يُدخل في نفس الحقل)
    const tCurr = num(currBalance);

    // التوفير: للإسلامي = الرصيد − نسبة التطهير، للتقليدي = الأصل فقط
    const savBal = num(savBalance);
    const tSav = savType === "islamic"
      ? Math.max(0, savBal * (1 - num(savPurifyPct) / 100))
      : savBal;

    // الودائع والشهادات: الأصل فقط للتقليدي، للإسلامي الرصيد المُسجَّل
    const tDep = num(depPrincipal) + num(certPrincipal);
    // البريد: نزكِّي أصل المبلغ عند الإيداع (دون الفوائد الربوية)
    const tPost = num(postPrincipal) || num(postSavings);

    // البطاقات: المقدم والمدخر + (نخصم المدفوع المقترح من إجمالي البطاقات الائتمانية كَدَين)
    const tCards = num(cardPrepaid);
    const tCreditDue = num(creditCardDue); // يُخصم كَدَين

    // المحافظ الرقمية: تُزكَّى كنقد. المحافظ المربوطة ببنك تُستثنى لتفادي التكرار.
    const sumWallets = (rows: WalletRow[]) => rows.reduce((s, w) => s + (w.linked === "linked" ? 0 : num(w.amount)), 0);
    const tTelco = sumWallets(telcoWallets);
    const tBankWal = sumWallets(bankWallets);
    const tWallets = tTelco + tBankWal;

    const gross = tCash + tFx + tCurr + tSav + tDep + tPost + tCards + tWallets;
    const debts = tCreditDue;
    const zakatable = Math.max(0, gross - debts);
    return { tCash, tFx, tCurr, tSav, tDep, tPost, tCards, tCreditDue, tTelco, tBankWal, tWallets, gross, zakatable };
  }, [
    cashHome, fxRows, currBalance, savBalance, savPurifyPct, savType,
    depPrincipal, certPrincipal, postPrincipal, postSavings,
    cardPrepaid, creditCardDue, telcoWallets, bankWallets,
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
          {currType === "islamic" && (
            <div className="space-y-1.5">
              <Label className="text-xs">فرع البنك الإسلامي</Label>
              <Input value={currBranch} onChange={(e) => setCurrBranch(e.target.value)} placeholder="مثال: فيصل / البركة / ADIB" />
            </div>
          )}
        </div>
        {currType === "traditional" && (
          <Alert className="border-info/30 bg-info/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              البنك التقليدي: أدرج <b>أصل المبلغ فقط</b> بدون الفوائد الربوية — الفوائد يُتخلَّص منها في وجوه الخير.
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
          {savType === "islamic" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">فرع البنك الإسلامي</Label>
              <Input value={savBranch} onChange={(e) => setSavBranch(e.target.value)} placeholder="فيصل / البركة / ADIB / KFH ..." />
            </div>
          )}
        </div>
      </div>

      {/* ودائع وشهادات وبريد */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Banknote className="h-4 w-4" /> ودائع وشهادات وبريد
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
            <Label className="text-xs">تاريخ فتح الحساب / الوديعة</Label>
            <Input type="date" value={depOpenedAt} onChange={(e) => setDepOpenedAt(e.target.value)} />
          </div>
          {depType === "islamic" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">فرع البنك الإسلامي</Label>
              <Input value={depBranch} onChange={(e) => setDepBranch(e.target.value)} placeholder="فيصل / البركة / ADIB / KFH ..." />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">أصل الودائع</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={depPrincipal} onChange={(e) => setDepPrincipal(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">أصل الشهادات</Label>
            <div className="relative">
              <Input type="number" min="0" step="0.01" value={certPrincipal} onChange={(e) => setCertPrincipal(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="rounded-md border border-dashed p-3 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground">دفتر توفير البريد</div>
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
      </div>

      {/* هـ) البطاقات البنكية */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <CreditCard className="h-4 w-4" /> هـ · البطاقات البنكية
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">بطاقات Debit / Prepaid (الرصيد المتاح)</Label>
              <div className="relative">
                <Input type="number" min="0" step="0.01" value={cardPrepaid} onChange={(e) => setCardPrepaid(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currencyName}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رصيد بطاقة ائتمان مقترح سداده (يُخصم كَدَين)</Label>
              <div className="relative">
                <Input type="number" min="0" step="0.01" value={creditCardDue} onChange={(e) => setCreditCardDue(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className="pl-14" placeholder="0" />
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

      {/* و) المحافظ الرقمية */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Smartphone className="h-4 w-4" /> و · المحافظ الرقمية
        </div>
        <p className="text-xs text-muted-foreground">
          إن كانت المحفظة <b>مربوطة بحساب بنكي</b> فالأصل أن تُحتسب ضمن الحساب نفسه لتفادي التكرار.
        </p>
        <div className="space-y-2">
          {walletRows.map((w) => (
            <div key={w.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">نوع المحفظة</Label>
                <Select value={w.provider} onValueChange={(v) => updateWallet(w.id, { provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vodafone">فودافون كاش</SelectItem>
                    <SelectItem value="orange">أورانج كاش</SelectItem>
                    <SelectItem value="etisalat">اتصالات كاش</SelectItem>
                    <SelectItem value="we">e&amp; / WE Pay</SelectItem>
                    <SelectItem value="instapay">إنستاباي</SelectItem>
                    <SelectItem value="other">محفظة أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">الرصيد</Label>
                <div className="relative">
                  <Input type="number" min="0" step="0.01" value={w.amount} onChange={(e) => updateWallet(w.id, { amount: e.target.value })} dir="ltr" style={{ textAlign: "right" }} className="pl-12" placeholder="0" />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{currencyName}</span>
                </div>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">الربط</Label>
                <Select value={w.linked} onValueChange={(v) => updateWallet(w.id, { linked: v as "linked" | "standalone" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standalone">محفظة مستقلة</SelectItem>
                    <SelectItem value="linked">مربوطة بحساب بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => removeWallet(w.id)} disabled={walletRows.length <= 1}>حذف</Button>
              </div>
              {w.linked === "linked" && (
                <div className="col-span-12 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1">
                  ⓘ هذه المحفظة مربوطة بحساب بنكي — تأكَّد من عدم احتساب الرصيد مرتين.
                </div>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addWallet}>+ إضافة محفظة</Button>
        </div>
      </div>

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
          <span className="text-muted-foreground">بطاقات Debit/Prepaid</span><b>{cur(totals.tCards)}</b>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">محافظ رقمية</span><b>{cur(totals.tWallets)}</b>
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
