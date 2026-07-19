import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wheat, ShieldCheck, ArrowLeft, AlertCircle, Loader2, Calendar } from "lucide-react";
import { getSharedReport } from "@/lib/archive/share.functions";

type FitrPayload = {
  peopleCount: number;
  stapleLabel: string;
  kgPerSaa: number;
  pricePerKg: number;
  totalKg: number;
  totalCash: number;
  savedAt: string;
};

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "تقرير زكاة مشترك | نِصاب" },
      { name: "description", content: "استعراض تقرير زكاة عبر رابط مشاركة آمن." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedReportView,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container max-w-2xl py-10">
        <Card><CardContent className="pt-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <div className="font-semibold">تعذّر تحميل التقرير</div>
          <p className="text-sm text-muted-foreground">{String(error?.message || error)}</p>
          <Button onClick={() => { reset(); router.invalidate(); }}>حاول مجدداً</Button>
        </CardContent></Card>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="container max-w-2xl py-10 text-center">لم يتم العثور على التقرير.</div>
  ),
});

function SharedReportView() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-report", token],
    queryFn: () => fetchShared({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-10 flex items-center gap-2 justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل…
      </div>
    );
  }

  if (error || !data) {
    const msg = String((error as Error)?.message || "");
    const label = msg.includes("EXPIRED") ? "انتهت صلاحية الرابط"
      : msg.includes("REVOKED") ? "تم إلغاء هذا الرابط"
      : msg.includes("NOT_FOUND") || msg.includes("Invalid") ? "الرابط غير صالح"
      : "تعذّر تحميل التقرير";
    return (
      <div className="container max-w-2xl py-10">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div className="font-semibold text-lg">{label}</div>
            <p className="text-sm text-muted-foreground">اطلب رابطاً جديداً من صاحب التقرير.</p>
            <Button asChild variant="outline"><Link to="/">العودة للرئيسية</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = (data.payload || {}) as Partial<FitrPayload>;
  const isFitr = data.kind === "fitr";

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> الرئيسية</Link>
        </Button>
        <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> رابط مشاركة</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isFitr && <Wheat className="h-5 w-5 text-primary" />}
            {isFitr ? "تقرير زكاة الفطر" : `تقرير ${data.kind}`} — {data.year ?? "—"}
          </CardTitle>
          <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
              حُفِظ: {new Date(data.updated_at).toLocaleDateString("ar-EG")}
            </span>
            {data.expires_at && (
              <span>ينتهي: {new Date(data.expires_at).toLocaleDateString("ar-EG")}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFitr ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="عدد الأفراد" value={String(p.peopleCount ?? "—")} />
              <Field label="القوت" value={p.stapleLabel ?? "—"} />
              <Field label="كجم/صاع" value={String(p.kgPerSaa ?? "—")} />
              <Field label="سعر الكيلو" value={`${p.pricePerKg ?? 0} ${data.currency ?? ""}`} />
              <Field label="إجمالي الوزن" value={`${(p.totalKg ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} كجم`} />
              <Field label="القيمة النقدية" value={`${(p.totalCash ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ${data.currency ?? ""}`} highlight />
            </div>
          ) : (
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto" dir="ltr">
              {JSON.stringify(data.payload, null, 2)}
            </pre>
          )}
          <p className="text-xs text-muted-foreground border-t pt-3">
            هذا التقرير مُشارَك عبر رابط آمن. يمكن للمالك إلغاؤه في أي وقت من حسابه.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded border ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold ${highlight ? "text-primary text-lg" : ""}`}>{value}</div>
    </div>
  );
}
