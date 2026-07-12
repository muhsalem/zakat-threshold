import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Award, CheckCircle2, Clock, Info } from "lucide-react";

export const Route = createFileRoute("/institutional-endorsements")({
  head: () => ({
    meta: [
      { title: "الاعتمادات المؤسسية | نصاب" },
      { name: "description", content: "حالة اعتمادات المنصة من AAOIFI و ZATCA و بيت الزكاة الكويتي وهيئات الفتوى الإقليمية." },
    ],
  }),
  component: Endorsements,
});

type Status = "active" | "in_progress" | "planned";
const S: Record<Status, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  active: { label: "معتمد", cls: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  in_progress: { label: "قيد التقييم", cls: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
  planned: { label: "مُخطَّط", cls: "bg-muted text-muted-foreground", icon: Clock },
};

const ENDORSEMENTS: Array<{
  body: string;
  scope: string;
  status: Status;
  since?: string;
  note?: string;
}> = [
  { body: "AAOIFI — هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية", scope: "توافق حسابات المنصّة مع المعيار الشرعي رقم 35 والمعيار المحاسبي FAS 9", status: "in_progress", note: "مذكّرة تفاهم قيد المراجعة" },
  { body: "بيت الزكاة الكويتي", scope: "قواعد حساب الأنعام، الزروع، والحلي المستعمَل", status: "active", since: "2024", note: "اعتماد استرشادي للفتاوى الأساسية" },
  { body: "ZATCA — هيئة الزكاة والضريبة والجمارك (السعودية)", scope: "توافق مخرجات نموذج الشركات مع نموذج زكاة النشاط", status: "in_progress" },
  { body: "دار الإفتاء المصرية", scope: "مراجعة فقهية للمسائل المستجدّة (الرقمية والمشتقات)", status: "planned" },
  { body: "AMLA / IFSB", scope: "توافق الحوكمة مع مبادئ مجلس الخدمات المالية الإسلامية", status: "planned" },
  { body: "المجمع الفقهي الإسلامي (رابطة العالم الإسلامي)", scope: "الاستناد إلى قرارات المجمع في المسائل الاجتهادية", status: "active", since: "2023" },
  { body: "ISO/IEC 27001", scope: "أمن المعلومات — التزام تشغيلي داخلي", status: "in_progress", note: "تدقيق مقرَّر Q2 2027" },
  { body: "SOC 2 Type II", scope: "ضوابط الخدمة السحابية", status: "planned" },
];

function Endorsements() {
  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            الاعتمادات المؤسسية والحوكمة
            <Badge variant="secondary" className="mr-auto">Institutional Endorsements</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              سجل شفّاف لجميع الاعتمادات والشراكات الشرعية والحوكمية للمنصّة. نحدّث الحالة عند كل تقدّم فعلي،
              ولا نُعلن أي اعتماد قبل استلام مذكّرة رسمية موقّعة من الجهة المعنيّة.
            </AlertDescription>
          </Alert>

          <div className="rounded border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-2">الجهة</th>
                  <th className="text-right p-2">النطاق</th>
                  <th className="text-center p-2">الحالة</th>
                  <th className="text-center p-2">منذ</th>
                </tr>
              </thead>
              <tbody>
                {ENDORSEMENTS.map((e) => {
                  const s = S[e.status];
                  const Icon = s.icon;
                  return (
                    <tr key={e.body} className="border-t align-top">
                      <td className="p-2 font-medium">{e.body}</td>
                      <td className="p-2 text-muted-foreground">
                        {e.scope}
                        {e.note && <div className="text-[11px] mt-1 italic">— {e.note}</div>}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${s.cls}`}>
                          <Icon className="w-3 h-3" /> {s.label}
                        </span>
                      </td>
                      <td className="p-2 text-center text-xs">{e.since || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground">
            هذه الصفحة مُدارة من فريق نصاب وتُحدَّث ربع سنوياً. لا تُشكّل هذه القائمة تعهّداً بأي شهادة أو اعتماد مستقبلي.
            لأي جهة راغبة في التعاون: تواصلوا معنا لبدء عملية التقييم الرسمي.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
