import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, BookOpen } from "lucide-react";

export function ShariaBoardCard() {
  return (
    <Card className="shadow-soft border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          المرجعية الشرعية والاعتماد
          <Badge variant="outline" className="text-[10px] mr-auto">
            Sharia Governance
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs leading-relaxed">
        <Alert className="border-primary/20 bg-primary/5">
          <BookOpen className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>
              تستند هذه الحاسبة إلى المعايير والمصادر الفقهية المعتمدة دولياً، وتلتزم بمنهجية
              الحوكمة الشرعية المعمول بها في المؤسسات المالية الإسلامية.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-2">
          <div className="rounded-md border border-primary/15 bg-card p-2.5 space-y-1">
            <div className="font-semibold text-primary">المعايير المرجعية</div>
            <ul className="list-disc pr-4 space-y-0.5">
              <li>AAOIFI — معيار الزكاة رقم (35)</li>
              <li>AAOIFI — معيار العملات الرقمية (59)</li>
              <li>مجمع الفقه الإسلامي الدولي (جدة)</li>
              <li>المجمع الفقهي الإسلامي (رابطة العالم الإسلامي)</li>
              <li>هيئة كبار العلماء (السعودية)</li>
              <li>دار الإفتاء المصرية والأردنية والكويتية</li>
            </ul>
          </div>
          <div className="rounded-md border border-primary/15 bg-card p-2.5 space-y-1">
            <div className="font-semibold text-primary">منهجية الحوكمة الشرعية</div>
            <ul className="list-disc pr-4 space-y-0.5">
              <li>قابلية الترجيح بين المذاهب الأربعة</li>
              <li>توثيق المرجع الفقهي لكل بند حسابي</li>
              <li>سجل تدقيق شرعي قابل للتصدير (Audit Trail)</li>
              <li>تحديث دوري للأسعار والنصاب وفق مصادر موثّقة</li>
              <li>إخلاء مسؤولية: نتائج تقديرية لا تُغني عن المفتي</li>
            </ul>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
          نسعى لاعتماد رسمي من هيئة شرعية مستقلة. للاستفسار الفقهي اعتمد على دار الإفتاء في بلدك أو
          هيئة شرعية معتمدة.
        </p>
      </CardContent>
    </Card>
  );
}
