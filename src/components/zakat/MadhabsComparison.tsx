import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, BookOpen } from "lucide-react";

interface Row {
  topic: string;
  hanafi: string;
  maliki: string;
  shafii: string;
  hanbali: string;
}

const ROWS: Row[] = [
  {
    topic: "زكاة الحلي المُعدّ للاستعمال",
    hanafi: "تجب الزكاة مطلقاً",
    maliki: "لا تجب إن كان للُّبس المباح",
    shafii: "لا تجب إن كان للُّبس المباح",
    hanbali: "لا تجب إن كان للُّبس المباح (الأصح)",
  },
  {
    topic: "ربط النصاب بـ",
    hanafi: "الفضة (أنفع للفقراء)",
    maliki: "الذهب أو الفضة",
    shafii: "كل صنف بنصابه",
    hanbali: "كل صنف بنصابه",
  },
  {
    topic: "زكاة المعادن (غير الركاز)",
    hanafi: "الخُمس (20%) مطلقاً",
    maliki: "ربع العشر (2.5%)",
    shafii: "ربع العشر في الذهب والفضة فقط",
    hanbali: "ربع العشر بعد بلوغ النصاب",
  },
  {
    topic: "زكاة الديون المرجوّة",
    hanafi: "تجب عند القبض لما مضى",
    maliki: "زكاة واحدة عند القبض",
    shafii: "تجب كل عام كالحاضر",
    hanbali: "تجب كل عام تُخرج عند القبض",
  },
  {
    topic: "ضمّ الأموال (الذهب + الفضة + نقد)",
    hanafi: "تُضم بالقيمة لإكمال النصاب",
    maliki: "تُضم لإكمال النصاب",
    shafii: "لا تُضم (كل صنف مستقل)",
    hanbali: "لا تُضم على الأصح",
  },
  {
    topic: "إخراج القيمة بدل العين",
    hanafi: "يجوز مطلقاً",
    maliki: "لا يجوز إلا للحاجة",
    shafii: "لا يجوز إلا في زكاة التجارة",
    hanbali: "لا يجوز إلا للحاجة (الأصح)",
  },
  {
    topic: "تعجيل الزكاة قبل الحول",
    hanafi: "يجوز لسنوات",
    maliki: "لا يجوز",
    shafii: "يجوز لسنة واحدة",
    hanbali: "يجوز لسنتين",
  },
];

export function MadhabsComparison() {
  return (
    <div dir="rtl" className="space-y-4 text-right">
      <Card className="shadow-soft border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            مقارنة المذاهب الأربعة في المسائل الزكوية الخلافية
          </CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            <BookOpen className="h-3 w-3 inline ml-1" />
            مرجع مختصر للأقوال المعتمدة في المذاهب الأربعة. للحالات الخاصة يُرجى الرجوع لمفتٍ معتمد.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs md:text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-muted/60">
                  <th className="p-2 text-right border border-border font-bold">المسألة</th>
                  <th className="p-2 text-right border border-border font-bold text-primary">الحنفية</th>
                  <th className="p-2 text-right border border-border font-bold text-primary">المالكية</th>
                  <th className="p-2 text-right border border-border font-bold text-primary">الشافعية</th>
                  <th className="p-2 text-right border border-border font-bold text-primary">الحنابلة</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-muted/20" : ""}>
                    <td className="p-2 border border-border font-semibold">{r.topic}</td>
                    <td className="p-2 border border-border leading-relaxed">{r.hanafi}</td>
                    <td className="p-2 border border-border leading-relaxed">{r.maliki}</td>
                    <td className="p-2 border border-border leading-relaxed">{r.shafii}</td>
                    <td className="p-2 border border-border leading-relaxed">{r.hanbali}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">المراجع: الموسوعة الفقهية الكويتية</Badge>
            <Badge variant="outline">معايير AAOIFI رقم 35</Badge>
            <Badge variant="outline">المغني لابن قدامة</Badge>
            <Badge variant="outline">المجموع للنووي</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
