import { createFileRoute } from "@tanstack/react-router";
import { TeachersZakatPortal } from "@/components/zakat/TeachersZakatPortal";

export const Route = createFileRoute("/teachers-zakat")({
  head: () => ({
    meta: [
      { title: "بوابة دخل وزكاة المعلمين والتربويين — منصة نِصاب" },
      {
        name: "description",
        content:
          "احسب زكاة دخل المعلم والمعلمة بكافة بنوده (الراتب الأساسي، بدلات التدريس والصفوف، الدروس الخصوصية، والمكافآت) وفق المعايير الشرعية المعتمدة.",
      },
      { property: "og:title", content: "بوابة دخل وزكاة المعلمين والتربويين" },
      {
        property: "og:description",
        content: "حاسبة متخصصة لحساب زكاة الكادر التعليمي بدقة مع خيارات الفتاوى وتصدير التقارير.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachersZakatRoutePage,
});

function TeachersZakatRoutePage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8 px-4">
      <TeachersZakatPortal currencyName="ر.س" />
    </div>
  );
}
