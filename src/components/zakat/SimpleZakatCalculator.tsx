import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Globe2, Sparkles, CheckCircle2 } from "lucide-react";
import { ZAKAT_RATE, GOLD_NISAB_GRAMS, num, fmt } from "@/lib/zakat";

/**
 * Free simple zakat calculator for casual visitors.
 * Auto-selects currency and metal prices per country.
 * Only 4 inputs: cash, gold(g), silver(g), debts.
 */
type CountryPreset = {
  code: string;
  name: string;
  currency: string;
  goldGram: number;   // approx local price per gram 24k
  silverGram: number; // approx local price per gram
};

// Approximate live-ish reference prices (2026). Editable by user.
const COUNTRIES: CountryPreset[] = [
  { code: "SA", name: "السعودية", currency: "ر.س", goldGram: 385, silverGram: 4.6 },
  { code: "AE", name: "الإمارات", currency: "د.إ", goldGram: 375, silverGram: 4.5 },
  { code: "EG", name: "مصر", currency: "ج.م", goldGram: 5100, silverGram: 60 },
  { code: "KW", name: "الكويت", currency: "د.ك", goldGram: 31, silverGram: 0.38 },
  { code: "QA", name: "قطر", currency: "ر.ق", goldGram: 375, silverGram: 4.5 },
  { code: "BH", name: "البحرين", currency: "د.ب", goldGram: 38, silverGram: 0.46 },
  { code: "OM", name: "عُمان", currency: "ر.ع", goldGram: 39, silverGram: 0.47 },
  { code: "JO", name: "الأردن", currency: "د.أ", goldGram: 72, silverGram: 0.87 },
  { code: "IQ", name: "العراق", currency: "د.ع", goldGram: 135000, silverGram: 1600 },
  { code: "MA", name: "المغرب", currency: "د.م", goldGram: 1020, silverGram: 12 },
  { code: "DZ", name: "الجزائر", currency: "د.ج", goldGram: 13800, silverGram: 165 },
  { code: "TN", name: "تونس", currency: "د.ت", goldGram: 320, silverGram: 3.8 },
  { code: "TR", name: "تركيا", currency: "₺", goldGram: 3400, silverGram: 40 },
  { code: "PK", name: "باكستان", currency: "₨", goldGram: 28000, silverGram: 330 },
  { code: "MY", name: "ماليزيا", currency: "RM", goldGram: 470, silverGram: 5.6 },
  { code: "ID", name: "إندونيسيا", currency: "Rp", goldGram: 1600000, silverGram: 19000 },
  { code: "US", name: "الولايات المتحدة", currency: "$", goldGram: 102, silverGram: 1.2 },
  { code: "GB", name: "بريطانيا", currency: "£", goldGram: 80, silverGram: 0.95 },
  { code: "EU", name: "أوروبا", currency: "€", goldGram: 95, silverGram: 1.1 },
];

const CC_TO_CODE: Record<string, string> = {
  AR: "SA", "AR-SA": "SA", "AR-AE": "AE", "AR-EG": "EG", "AR-KW": "KW",
  "AR-QA": "QA", "AR-BH": "BH", "AR-OM": "OM", "AR-JO": "JO",
  "AR-IQ": "IQ", "AR-MA": "MA", "AR-DZ": "DZ", "AR-TN": "TN",
  "TR-TR": "TR", "UR-PK": "PK", "MS-MY": "MY", "ID-ID": "ID",
  "EN-US": "US", "EN-GB": "GB",
};

function detectCountry(): string {
  if (typeof navigator === "undefined") return "SA";
  const lang = (navigator.language || "SA").toUpperCase();
  if (CC_TO_CODE[lang]) return CC_TO_CODE[lang];
  const region = lang.split("-")[1];
  if (region && COUNTRIES.some((c) => c.code === region)) return region;
  return "SA";
}

