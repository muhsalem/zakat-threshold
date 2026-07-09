import { createFileRoute } from "@tanstack/react-router";
import { CropsZakatSection } from "@/components/zakat/CropsZakatSection";

export const Route = createFileRoute("/crops")({
  head: () => ({
    meta: [
      { title: "حاسبة زكاة الزروع والثمار — النصاب والمعدّلات" },
      {
        name: "description",
        content:
          "احسب زكاة المحاصيل الزراعية والثمار وفق نصاب الـ 5 أوسق ومعدّلات 10%/7.5%/5% حسب طبيعة الري.",
      },
      { property: "og:title", content: "زكاة الزروع والثمار" },
      {
        property: "og:description",
        content: "حاسبة شرعية لزكاة المحاصيل والبيوت المحمية وفق قول الجمهور.",
      },
    ],
  }),
  component: CropsPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">خطأ: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

function CropsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">حاسبة زكاة الزروع والثمار</h1>
        <p className="text-muted-foreground">
          احسب الزكاة الواجبة على محاصيلك عند الحصاد، مع تطبيق المعدّل الصحيح بحسب نوع الري.
        </p>
      </header>
      <CropsZakatSection />
    </div>
  );
}
