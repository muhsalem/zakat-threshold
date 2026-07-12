import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Landmark, Info, Calculator } from "lucide-react";
import { ZAKAT_RATE } from "@/lib/zakat";

/**
 * نموذج زكاة البنوك الإسلامية والمؤسسات المالية الإسلامية الكامل
 * وفق معيار AAOIFI الشرعي 35 والمعيار المحاسبي FAS 9:
 *  - يُزكَّى صافي الموجودات الزكوية (طريقة صافي الموجودات) أو ما يعادلها (رأس المال العامل).
 *  - تُستبعد ودائع أصحاب حسابات الاستثمار (Mudaraba PSIA) لأنها ليست ملكاً للبنك.
 *  - تُزكَّى ذمم المرابحة/الإجارة/الاستصناع المتوقّع تحصيلها.
 *  - تُزكَّى استثمارات المشاركة والمضاربة بحصّة البنك.
 *  - يُستبعد رأس المال المخصّص لدعم صندوق التأمين التكافلي (المشتركين).
 */
export default function IslamicBankModelFull() {
  // موجودات
  const [cashLiquid, setCashLiquid] = useState("");
  const [murabahaReceivables, setMurabahaReceivables] = useState("");
  const [ijaraReceivables, setIjaraReceivables] = useState("");
  const [istisnaReceivables, setIstisnaReceivables] = useState("");
  const [salamGoods, setSalamGoods] = useState("");
  const [tradingInventory, setTradingInventory] = useState("");
  const [sukukTrading, setSukukTrading] = useState("");
  const [equityInvestments, setEquityInvestments] = useState("");
  const [mudarabaShare, setMudarabaShare] = useState("");
  const [musharakaShare, setMusharakaShare] = useState("");
  const [goldSilverInventory, setGoldSilverInventory] = useState("");

  // خصومات (ليست وعاء زكوي)
  const [psia, setPsia] = useState(""); // ودائع أصحاب حسابات الاستثمار
  const [restrictedInvestments, setRestrictedInvestments] = useState(""); // مضاربة مقيّدة
  const [takafulParticipantsFund, setTakafulParticipantsFund] = useState("");
  const [fixedAssetsForUse, setFixedAssetsForUse] = useState("");
  const [doubtfulDebtsProvision, setDoubtfulDebtsProvision] = useState("");
  const [currentPayables, setCurrentPayables] = useState("");

  const num = (v: string) => (v.trim() === "" ? 0 : Math.max(0, parseFloat(v) || 0));

  const calc = useMemo(() => {
    const assets = [
      num(cashLiquid),
      num(murabahaReceivables) - num(doubtfulDebtsProvision),
      num(ijaraReceivables),
      num(istisnaReceivables),
      num(salamGoods),
      num(tradingInventory),
      num(sukukTrading),
      num(equityInvestments),
      num(mudarabaShare),
      num(musharakaShare),
      num(goldSilverInventory),
    ].reduce((a, b) => a + b, 0);

    const deductions =
      num(psia) +
      num(restrictedInvestments) +
      num(takafulParticipantsFund) +
      num(fixedAssetsForUse) +
      num(currentPayables);

    const base = Math.max(0, assets - deductions);
    const zakat = base * ZAKAT_RATE; // 2.5% أساس هجري (البنوك عادة تعتمد سنة قمرية)
    return { assets, deductions, base, zakat };
  }, [
    cashLiquid, murabahaReceivables, ijaraReceivables, istisnaReceivables, salamGoods,
    tradingInventory, sukukTrading, equityInvestments, mudarabaShare, musharakaShare,
    goldSilverInventory, psia, restrictedInvestments, takafulParticipantsFund,
    fixedAssetsForUse, doubtfulDebtsProvision, currentPayables,
  ]);

  const fmt = (n: number) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(n);

  const Field = ({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" inputMode="decimal" />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" />
          نموذج زكاة البنوك الإسلامية الكامل
          <Badge variant="outline">AAOIFI SS 35 · FAS 9</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            نموذج مبني على <b>صافي الموجودات الزكوية</b>: مجموع الموجودات الزكوية − ودائع أصحاب حسابات الاستثمار − المخصّصات − الالتزامات الجارية المستحقة خلال السنة.
            يُخرج بحصّة البنك من صناديق المشاركة والمضاربة، ولا يُزكّى صندوق المشتركين في التكافل لأنه ملك للمشتركين لا للشركة.
          </AlertDescription>
        </Alert>

        <section className="space-y-3">
          <h3 className="font-semibold text-sm">الموجودات الزكوية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="النقد والأرصدة السائلة" value={cashLiquid} onChange={setCashLiquid} />
            <Field label="ذمم المرابحة (إجمالي)" value={murabahaReceivables} onChange={setMurabahaReceivables} hint="قبل خصم المخصّصات" />
            <Field label="ذمم الإجارة المنتهية بالتمليك" value={ijaraReceivables} onChange={setIjaraReceivables} />
            <Field label="ذمم الاستصناع الموازي" value={istisnaReceivables} onChange={setIstisnaReceivables} />
            <Field label="بضائع السلم المُقتناة" value={salamGoods} onChange={setSalamGoods} />
            <Field label="مخزون تجاري (للمتاجرة)" value={tradingInventory} onChange={setTradingInventory} />
            <Field label="صكوك للمتاجرة" value={sukukTrading} onChange={setSukukTrading} hint="بالقيمة السوقية" />
            <Field label="استثمارات في أسهم للمتاجرة" value={equityInvestments} onChange={setEquityInvestments} />
            <Field label="حصّة البنك في مضاربات مطلقة" value={mudarabaShare} onChange={setMudarabaShare} />
            <Field label="حصّة البنك في مشاركات" value={musharakaShare} onChange={setMusharakaShare} />
            <Field label="مخزون معادن نفيسة" value={goldSilverInventory} onChange={setGoldSilverInventory} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-sm">المستبعَدات والخصومات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="ودائع أصحاب حسابات الاستثمار (PSIA)" value={psia} onChange={setPsia} hint="ملك للمودعين — تخرج من الوعاء" />
            <Field label="مضاربات مقيّدة (Off-BS)" value={restrictedInvestments} onChange={setRestrictedInvestments} />
            <Field label="صندوق المشتركين في التكافل" value={takafulParticipantsFund} onChange={setTakafulParticipantsFund} />
            <Field label="أصول ثابتة للاستخدام (مبانٍ/أجهزة)" value={fixedAssetsForUse} onChange={setFixedAssetsForUse} />
            <Field label="مخصّص الديون المشكوك في تحصيلها" value={doubtfulDebtsProvision} onChange={setDoubtfulDebtsProvision} />
            <Field label="التزامات مستحقة الدفع خلال السنة" value={currentPayables} onChange={setCurrentPayables} hint="المُقتطع من رأس المال العامل" />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t">
          <SummaryCard label="مجموع الموجودات الزكوية" value={fmt(calc.assets)} />
          <SummaryCard label="مجموع المستبعَدات" value={fmt(calc.deductions)} />
          <SummaryCard label="الوعاء الزكوي" value={fmt(calc.base)} highlight />
          <SummaryCard
            label="الزكاة المستحقة (2.5%)"
            value={fmt(calc.zakat)}
            highlight
            icon={<Calculator className="w-4 h-4" />}
          />
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p>• المرجع: AAOIFI SS 35 (زكاة)، FAS 9 (الزكاة في المؤسسات المالية الإسلامية).</p>
          <p>• للسنة الشمسية استخدم النسبة 2.5775% (تُطبَّق تلقائياً في وضع الحساب الشمسي).</p>
          <p>• يُنصح باعتماد قرار الهيئة الشرعية للبنك على الوعاء النهائي قبل الاعتماد.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? "bg-primary/5 border-primary/40" : "bg-muted/30"}`}>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`font-bold text-lg tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
