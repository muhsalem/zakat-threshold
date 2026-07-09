import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Calculator,
  RotateCcw,
} from "lucide-react";
import { ZAKAT_RATE, GOLD_NISAB_GRAMS, SILVER_NISAB_GRAMS, num, fmt } from "@/lib/zakat";

/**
 * Beginner-friendly 5-step wizard: a guided, simplified path to compute Zakat
 * on cash + gold + silver — the most common case (>80% of users).
 */
const STEPS = [
  { title: "ابدأ", desc: "حاسبة مبسّطة بـ 5 خطوات" },
  { title: "النقد", desc: "أموالك السائلة" },
  { title: "الذهب", desc: "أوزان الذهب" },
  { title: "الفضة", desc: "أوزان الفضة" },
  { title: "النتيجة", desc: "زكاتك المستحقة" },
];

export function BeginnerWizard() {
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState("SAR");
  const [goldPrice, setGoldPrice] = useState("280");
  const [silverPrice, setSilverPrice] = useState("3.5");
  const [cash, setCash] = useState("");
  const [savings, setSavings] = useState("");
  const [investments, setInvestments] = useState("");
  const [debts, setDebts] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [silverGrams, setSilverGrams] = useState("");

  const result = useMemo(() => {
    const cashTotal = num(cash) + num(savings) + num(investments) - num(debts);
    const goldValue = num(goldGrams) * num(goldPrice);
    const silverValue = num(silverGrams) * num(silverPrice);
    const nisabValue = GOLD_NISAB_GRAMS * num(goldPrice);
    const reachesNisab = cashTotal + goldValue + silverValue >= nisabValue;
    const goldEligible = num(goldGrams) >= GOLD_NISAB_GRAMS || reachesNisab;
    const silverEligible = num(silverGrams) >= SILVER_NISAB_GRAMS || reachesNisab;
    const cashZ = cashTotal > 0 && reachesNisab ? cashTotal * ZAKAT_RATE : 0;
    const goldZ = goldEligible ? goldValue * ZAKAT_RATE : 0;
    const silverZ = silverEligible ? silverValue * ZAKAT_RATE : 0;
    return {
      cashTotal: Math.max(0, cashTotal),
      goldValue,
      silverValue,
      nisabValue,
      reachesNisab,
      total: cashZ + goldZ + silverZ,
    };
  }, [cash, savings, investments, debts, goldGrams, silverGrams, goldPrice, silverPrice]);

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }
  function reset() {
    setStep(0);
    setCash("");
    setSavings("");
    setInvestments("");
    setDebts("");
    setGoldGrams("");
    setSilverGrams("");
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto space-y-4 text-right">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-primary">
            الخطوة {step + 1} / {STEPS.length}
          </span>
          <span className="text-muted-foreground">
            {STEPS[step].title} — {STEPS[step].desc}
          </span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {STEPS[step].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <p className="text-sm leading-relaxed">
                أهلاً بك. هذا المعالج المبسّط يحسب زكاتك على ثلاثة أصول رئيسية فقط:
                <b> النقد، الذهب، والفضة</b>. لو عندك عقار/تجارة/زروع/أنعام استخدم الحاسبة الكاملة
                في تبويب "الأفراد".
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">العملة</Label>
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">سعر غرام الذهب 24</Label>
                  <Input
                    type="number"
                    value={goldPrice}
                    onChange={(e) => setGoldPrice(e.target.value)}
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">سعر غرام الفضة</Label>
                  <Input
                    type="number"
                    value={silverPrice}
                    onChange={(e) => setSilverPrice(e.target.value)}
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
              </div>
              <Alert className="border-primary/20 bg-primary/5">
                <AlertDescription className="text-xs leading-relaxed">
                  النصاب = قيمة <b>{GOLD_NISAB_GRAMS} غم ذهب 24</b> ≈{" "}
                  <b>
                    {fmt(GOLD_NISAB_GRAMS * num(goldPrice))} {currency}
                  </b>
                  . لو ملكك أقل من النصاب فلا زكاة عليك.
                </AlertDescription>
              </Alert>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-xs text-muted-foreground">
                اجمع كل أموالك السائلة، واطرح ديونك المستحقة خلال السنة.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="نقد في يدك" value={cash} set={setCash} />
                <Field label="أرصدة بنكية وودائع" value={savings} set={setSavings} />
                <Field
                  label="استثمارات/أسهم (قيمة سوقية)"
                  value={investments}
                  set={setInvestments}
                />
                <Field
                  label="ديون مستحقة عليك"
                  value={debts}
                  set={setDebts}
                  hint="تُخصم من الوعاء"
                />
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                صافي النقد:{" "}
                <b>
                  {fmt(result.cashTotal)} {currency}
                </b>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-muted-foreground">
                أدخل إجمالي الذهب الذي تملكه بالغرام (تقريباً عيار 24).
              </p>
              <Field label="إجمالي وزن الذهب (غم)" value={goldGrams} set={setGoldGrams} />
              <Alert>
                <AlertDescription className="text-xs">
                  نصاب الذهب: <b>{GOLD_NISAB_GRAMS} غم</b>. قيمتك الحالية:{" "}
                  <b>
                    {fmt(result.goldValue)} {currency}
                  </b>
                </AlertDescription>
              </Alert>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-xs text-muted-foreground">أدخل إجمالي وزن الفضة بالغرام.</p>
              <Field label="إجمالي وزن الفضة (غم)" value={silverGrams} set={setSilverGrams} />
              <Alert>
                <AlertDescription className="text-xs">
                  نصاب الفضة: <b>{SILVER_NISAB_GRAMS} غم</b>. قيمتك الحالية:{" "}
                  <b>
                    {fmt(result.silverValue)} {currency}
                  </b>
                </AlertDescription>
              </Alert>
            </>
          )}

          {step === 4 && (
            <>
              <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-gold">
                <CardContent className="p-6 text-center">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-90" />
                  <div className="text-xs opacity-90">زكاتك المستحقة</div>
                  <div className="text-5xl font-black tracking-tight my-2">
                    {fmt(result.total)}{" "}
                    <span className="text-base font-medium opacity-80">{currency}</span>
                  </div>
                  <Badge
                    variant={result.reachesNisab ? "secondary" : "destructive"}
                    className="mt-2"
                  >
                    {result.reachesNisab ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 ml-1" /> بلغ النصاب
                      </>
                    ) : (
                      "أقل من النصاب — لا زكاة"
                    )}
                  </Badge>
                </CardContent>
              </Card>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Stat label="النقد" value={`${fmt(result.cashTotal)}`} />
                <Stat label="الذهب" value={`${fmt(result.goldValue)}`} />
                <Stat label="الفضة" value={`${fmt(result.silverValue)}`} />
              </div>
              <Alert className="border-primary/20 bg-primary/5">
                <AlertDescription className="text-xs leading-relaxed">
                  للحساب الكامل (عقار، تجارة، أنعام، زروع، طباعة إقرار) انتقل لتبويب{" "}
                  <b>"الأفراد"</b>.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={reset} className="w-full gap-1.5">
                <RotateCcw className="h-4 w-4" /> ابدأ من جديد
              </Button>
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={prev} disabled={step === 0} className="gap-1">
              <ChevronRight className="h-4 w-4" /> السابق
            </Button>
            <Button onClick={next} disabled={step === STEPS.length - 1} className="gap-1">
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  set,
  hint,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => set(e.target.value)}
        dir="ltr"
        style={{ textAlign: "right" }}
        placeholder="0"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2 text-center">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
