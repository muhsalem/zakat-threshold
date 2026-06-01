import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Scale, Info } from "lucide-react";
import { num, fmt } from "@/lib/zakat";

interface Props { currencyName: string; }

/**
 * ورقة عمل مطابقة الوعاء الزكوي مع الوعاء الضريبي
 * — للسوق السعودي تحت ZATCA و30+ دولة عربية. تظهر الفروقات الجوهرية.
 */
export function TaxZakatReconciliation({ currencyName }: Props) {
  const [accountingProfit, setAccountingProfit] = useState("");
  // إضافات للوعاء الزكوي (لا تخصم زكويًا)
  const [interestExp, setInterestExp] = useState(""); // فوائد ربوية
  const [donationsDed, setDonationsDed] = useState("");
  const [unrealizedLosses, setUnrealizedLosses] = useState("");
  // خصومات من الوعاء الزكوي (لا تدخل)
  const [exemptIncome, setExemptIncome] = useState(""); // دخل مستثنى زكويًا
  const [fixedAssetSale, setFixedAssetSale] = useState("");
  // فروقات ضريبية بحتة
  const [taxDepreciation, setTaxDepreciation] = useState("");
  const [accountingDepreciation, setAccountingDepreciation] = useState("");

  const calc = useMemo(() => {
    const profit = num(accountingProfit);
    const zakatBase = profit + num(interestExp) + num(donationsDed) + num(unrealizedLosses)
                     - num(exemptIncome) - num(fixedAssetSale);
    const taxBase = profit + (num(accountingDepreciation) - num(taxDepreciation));
    const variance = zakatBase - taxBase;
    return { zakatBase, taxBase, variance };
  }, [accountingProfit, interestExp, donationsDed, unrealizedLosses, exemptIncome, fixedAssetSale, taxDepreciation, accountingDepreciation]);

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          مطابقة الوعاء الزكوي مع الوعاء الضريبي
          <Badge variant="outline" className="text-[10px] mr-auto">ZATCA · IFRS · AAOIFI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            تُستخدم هذه الورقة لتسوية الفروقات بين الربح المحاسبي والوعاء الزكوي والوعاء الضريبي،
            خاصةً في السوق السعودي تحت هيئة <b>ZATCA</b> حيث تُطبَّق زكاة 2.5% للسعوديين/الخليجيين
            وضريبة 20% للأجانب على نفس الكيان.
          </AlertDescription>
        </Alert>

        <div>
          <Label className="text-sm">الربح المحاسبي قبل الزكاة والضريبة</Label>
          <Input type="number" dir="ltr" style={{ textAlign: "right" }}
            value={accountingProfit} onChange={(e) => setAccountingProfit(e.target.value)} placeholder="0" />
        </div>

        <div className="rounded-md border border-primary/20 p-3 space-y-2">
          <div className="text-xs font-semibold text-primary">إضافات للوعاء الزكوي (تُضاف للربح)</div>
          <div className="grid md:grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px]">فوائد ربوية مدفوعة</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={interestExp} onChange={(e) => setInterestExp(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">تبرعات مخصومة محاسبيًا</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={donationsDed} onChange={(e) => setDonationsDed(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">خسائر غير محقّقة</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={unrealizedLosses} onChange={(e) => setUnrealizedLosses(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-primary/20 p-3 space-y-2">
          <div className="text-xs font-semibold text-primary">خصومات من الوعاء الزكوي (تُطرح)</div>
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">دخل مستثنى زكويًا</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={exemptIncome} onChange={(e) => setExemptIncome(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">أرباح بيع أصول ثابتة</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={fixedAssetSale} onChange={(e) => setFixedAssetSale(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-muted p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">فروقات ضريبية فقط (لا تؤثر زكويًا)</div>
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">إهلاك محاسبي</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={accountingDepreciation} onChange={(e) => setAccountingDepreciation(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">إهلاك ضريبي</Label>
              <Input type="number" dir="ltr" style={{ textAlign: "right" }} value={taxDepreciation} onChange={(e) => setTaxDepreciation(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>الوعاء الزكوي المطابق:</span><b>{fmt(calc.zakatBase)} {currencyName}</b></div>
          <div className="flex justify-between"><span>الوعاء الضريبي المطابق:</span><b>{fmt(calc.taxBase)} {currencyName}</b></div>
          <div className="flex justify-between text-primary border-t border-primary/30 pt-1">
            <span>الفرق (زكوي − ضريبي):</span>
            <b className={calc.variance >= 0 ? "" : "text-destructive"}>{fmt(calc.variance)} {currencyName}</b>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
