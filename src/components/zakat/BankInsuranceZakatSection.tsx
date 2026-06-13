import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Landmark, Shield, Info, Scale } from "lucide-react";
import { ZAKAT_RATE, fmt, num } from "@/lib/zakat";

/**
 * زكاة البنوك وشركات التأمين — وفق معيار AAOIFI رقم (35) "الزكاة" والمعيار (9) للتأمين التكافلي.
 * - البنوك: الوعاء = (الموجودات الزكوية الصافية) أو (حقوق المساهمين + المخصصات + الاحتياطيات
 *   − الأصول الثابتة − الاستثمارات في الشركات التابعة الزكوية بالفعل) — طريقتان مقبولتان.
 * - التأمين التكافلي: زكاة على أموال المساهمين فقط دون صندوق المشتركين (وهو مال مرصود لتغطية الأخطار).
 * - التأمين التجاري: محل خلاف؛ القول الراجح زكاة أموال المساهمين فقط مع تطهير الإيرادات المحرَّمة.
 */

type Method = "net-assets" | "net-invested-funds";
type EntityKind = "islamic-bank" | "commercial-bank" | "takaful" | "commercial-insurance";

function Num({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" style={{ textAlign: "right" }} placeholder="0" />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BankInsuranceZakatSection({ currencyName = "ج.م" }: { currencyName?: string }) {
  const [kind, setKind] = useState<EntityKind>("islamic-bank");
  const [method, setMethod] = useState<Method>("net-invested-funds");

  // طريقة صافي الموجودات (Net Zakatable Assets)
  const [cash, setCash] = useState("0");
  const [interbank, setInterbank] = useState("0");
  const [financings, setFinancings] = useState("0"); // التمويلات الإسلامية / القروض القصيرة المُحصَّلة
  const [securities, setSecurities] = useState("0"); // أوراق مالية للمتاجرة
  const [gold, setGold] = useState("0");
  const [deductLiabilities, setDeductLiabilities] = useState("0"); // ودائع العملاء/الالتزامات قصيرة الأجل المُستحقة قبل الحول

  // طريقة صافي الأموال المستثمرة (Net Invested Funds)
  const [equity, setEquity] = useState("0");           // حقوق المساهمين
  const [provisions, setProvisions] = useState("0");   // مخصصات + احتياطيات
  const [longTerm, setLongTerm] = useState("0");       // قروض/صكوك طويلة الأجل
  const [fixedAssets, setFixedAssets] = useState("0"); // أصول ثابتة + معنوية
  const [subsidiaries, setSubsidiaries] = useState("0"); // استثمارات في تابعة تُزكِّي نفسها
  const [losses, setLosses] = useState("0");           // خسائر متراكمة

  // تأمين: أموال المساهمين (للزكاة) + صندوق المشتركين (مستثنى للتكافل)
  const [shareholderFunds, setShareholderFunds] = useState("0");
  const [participantsFund, setParticipantsFund] = useState("0");
  const [haramRevenue, setHaramRevenue] = useState("0"); // إيرادات محرَّمة للتطهير

  const isBank = kind === "islamic-bank" || kind === "commercial-bank";
  const isInsurance = kind === "takaful" || kind === "commercial-insurance";

  const bankBase = useMemo(() => {
    if (!isBank) return 0;
    if (method === "net-assets") {
      const assets = num(cash) + num(interbank) + num(financings) + num(securities) + num(gold);
      return Math.max(0, assets - num(deductLiabilities));
    }
    // net-invested-funds (طريقة صافي الأموال المستثمرة — AAOIFI 35)
    const base = num(equity) + num(provisions) + num(longTerm)
      - num(fixedAssets) - num(subsidiaries) - num(losses);
    return Math.max(0, base);
  }, [isBank, method, cash, interbank, financings, securities, gold, deductLiabilities, equity, provisions, longTerm, fixedAssets, subsidiaries, losses]);

  const insuranceBase = useMemo(() => {
    if (!isInsurance) return 0;
    // أموال المساهمين فقط — صندوق المشتركين ليس مملوكًا للشركة ملكية تامة
    return Math.max(0, num(shareholderFunds));
  }, [isInsurance, shareholderFunds]);

  const base = isBank ? bankBase : insuranceBase;
  const zakat = base * ZAKAT_RATE;

  const purification = kind === "commercial-bank" || kind === "commercial-insurance"
    ? num(haramRevenue)
    : 0;

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isInsurance ? <Shield className="h-4 w-4 text-primary" /> : <Landmark className="h-4 w-4 text-primary" />}
          زكاة البنوك وشركات التأمين
          <Badge variant="outline" className="text-[10px] mr-auto">AAOIFI 35 / 9</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            البنوك: تُحسب الزكاة إمّا على <b>صافي الموجودات الزكوية</b> (نقد + ذمم + تمويلات + أوراق مالية − التزامات قصيرة) أو على
            <b> صافي الأموال المستثمرة</b> (حقوق المساهمين + المخصصات + القروض طويلة الأجل − الأصول الثابتة − تابعة مُزكِّية − خسائر).
            <br />التأمين التكافلي: الزكاة على <b>أموال المساهمين فقط</b>، أما صندوق المشتركين فلا زكاة فيه لأنه مرصود لتغطية الأخطار.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">نوع المنشأة</Label>
            <Tabs value={kind} onValueChange={(v) => setKind(v as EntityKind)}>
              <TabsList className="grid grid-cols-2 h-auto">
                <TabsTrigger value="islamic-bank" className="text-[11px]">بنك إسلامي</TabsTrigger>
                <TabsTrigger value="commercial-bank" className="text-[11px]">بنك تجاري</TabsTrigger>
                <TabsTrigger value="takaful" className="text-[11px]">تأمين تكافلي</TabsTrigger>
                <TabsTrigger value="commercial-insurance" className="text-[11px]">تأمين تجاري</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isBank && (
            <div className="space-y-1">
              <Label className="text-xs">طريقة الحساب</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="flex gap-3 text-xs">
                <label className="flex items-center gap-1.5"><RadioGroupItem value="net-invested-funds" /> صافي الأموال المستثمرة</label>
                <label className="flex items-center gap-1.5"><RadioGroupItem value="net-assets" /> صافي الموجودات</label>
              </RadioGroup>
            </div>
          )}
        </div>

        {isBank && method === "net-assets" && (
          <div className="grid md:grid-cols-3 gap-3">
            <Num label="النقد والأرصدة لدى البنك المركزي" value={cash} onChange={setCash} />
            <Num label="أرصدة لدى البنوك (قابلة للسحب)" value={interbank} onChange={setInterbank} />
            <Num label="تمويلات/قروض قصيرة الأجل (محتملة التحصيل)" value={financings} onChange={setFinancings} />
            <Num label="أوراق مالية للمتاجرة" value={securities} onChange={setSecurities} />
            <Num label="ذهب/فضة بحوزة البنك" value={gold} onChange={setGold} />
            <Num label="(−) ودائع/التزامات قصيرة مُستحقة" value={deductLiabilities} onChange={setDeductLiabilities} />
          </div>
        )}

        {isBank && method === "net-invested-funds" && (
          <div className="grid md:grid-cols-3 gap-3">
            <Num label="حقوق المساهمين" value={equity} onChange={setEquity} />
            <Num label="المخصصات + الاحتياطيات" value={provisions} onChange={setProvisions} />
            <Num label="قروض/صكوك طويلة الأجل" value={longTerm} onChange={setLongTerm} />
            <Num label="(−) الأصول الثابتة والمعنوية" value={fixedAssets} onChange={setFixedAssets} />
            <Num label="(−) استثمارات في تابعة تُزكِّي نفسها" value={subsidiaries} onChange={setSubsidiaries} />
            <Num label="(−) خسائر متراكمة" value={losses} onChange={setLosses} />
          </div>
        )}

        {isInsurance && (
          <div className="grid md:grid-cols-3 gap-3">
            <Num label="أموال المساهمين (الوعاء الزكوي)" value={shareholderFunds} onChange={setShareholderFunds} />
            <Num label="صندوق المشتركين (مستثنى)" value={participantsFund} onChange={setParticipantsFund}
              hint="لا زكاة عليه في التكافل — مرصود لتغطية الأخطار" />
            {kind === "commercial-insurance" && (
              <Num label="إيرادات محرَّمة للتطهير" value={haramRevenue} onChange={setHaramRevenue}
                hint="تُصرف في وجوه البر دون نية القربة" />
            )}
          </div>
        )}

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 grid md:grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">الوعاء الزكوي</div>
            <div className="font-bold text-primary">{fmt(base)} {currencyName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">الزكاة المستحقّة (2.5%)</div>
            <div className="font-bold text-primary text-lg">{fmt(zakat)} {currencyName}</div>
          </div>
          {purification > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">مبلغ التطهير</div>
              <div className="font-bold text-destructive">{fmt(purification)} {currencyName}</div>
            </div>
          )}
        </div>

        <Alert className="border-muted">
          <Scale className="h-4 w-4" />
          <AlertDescription className="text-[11px] leading-relaxed">
            <b>مرجع:</b> AAOIFI — معيار الزكاة (35) للبنوك، ومعيار التأمين التكافلي (26/41).
            النتائج إرشادية ولا تُغني عن مراجعة هيئة الرقابة الشرعية والمحاسب القانوني.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default BankInsuranceZakatSection;
