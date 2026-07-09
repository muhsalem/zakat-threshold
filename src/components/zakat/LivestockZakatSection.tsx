import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beef, Info } from "lucide-react";
import { camelZakat, cowZakat, sheepZakat } from "@/lib/zakat";

/**
 * زكاة بهيمة الأنعام (الإبل، البقر/الجاموس، الغنم).
 * شروط الوجوب: بلوغ النصاب، حولان الحول، السوم (الرعي في الكلأ المباح) عند الجمهور.
 * المراجع: صحيح البخاري (كتاب الزكاة)، الموطّأ، AAOIFI معيار 35 / ملحق 4.
 */
export default function LivestockZakatSection() {
  const [camels, setCamels] = useState(0);
  const [cows, setCows] = useState(0);
  const [sheep, setSheep] = useState(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Beef className="h-5 w-5 text-primary" />
          زكاة بهيمة الأنعام (الإبل والبقر والغنم)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm leading-relaxed">
            تجب الزكاة في الأنعام السائمة (الراعية أكثر الحول في الكلأ المباح) إذا بلغت النصاب وحال
            عليها الحول. النصاب: الإبل ≥ 5، البقر ≥ 30، الغنم ≥ 40. مصدر: السنّة المتواترة، ومعيار
            AAOIFI 35.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="camels" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camels">الإبل</TabsTrigger>
            <TabsTrigger value="cows">البقر / الجاموس</TabsTrigger>
            <TabsTrigger value="sheep">الغنم</TabsTrigger>
          </TabsList>

          <TabsContent value="camels" className="space-y-3 pt-4">
            <Label htmlFor="camels">عدد الإبل المملوكة سائمة</Label>
            <Input
              id="camels"
              type="number"
              min={0}
              value={camels || ""}
              onChange={(e) => setCamels(Number(e.target.value) || 0)}
            />
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm">
              <div className="font-bold mb-1">المقدار الواجب:</div>
              <Badge variant="secondary" className="text-base">
                {camelZakat(camels)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              من 25 إلى 120 يتغيّر الواجب من الإبل نفسها (بنت مخاض، بنت لبون، حقّة، جذعة) ثم في كل
              50 حقة وكل 40 بنت لبون.
            </p>
          </TabsContent>

          <TabsContent value="cows" className="space-y-3 pt-4">
            <Label htmlFor="cows">عدد البقر/الجاموس المملوك سائماً</Label>
            <Input
              id="cows"
              type="number"
              min={0}
              value={cows || ""}
              onChange={(e) => setCows(Number(e.target.value) || 0)}
            />
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm">
              <div className="font-bold mb-1">المقدار الواجب:</div>
              <Badge variant="secondary" className="text-base">
                {cowZakat(cows)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              يُضمّ الجاموس إلى البقر. في كل 30: تبيع (عمر سنة)، وفي كل 40: مسنّة (عمر سنتين).
            </p>
          </TabsContent>

          <TabsContent value="sheep" className="space-y-3 pt-4">
            <Label htmlFor="sheep">عدد الغنم/الماعز المملوك سائماً</Label>
            <Input
              id="sheep"
              type="number"
              min={0}
              value={sheep || ""}
              onChange={(e) => setSheep(Number(e.target.value) || 0)}
            />
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm">
              <div className="font-bold mb-1">المقدار الواجب:</div>
              <Badge variant="secondary" className="text-base">
                {sheepZakat(sheep)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              40-120: شاة، 121-200: شاتان، 201-399: ثلاث شياه، ثم في كل مئة شاة.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
