import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, ChevronLeft, FileText, Wallet, Coins, TrendingUp, Package, CheckCircle2 } from "lucide-react";
import { fmt } from "@/lib/zakat";
import { toast } from "sonner";
import { SaveToHistoryCard } from "@/components/zakat/SaveToHistoryCard";

const STEPS = [
  { key: "cash", title: "النقد والودائع", icon: Wallet },
  { key: "gold", title: "الذهب والفضة", icon: Coins },
  { key: "invest", title: "الاستثمارات والأسهم", icon: TrendingUp },
  { key: "trade", title: "عروض التجارة", icon: Package },
  { key: "review", title: "المراجعة والتقرير", icon: FileText },
] as const;

const NISAB_GOLD_GRAMS = 85; // نصاب الذهب
const RATE = 0.025;

export function IndividualWizard() {
  const [step, setStep] = useState(0);
  const [cash, setCash] = useState("");
  const [banks, setBanks] = useState("");
  const [debtsOwed, setDebtsOwed] = useState("");
  const [debtsOn, setDebtsOn] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [silverGrams, setSilverGrams] = useState("");
  const [goldGramPrice, setGoldGramPrice] = useState("415");
  const [stocks, setStocks] = useState("");
  const [crypto, setCrypto] = useState("");
  const [inventory, setInventory] = useState("");

  const total = useMemo(() => {
    const n = (x: string) => parseFloat(x || "0") || 0;
    const gp = n(goldGramPrice);
    const goldVal = n(goldGrams) * gp;
    const silverVal = n(silverGrams) * (gp / 70);
    const gross = n(cash) + n(banks) + n(debtsOwed) + goldVal + silverVal + n(stocks) + n(crypto) + n(inventory);
    const net = gross - n(debtsOn);
    const nisabValue = NISAB_GOLD_GRAMS * gp;
    const reaches = net >= nisabValue && nisabValue > 0;
    const zakat = reaches ? net * RATE : 0;
    return { gross, net, nisabValue, reaches, zakat };
  }, [cash, banks, debtsOwed, debtsOn, goldGrams, silverGrams, goldGramPrice, stocks, crypto, inventory]);

  function printReport() {
    window.print();
    toast.success("جاري إعداد التقرير للطباعة");
  }

  const pct = ((step + 1) / STEPS.length) * 100;
  const Icon = STEPS[step].icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 mb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-primary" /> {STEPS[step].title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{step + 1} / {STEPS.length}</Badge>
        </div>
        <Progress value={pct} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="النقد في اليد" v={cash} set={setCash} />
            <Field label="أرصدة البنوك" v={banks} set={setBanks} />
            <Field label="ديون لك على الآخرين (مرجوة السداد)" v={debtsOwed} set={setDebtsOwed} />
            <Field label="ديون عليك مستحقة" v={debtsOn} set={setDebtsOn} />
          </div>
        )}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="سعر جرام الذهب اليوم" v={goldGramPrice} set={setGoldGramPrice} />
            <Field label="جرامات الذهب المملوك" v={goldGrams} set={setGoldGrams} />
            <Field label="جرامات الفضة المملوكة" v={silverGrams} set={setSilverGrams} />
          </div>
        )}
        {step === 2 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="قيمة الأسهم والاستثمارات" v={stocks} set={setStocks} />
            <Field label="قيمة العملات الرقمية" v={crypto} set={setCrypto} />
          </div>
        )}
        {step === 3 && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="قيمة عروض التجارة / المخزون" v={inventory} set={setInventory} />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            {!total.reaches && (
              <Alert>
                <AlertDescription className="text-xs">
                  المال لم يبلغ النصاب ({fmt(total.nisabValue)}). لا تجب الزكاة حالياً.
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-lg border p-4 space-y-2">
              <Row label="إجمالي الموجودات" v={total.gross} />
              <Row label="الوعاء بعد خصم الديون" v={total.net} />
              <Row label="نصاب الذهب اليوم" v={total.nisabValue} />
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> الزكاة المستحقة
                </span>
                <span className="font-bold text-lg text-primary" dir="ltr">{fmt(total.zakat)}</span>
              </div>
            </div>
            <Button onClick={printReport} className="w-full gap-2">
              <FileText className="h-4 w-4" /> تصدير تقرير PDF
            </Button>
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

function Field({ label, v, set }: { label: string; v: string; set: (x: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" inputMode="decimal" min="0" value={v} onChange={(e) => set(e.target.value)} dir="ltr" />
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span dir="ltr" className="font-medium">{fmt(v)}</span>
    </div>
  );
}
