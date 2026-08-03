import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyPdfReport } from "@/lib/pdf/reports.functions";

export const Route = createFileRoute("/verify_/$token")({
  head: () => ({
    meta: [
      { title: "تحقق من التقرير · نِصاب" },
      { name: "description", content: "صفحة التحقق من أصالة تقرير زكاة صادر عن منصة نِصاب." },
      { property: "og:title", content: "تحقق من التقرير" },
      { property: "og:description", content: "التحقق من التقارير الصادرة عن نِصاب." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyReportPage,
});

function VerifyReportPage() {
  const { token } = Route.useParams();
  const verifyFn = useServerFn(verifyPdfReport);
  const { data, isLoading } = useQuery({
    queryKey: ["verify-report", token],
    queryFn: () => verifyFn({ data: { token } }),
  });

  return (
    <div dir="rtl" className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>التحقق من تقرير زكاة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p>جاري التحقق…</p>
          ) : !data?.found ? (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>لم يُعثر على تقرير بهذا الرمز.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">تقرير أصلي صادر عن منصة نِصاب</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                <div>
                  <div className="text-muted-foreground">رقم التقرير</div>
                  <div className="font-mono">{data.report_uid}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">العنوان</div>
                  <div>{data.title}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">النوع</div>
                  <Badge variant="outline">{data.kind}</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">النسخة</div>
                  <div>v{data.version}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">الحالة</div>
                  <Badge>{data.status}</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">تاريخ الإصدار</div>
                  <div>{new Date(data.created_at).toLocaleString("ar-EG")}</div>
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground">بصمة المحتوى (SHA-256)</div>
                <div className="font-mono text-[10px] break-all">{data.content_hash}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