export function SimpleZakatCalculator() {
  const [countryCode, setCountryCode] = useState("SA");
  const [goldPrice, setGoldPrice] = useState("385");
  const [silverPrice, setSilverPrice] = useState("4.6");
  const [cash, setCash] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [silverGrams, setSilverGrams] = useState("");
  const [debts, setDebts] = useState("");

  useEffect(() => {
    const c = detectCountry();
    setCountryCode(c);
  }, []);

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0],
    [countryCode]
  );

  useEffect(() => {
    setGoldPrice(String(country.goldGram));
    setSilverPrice(String(country.silverGram));
  }, [country]);

  const r = useMemo(() => {
    const gp = num(goldPrice);
    const sp = num(silverPrice);
    const cashNet = Math.max(0, num(cash) - num(debts));
    const goldVal = num(goldGrams) * gp;
    const silverVal = num(silverGrams) * sp;
    const total = cashNet + goldVal + silverVal;
    const nisab = GOLD_NISAB_GRAMS * gp;
    const reaches = total >= nisab;
    const zakat = reaches ? total * ZAKAT_RATE : 0;
    return { cashNet, goldVal, silverVal, total, nisab, reaches, zakat };
  }, [goldPrice, silverPrice, cash, goldGrams, silverGrams, debts]);

  return (
    <Card dir="rtl" className="shadow-xl border-primary/30 overflow-hidden">
      <CardHeader className="bg-gradient-to-l from-primary/10 via-gold/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-gold" />
          حاسبة الزكاة المجانية السريعة
          <Badge variant="secondary" className="mr-auto">مجاناً — بدون تسجيل</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          احسب زكاتك في أقل من دقيقة. تُحدَّد العملة وأسعار الذهب والفضة تلقائياً حسب دولتك، ويمكنك تعديلها.
        </p>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" /> الدولة</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">سعر غرام الذهب 24 ({country.currency})</Label>
            <Input type="number" value={goldPrice} onChange={(e) => setGoldPrice(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">سعر غرام الفضة ({country.currency})</Label>
            <Input type="number" value={silverPrice} onChange={(e) => setSilverPrice(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label={`نقد وأرصدة (${country.currency})`} value={cash} onChange={setCash} />
          <Field label="ذهب (غرام)" value={goldGrams} onChange={setGoldGrams} />
          <Field label="فضة (غرام)" value={silverGrams} onChange={setSilverGrams} />
          <Field label={`ديون مستحقة (${country.currency})`} value={debts} onChange={setDebts} />
        </div>

        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          <MiniStat label="النقد الصافي" value={`${fmt(r.cashNet)} ${country.currency}`} />
          <MiniStat label="قيمة الذهب" value={`${fmt(r.goldVal)} ${country.currency}`} />
          <MiniStat label="قيمة الفضة" value={`${fmt(r.silverVal)} ${country.currency}`} />
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-center shadow-lg">
          <Calculator className="h-7 w-7 mx-auto mb-1 opacity-90" />
          <div className="text-xs opacity-90">زكاتك المستحقة</div>
          <div className="text-4xl md:text-5xl font-black tracking-tight my-1">
            {fmt(r.zakat)} <span className="text-base font-medium opacity-80">{country.currency}</span>
          </div>
          <Badge variant={r.reaches ? "secondary" : "destructive"} className="mt-1">
            {r.reaches ? <><CheckCircle2 className="h-3 w-3 ml-1" /> بلغ النصاب</> : "أقل من النصاب — لا زكاة"}
          </Badge>
          <div className="text-[11px] opacity-80 mt-2">
            النصاب المرجعي: {fmt(r.nisab)} {country.currency} · نسبة الزكاة 2.5%
          </div>
        </div>

        <Alert className="border-gold/30 bg-gold/5">
          <AlertDescription className="text-xs leading-relaxed">
            هذه حاسبة تقديرية للأصول الشائعة (نقد + ذهب + فضة). للحساب الكامل الذي يشمل العقار والتجارة
            والاستثمارات والزروع والأنعام، استخدم <b>الحاسبة الاحترافية</b>، أو أرسل بياناتك لمحاسب معتمد لاستلام تقرير رسمي خلال 48 ساعة.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" dir="ltr" style={{ textAlign: "right" }} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2 text-center">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}
