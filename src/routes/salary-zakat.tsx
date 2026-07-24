import { createFileRoute, Link } from "@tanstack/react-router";
import SalaryZakatCalculator from "@/components/zakat/SalaryZakatCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/salary-zakat")({
  head: () => ({
    meta: [
      { title: "حاسبة زكاة الراتب الشهري — نصاب" },
      {
        name: "description",
        content:
          "احسب زكاة راتبك الشهري بثلاث طرق معتمدة (سنوية، شهرية، عند القبض) وفق فتاوى المجامع الفقهية المعاصرة.",
      },
      { property: "og:title", content: "زكاة الراتب — حاسبة تفصيلية" },
      {
        property: "og:description",
        content: "ثلاث طرق شرعية لحساب زكاة الراتب الشهري مع الشرح والدليل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalaryZakatPage,
});

function SalaryZakatPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wallet className="h-6 w-6 text-primary" />
          زكاة الراتب الشهري
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          احسب زكاتك بثلاث طرق شرعية معتمدة — اختر ما يناسب وضعك المالي.
        </p>
      </div>

      <Alert className="border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                هل أنت من الكادر التعليمي والتربوي؟
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                خصصنا بوابة متكاملة لحساب زكاة بدل التدريس والصفوف والدروس الخصوصية للمدربين والمعلمين.
              </div>
            </div>
          </div>
          <Link
            to="/teachers-zakat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
          >
            الانتقال لبوابة المعلمين ←
          </Link>
        </div>
      </Alert>

      <Alert>
        <AlertDescription className="text-xs leading-6">
          <strong>الطرق الثلاث:</strong>
          <br />• <strong>السنوية:</strong> جمع كل المدخرات في نهاية الحول وحساب 2.5% عليها.
          <br />• <strong>الشهرية:</strong> إخراج 2.5% من الراتب مباشرة بعد خصم الحاجات (رأي
          القرضاوي).
          <br />• <strong>عند القبض:</strong> إخراج جزء من كل راتب بمجرد استلامه (الأيسر للموظف).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الحاسبة</CardTitle>
        </CardHeader>
        <CardContent>
          <SalaryZakatCalculator currencyName="ر.س" />
        </CardContent>
      </Card>
    </div>
  );
}
