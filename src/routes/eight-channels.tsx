import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EightChannelsDistribution } from "@/components/zakat/EightChannelsDistribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HandHeart } from "lucide-react";
import { num } from "@/lib/zakat";

export const Route = createFileRoute("/eight-channels")({
  head: () => ({
    meta: [
      { title: "خطة توزيع الزكاة على المصارف الثمانية — نصاب" },
      {
        name: "description",
        content:
          "وزّع زكاتك على المصارف الشرعية الثمانية (الفقراء، المساكين، العاملين عليها، المؤلفة قلوبهم، الرقاب، الغارمين، سبيل الله، ابن السبيل) وفق نسب مرنة قابلة للتخصيص.",
      },
      { property: "og:title", content: "المصارف الثمانية للزكاة — خطة توزيع" },
      {
        property: "og:description",
        content: "احسب حصة كل مصرف من زكاتك بنسب قابلة للتخصيص وفق حاجتك ومنطقتك.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EightChannelsPage,
});

function EightChannelsPage() {
  const [netDue, setNetDue] = useState("10000");

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HandHeart className="h-6 w-6 text-primary" />
          خطة توزيع الزكاة على المصارف الثمانية
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          قال تعالى:{" "}
          <em>
            «إنما الصدقات للفقراء والمساكين والعاملين عليها والمؤلفة قلوبهم وفي الرقاب والغارمين وفي
            سبيل الله وابن السبيل»
          </em>{" "}
          [التوبة: 60].
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-xs leading-6">
          هذه أداة إرشادية للتخطيط. النسب افتراضية تعكس ممارسات لجان الزكاة المعاصرة، ويمكنك تعديلها
          كلياً وفق أولويات منطقتك وحاجة المستحقين حولك. جمهور الفقهاء يجيز الاقتصار على بعض المصارف
          عند تحقّق الحاجة.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مبلغ الزكاة الواجبة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label className="text-xs">أدخل المبلغ الإجمالي (بعملتك)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={netDue}
              onChange={(e) => setNetDue(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <EightChannelsDistribution netDue={num(netDue)} currencyName="ر.س" />
    </div>
  );
}
