import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Landmark, HandHeart, ShieldAlert, Calculator } from "lucide-react";
import { CompanyWizard } from "./CompanyWizard";
import { num, fmt, ZAKAT_RATE } from "@/lib/zakat";

/**
 * معالج المؤسسة — يفصل صراحةً بين وعاء النشاط التجاري (تُحسب زكاته)
 * وبين الأوقاف والتبرعات المقيّدة والأنشطة الخيرية (تُستبعد من الوعاء)،
 * ثم يمرّر النشاط التجاري إلى معالج الشركة لحساب الزكاة عليه.
 */
export function InstitutionWizard() {
  const [commercialAssets, setCommercialAssets] = useState("");
  const [waqf, setWaqf] = useState("");
  const [restrictedDonations, setRestrictedDonations] = useState("");
  const [charitableActivities, setCharitableActivities] = useState("");
  const [currency] = useState("SAR");

  const commercial = num(commercialAssets);
  const excluded = num(waqf) + num(restrictedDonations) + num(charitableActivities);
  const netCommercial = Math.max(0, commercial);
  const estimatedZakat = netCommercial * ZAKAT_RATE;

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Landmark className="h-4 w-4" />
        <AlertDescription className="text-xs leading-6">
          <strong>منهج المؤسسة (AAOIFI-35 §6/3):</strong> الأوقاف والتبرعات المقيّدة والأصول
          المخصّصة للأنشطة الخيرية <strong>تُستبعد من الوعاء الزكوي</strong>. تُحسب الزكاة فقط على
          الأصول التجارية النامية المملوكة للمؤسسة نفسها.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            الخطوة 1 — عزل الأصول المستبعدة (لا تُزكّى)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs">أصول الأوقاف الموقوفة</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={waqf}
                onChange={(e) => setWaqf(e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                أموال أو عقارات موقوفة لغرض شرعي — لا زكاة عليها.
              </p>
            </div>
            <div>
              <Label className="text-xs">تبرعات مقيّدة الغرض</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={restrictedDonations}
                onChange={(e) => setRestrictedDonations(e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                أموال مانحين مخصّصة لمشروع محدّد — أمانة لا مِلك.
              </p>
            </div>
            <div>
              <Label className="text-xs">أصول النشاط الخيري</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={charitableActivities}
                onChange={(e) => setCharitableActivities(e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                معدّات ومخازن مخصّصة لتوزيع الإغاثة والمشاريع الخيرية.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-semibold">إجمالي المستبعد من الوعاء: </span>
            <Badge variant="secondary" className="ml-1">
              {fmt(excluded)} {currency}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandHeart className="h-4 w-4 text-primary" />
            الخطوة 2 — تحديد وعاء النشاط التجاري (يُزكّى)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">إجمالي الأصول التجارية النامية للمؤسسة</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={commercialAssets}
              onChange={(e) => setCommercialAssets(e.target.value)}
              placeholder="0"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              نقد وبنوك واستثمارات ومخزون البيع للأنشطة التجارية <strong>فقط</strong>، بعد عزل ما
              ورد في الخطوة 1.
            </p>
          </div>

          {netCommercial > 0 && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold">
                  <Calculator className="h-4 w-4" />
                  الزكاة التقديرية على النشاط التجاري
                </span>
                <Badge className="text-base">
                  {fmt(estimatedZakat)} {currency}
                </Badge>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                = {fmt(netCommercial)} × 2.5% (بعد استبعاد {fmt(excluded)} من الأصول غير الزكوية)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="outline">الخطوة 3</Badge>
          <span className="text-sm font-semibold">
            تفصيل حساب زكاة النشاط التجاري (منهج الشركة)
          </span>
        </div>
        <CompanyWizard />
      </div>
    </div>
  );
}
