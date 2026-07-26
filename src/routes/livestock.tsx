import { createFileRoute } from "@tanstack/react-router";
import LivestockDetailedForm from "@/components/zakat/LivestockDetailedForm";
import { Beef } from "lucide-react";

export const Route = createFileRoute("/livestock")({
  head: () => ({
    meta: [
      { title: "زكاة الأنعام السائمة — إدخال تفصيلي | نصاب" },
      {
        name: "description",
        content:
          "شاشة تفصيلية لحساب زكاة الأنعام السائمة (الإبل، البقر، الغنم) مع التحقق من شروط السوم والعلف والماء وفق فتاوى المجامع الفقهية.",
      },
      { property: "og:title", content: "زكاة الأنعام السائمة — حاسبة تفصيلية" },
      {
        property: "og:description",
        content: "احسب زكاة أنعامك السائمة بدقة مع مراعاة نسبة العلف وأيام الرعي والسقيا.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivestockPage,
});

function LivestockPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-8" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Beef className="h-6 w-6 text-primary" />
          زكاة الأنعام السائمة
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أدخل بيانات القطيع بالتفصيل لتحديد المقدار الواجب حسب جداول الفقه الكلاسيكي ومعيار
          AAOIFI 35.
        </p>
      </div>
      <LivestockDetailedForm />
    </div>
  );
}
