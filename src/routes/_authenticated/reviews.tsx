import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ListChecks, Loader2, Info, Calculator, ScrollText, ArrowLeft } from "lucide-react";
import {
  listMyAllReviews,
  type ReviewMetaStatus,
  type UnifiedReviewItem,
} from "@/lib/reviewsCenter.functions";

const META_LABEL: Record<ReviewMetaStatus, string> = {
  needs_action: "بحاجة إجراء منك",
  pending: "بانتظار الدور",
  in_progress: "قيد المراجعة",
  done: "مكتمل",
  cancelled: "ملغى/مسحوب",
};
const META_CLASS: Record<ReviewMetaStatus, string> = {
  needs_action: "text-destructive border-destructive/40",
  pending: "text-amber-600 border-amber-500/40",
  in_progress: "text-primary border-primary/40",
  done: "text-emerald-600 border-emerald-500/40",
  cancelled: "text-muted-foreground border-muted",
};
const KIND_LABEL: Record<UnifiedReviewItem["kind"], string> = {
  accountant: "مراجعة محاسبية",
  sharia: "مراجعة شرعية",
};

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsCenterPage,
  head: () => ({
    meta: [
      { title: "مركز المراجعات | نِصاب" },
      {
        name: "description",
        content:
          "كل طلبات المراجعة الخاصة بك في مكان واحد — المراجعة المحاسبية للتقارير والمراجعة الشرعية للمسائل الفقهية.",
      },
    ],
  }),
});

function ReviewsCenterPage() {
  const listFn = useServerFn(listMyAllReviews);
  const { data, isLoading } = useQuery({
    queryKey: ["my-all-reviews"],
    queryFn: () => listFn(),
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6" dir="rtl">
      <div className="flex items-center gap-2">
        <ListChecks className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">مركز المراجعات</h1>
      </div>

      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          عرض موحَّد لنوعين منفصلين من المراجعة البشرية: <b>مراجعة محاسبية</b> (اعتماد تقرير زكاة
          محتسَب آلياً من محاسب) و<b>مراجعة شرعية</b> (فتوى في مسألة فقهية محدَّدة من مشرف/عالِم).
          كل نوع له فريقه ومساره الخاص — هذه الصفحة لتتبّع الحالة فقط في مكان واحد.
        </AlertDescription>
      </Alert>

      {isLoading && (
        <div className="text-center py-16">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            لا توجد طلبات مراجعة بعد.
            <div className="flex justify-center gap-3 mt-4">
              <Link to="/client-intake" className="text-primary underline text-xs inline-flex items-center gap-1">
                <Calculator className="h-3.5 w-3.5" /> اطلب تقريراً شاملاً
              </Link>
              <Link to="/sharia-review" className="text-primary underline text-xs inline-flex items-center gap-1">
                <ScrollText className="h-3.5 w-3.5" /> اطلب مراجعة شرعية
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(data ?? []).map((item) => (
          <Link key={`${item.kind}-${item.id}`} to={item.link} className="block">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    {item.kind === "accountant" ? (
                      <Calculator className="h-4 w-4 text-primary" />
                    ) : (
                      <ScrollText className="h-4 w-4 text-primary" />
                    )}
                    {item.title}
                    <Badge variant="outline" className="text-[10px]">
                      {KIND_LABEL[item.kind]}
                    </Badge>
                  </span>
                  <Badge variant="outline" className={META_CLASS[item.metaStatus]}>
                    {META_LABEL[item.metaStatus]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{item.statusLabel}</span>
                <span className="flex items-center gap-1">
                  {new Date(item.createdAt).toLocaleDateString("ar-EG")}
                  <ArrowLeft className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
