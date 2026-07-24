import { createFileRoute } from "@tanstack/react-router";
import { TeachersZakatPortal } from "@/components/zakat/TeachersZakatPortal";

export const Route = createFileRoute("/teachers")({
  head: () => ({
    meta: [
      { title: "بوابة دخل وزكاة المعلمين — منصة نِصاب" },
      {
        name: "description",
        content: "بوابة وحاسبة زكاة دخل الكادر التعليمي والتربوي للرواتب والدروس الخصوصية والمكافآت.",
      },
    ],
  }),
  component: TeachersRoutePage,
});

function TeachersRoutePage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8 px-4">
      <TeachersZakatPortal currencyName="ر.س" />
    </div>
  );
}
