import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { VerifyReportPanel } from "@/components/verify/VerifyReportPanel";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "التحقق من صحّة شهادة الزكاة | نِصاب" },
      {
        name: "description",
        content:
          "تحقّق من أصالة تقرير الزكاة الصادر عن منصّة نِصاب — تحقّق مشفَّر بمعرِّف الشهادة، البصمة، وطريقة الحساب، دون الحاجة لتسجيل الدخول.",
      },
      { property: "og:title", content: "التحقق من شهادة الزكاة — نِصاب" },
      {
        property: "og:description",
        content: "أداة تحقق فوري وشفاف من صحّة شهادات الزكاة الصادرة عن نِصاب.",
      },
      { property: "og:url", content: "/verify" },
    ],
    links: [{ rel: "canonical", href: "/verify" }],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 py-10 px-4 text-end">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowRight className="h-4 w-4 rotate-180" /> العودة إلى الحاسبة
        </Link>
        <VerifyReportPanel syncUrl />
      </div>
    </div>
  );
}
