import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2, Calculator, Shield, Gavel, CheckSquare, AlertTriangle, Info,
} from "lucide-react";
import { ZAKAT_RATE, num, fmt, currency } from "@/lib/zakat";

function NumField({ label, value, onChange, unit, hint }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number" min="0" step="0.01" value={value}
          onChange={(e) => onChange(e.target.value)} placeholder="0"
          className="pl-16" dir="ltr" style={{ textAlign: "right" }}
        />
        {unit && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const COMPLIANCE_ITEMS = [
  { id: "fiscal", label: "اعتماد القوائم المالية المراجعة من مراقب الحسابات" },
  { id: "method", label: "اعتماد طريقة حساب الزكاة (صافي الموجودات / رأس المال العامل)" },
  { id: "hawl", label: "التحقق من حولان الحول على الموجودات الزكوية" },
  { id: "valuation", label: "تقييم البضاعة بسعر البيع الجملة يوم وجوب الزكاة" },
  { id: "exclude", label: "استبعاد الموجودات الثابتة المُعدّة للاستخدام لا للبيع" },
  { id: "doubt", label: "استبعاد الديون المشكوك في تحصيلها" },
  { id: "riba", label: "استبعاد الإيرادات والفوائد الربوية من الوعاء" },
  { id: "supervision", label: "وجود هيئة رقابة شرعية أو مستشار شرعي معتمد" },
  { id: "minority", label: "احتساب حقوق الأقليات وحصص الشركاء بدقة" },
  { id: "disclosure", label: "الإفصاح عن أسس الحساب في التقرير السنوي" },
];

export function CompanyTab() {
  // بيانات الشركة
  const [companyName, setCompanyName] = useState("");
  const [activity, setActivity] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [currencyName, setCurrencyName] = useState("ج.م");
  const [method, setMethod] = useState<"net_assets" | "working_capital">("net_assets");

  // طريقة صافي الموجودات الزكوية (موجودات متداولة - مطلوبات متداولة)
  const [cash, setCash] = useState("");
  const [banks, setBanks] = useState("");
  const [receivablesCo, setReceivablesCo] = useState("");
  const [inventoryCo, setInventoryCo] = useState("");
  const [investments, setInvestments] = useState("");
  const [otherCurrent, setOtherCurrent] = useState("");

  const [stPayables, setStPayables] = useState(""); // موردون ودائنون قصيرة الأجل
  const [accruals, setAccruals] = useState(""); // مصروفات مستحقة
  const [taxDue, setTaxDue] = useState(""); // ضرائب مستحقة
  const [stLoans, setStLoans] = useState(""); // قروض قصيرة الأجل

  // طريقة رأس المال العامل (صافي حقوق الملكية + المطلوبات طويلة - الأصول الثابتة - الخسائر)
  const [equity, setEquity] = useState("");
  const [ltLiabilities, setLtLiabilities] = useState("");
  const [fixedAssets, setFixedAssets] = useState("");
  const [intangibles, setIntangibles] = useState("");
  const [losses, setLosses] = useState("");

  // حصة العام (إن كانت السنة شمسية)
  const [solarYear, setSolarYear] = useState<"hijri" | "solar">("hijri");

  // الامتثال الشرعي
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});
  const toggleC = (id: string) => setCompliance((p) => ({ ...p, [id]: !p[id] }));

  const calc = useMemo(() => {
    const curAssets = num(cash) + num(banks) + num(receivablesCo) + num(inventoryCo) + num(investments) + num(otherCurrent);
    const curLiabs = num(stPayables) + num(accruals) + num(taxDue) + num(stLoans);
    const netAssets = curAssets - curLiabs;

    const workingCapital = num(equity) + num(ltLiabilities) - num(fixedAssets) - num(intangibles) - num(losses);

    const base = method === "net_assets" ? netAssets : workingCapital;
    // تعديل النسبة إذا السنة شمسية: 2.5775%
    const rate = solarYear === "solar" ? 0.025775 : ZAKAT_RATE;
    const zakat = base > 0 ? base * rate : 0;

    const completed = Object.values(compliance).filter(Boolean).length;
    const complianceScore = Math.round((completed / COMPLIANCE_ITEMS.length) * 100);

    return { curAssets, curLiabs, netAssets, workingCapital, base, rate, zakat, completed, complianceScore };
  }, [
    cash, banks, receivablesCo, inventoryCo, investments, otherCurrent,
    stPayables, accruals, taxDue, stLoans,
    equity, ltLiabilities, fixedAssets, intangibles, losses,
    method, solarYear, compliance,
  ]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              بيانات الشركة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>اسم الشركة</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>النشاط</Label>
              <Input value={activity} onChange={(e) => setActivity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>السنة المالية</Label>
              <Input value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} placeholder="مثال: 2025/2026" />
            </div>
            <div className="space-y-1.5">
              <Label>العملة</Label>
              <Input value={currencyName} onChange={(e) => setCurrencyName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-2 block">نوع السنة المحاسبية</Label>
              <RadioGroup value={solarYear} onValueChange={(v) => setSolarYear(v as "hijri" | "solar")} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="hijri" id="hij" /><Label htmlFor="hij">قمرية (2.5%)</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="solar" id="sol" /><Label htmlFor="sol">شمسية (2.5775%)</Label></div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              طريقة حساب زكاة الشركة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={method} onValueChange={(v) => setMethod(v as "net_assets" | "working_capital")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="net_assets">صافي الموجودات الزكوية</TabsTrigger>
                <TabsTrigger value="working_capital">رأس المال العامل</TabsTrigger>
              </TabsList>

              <TabsContent value="net_assets" className="space-y-4 pt-4">
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <b>الموجودات المتداولة الزكوية − المطلوبات المتداولة</b> ثم تُضرب الناتج × 2.5%.
                    تستخدمها هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (AAOIFI).
                  </AlertDescription>
                </Alert>
                <div>
                  <h4 className="font-semibold mb-3 text-primary">الموجودات المتداولة الزكوية</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <NumField label="النقدية في الصندوق" value={cash} onChange={setCash} unit={currencyName} />
                    <NumField label="أرصدة البنوك" value={banks} onChange={setBanks} unit={currencyName} />
                    <NumField label="العملاء والمدينون" value={receivablesCo} onChange={setReceivablesCo} unit={currencyName} hint="بعد استبعاد المشكوك" />
                    <NumField label="المخزون (بسعر السوق)" value={inventoryCo} onChange={setInventoryCo} unit={currencyName} />
                    <NumField label="استثمارات قصيرة الأجل" value={investments} onChange={setInvestments} unit={currencyName} />
                    <NumField label="أصول متداولة أخرى" value={otherCurrent} onChange={setOtherCurrent} unit={currencyName} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3 text-destructive">المطلوبات المتداولة (تُخصم)</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <NumField label="موردون ودائنون" value={stPayables} onChange={setStPayables} unit={currencyName} />
                    <NumField label="مصروفات مستحقة" value={accruals} onChange={setAccruals} unit={currencyName} />
                    <NumField label="ضرائب مستحقة" value={taxDue} onChange={setTaxDue} unit={currencyName} />
                    <NumField label="قروض قصيرة الأجل" value={stLoans} onChange={setStLoans} unit={currencyName} />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                  <div className="flex justify-between"><span>إجمالي الموجودات الزكوية:</span><b>{currency(calc.curAssets, currencyName)}</b></div>
                  <div className="flex justify-between"><span>إجمالي المطلوبات المتداولة:</span><b>{currency(calc.curLiabs, currencyName)}</b></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-primary"><span>صافي الوعاء الزكوي:</span><b>{currency(calc.netAssets, currencyName)}</b></div>
                </div>
              </TabsContent>

              <TabsContent value="working_capital" className="space-y-4 pt-4">
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <b>(حقوق الملكية + المطلوبات طويلة الأجل) − (الأصول الثابتة + الأصول غير الملموسة + الخسائر)</b>
                    ثم × 2.5%. تعتمدها مصلحة الزكاة السعودية (هيئة الزكاة والضريبة والجمارك).
                  </AlertDescription>
                </Alert>
                <div className="grid md:grid-cols-2 gap-4">
                  <NumField label="حقوق الملكية" value={equity} onChange={setEquity} unit={currencyName} />
                  <NumField label="المطلوبات طويلة الأجل" value={ltLiabilities} onChange={setLtLiabilities} unit={currencyName} />
                  <NumField label="الأصول الثابتة (تُخصم)" value={fixedAssets} onChange={setFixedAssets} unit={currencyName} />
                  <NumField label="الأصول غير الملموسة (تُخصم)" value={intangibles} onChange={setIntangibles} unit={currencyName} />
                  <NumField label="الخسائر المتراكمة (تُخصم)" value={losses} onChange={setLosses} unit={currencyName} />
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <div className="flex justify-between text-primary"><span>الوعاء الزكوي (رأس المال العامل):</span><b>{currency(calc.workingCapital, currencyName)}</b></div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* التدقيق والامتثال والحوكمة الشرعية */}
        <Card className="border-primary/30 shadow-soft">
          <CardHeader className="bg-gradient-to-l from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              التدقيق والامتثال والحوكمة الشرعية
            </CardTitle>
            <p className="text-sm text-muted-foreground">قائمة مراجعة لتدقيق حساب الزكاة وفق المعايير الشرعية والمحاسبية</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {COMPLIANCE_ITEMS.map((item) => (
              <label key={item.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/40 transition-colors">
                <Checkbox checked={!!compliance[item.id]} onCheckedChange={() => toggleC(item.id)} className="mt-0.5" />
                <span className="text-sm leading-relaxed">{item.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* النتيجة الجانبية */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="bg-gradient-primary text-primary-foreground shadow-gold border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-foreground">
              <Calculator className="h-5 w-5" />
              زكاة الشركة المستحقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tight">
              {fmt(calc.zakat)}
              <span className="text-lg font-medium opacity-80 mr-2">{currencyName}</span>
            </div>
            <p className="text-xs opacity-80 mt-3">
              النسبة المطبقة: <b>{(calc.rate * 100).toFixed(4)}%</b>
            </p>
            <p className="text-xs opacity-80">
              الطريقة: <b>{method === "net_assets" ? "صافي الموجودات الزكوية" : "رأس المال العامل"}</b>
            </p>
            {companyName && <p className="text-xs opacity-80 mt-2">{companyName} {activity && `— ${activity}`}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              مؤشر الامتثال الشرعي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold text-primary">{calc.complianceScore}%</span>
              <Badge variant={calc.complianceScore >= 80 ? "default" : calc.complianceScore >= 50 ? "secondary" : "destructive"}>
                {calc.complianceScore >= 80 ? "ممتاز" : calc.complianceScore >= 50 ? "مقبول" : "يحتاج مراجعة"}
              </Badge>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-primary to-gold transition-all"
                style={{ width: `${calc.complianceScore}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {calc.completed} من {COMPLIANCE_ITEMS.length} بند مُحقَّق
            </p>
            {calc.complianceScore < 80 && (
              <Alert className="mt-3 border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-xs">
                  يُنصح بإكمال بنود المراجعة لضمان صحة احتساب الزكاة شرعاً ومحاسبياً.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CheckSquare className="h-4 w-4" />ملخص الوعاء</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">الوعاء الزكوي:</span><b>{currency(calc.base, currencyName)}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">النسبة:</span><b>{(calc.rate * 100).toFixed(4)}%</b></div>
            <Separator />
            <div className="flex justify-between text-primary"><span>الزكاة الواجبة:</span><b>{currency(calc.zakat, currencyName)}</b></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
