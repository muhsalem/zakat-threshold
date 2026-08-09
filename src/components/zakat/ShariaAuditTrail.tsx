import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface Row {
  pot: string;
  rule: string;
  rate: string;
  refs: string[];
}

const ROWS: Row[] = [
  {
    pot: "النقد والحسابات والبطاقات والمحافظ البنكية",
    rule: "تُزكَّى بقيمتها كاملةً إذا بلغت النصاب وحال عليها الحول",
    rate: "2.5%",
    refs: ["AAOIFI · المعيار 35", "بيت الزكاة الكويتي · النقد", "قرار المجمع الفقهي الإسلامي 1/3"],
  },
  {
    pot: "الأوراق المالية (أسهم/صكوك/سندات) ووثائق التأمين",
    rule: "للتجارة: القيمة السوقية. للاستثمار: الموجودات الزكوية فقط. التأمين التكافلي: حصة المؤمَّن من حساب المشتركين",
    rate: "2.5%",
    refs: ["AAOIFI · المعيار 21", "قرار المجمع الفقهي 4/4 (28)", "ندوة قضايا الزكاة المعاصرة 11"],
  },
  {
    pot: "الأوراق التجارية (شيكات/كمبيالات/أذون خزانة)",
    rule: "الشيكات والكمبيالات الموثوقة السداد تُزكَّى بقيمتها. الديون المشكوك فيها تُزكَّى عند القبض",
    rate: "2.5%",
    refs: ["ابن قدامة · المغني 4/24", "AAOIFI · المعيار 30"],
  },
  {
    pot: "الأصول الرقمية والمحافظ الاستثمارية (Crypto)",
    rule: "العملات المشفّرة تُزكَّى كنقد بالقيمة السوقية يوم الحول",
    rate: "2.5%",
    refs: [
      "دار الإفتاء المصرية 2018",
      "هيئة كبار العلماء التركية 2017",
      "بيت الفتوى الفلسطيني 2020",
    ],
  },
  {
    pot: "الدخل وعروض التجارة والمستغلات والإيرادات",
    rule: "عروض التجارة: القيمة السوقية + النقد + الديون − الالتزامات. المستغلات (إيجار): على صافي الإيراد فقط",
    rate: "2.5%",
    refs: ["AAOIFI · المعيار 35 بند 6", "قرار المجمع الفقهي 2/2", "أبو عبيد · الأموال"],
  },
  {
    pot: "العقار (أرض/مبنى/كليهما)",
    rule: "عقار التجارة: على كامل القيمة السوقية. عقار الاستغلال: على صافي الإيراد بعد المصاريف",
    rate: "2.5%",
    refs: ["قرار المجمع الفقهي 2/2", "بيت الزكاة الكويتي · دليل العقار"],
  },
  {
    pot: "الزروع والثمار",
    rule: "إذا بلغت النصاب (653 كجم) وكانت مما يُكال ويُدّخر. النصاب على المحصول لا القيمة",
    rate: "10% بَعْل · 5% بسقي · 7.5% مختلط",
    refs: ["البخاري 1483", "AAOIFI · المعيار 35 بند 7"],
  },
  {
    pot: "الأنعام (إبل/بقر/غنم)",
    rule: "السائمة الراعية إذا بلغت النصاب وحال عليها الحول. تخرج عينًا (شياه/بنت لبون...)",
    rate: "حسب الجدول",
    refs: ["البخاري 1454 - كتاب الزكاة", "الموطأ · مالك 1/256"],
  },
  {
    pot: "الركاز والمعادن",
    rule: "الركاز (الكنز المدفون قبل الإسلام): الخمس فورًا بلا نصاب ولا حول. المعادن: عند الجمهور 2.5%",
    rate: "20% للركاز · 2.5% للمعادن",
    refs: ["البخاري 1499", "ابن قدامة · المغني 4/239"],
  },
];

export function ShariaAuditTrail() {
  return (
    <Card className="shadow-soft border-success/30">
      <CardHeader className="bg-gradient-to-l from-success/10 to-transparent pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-success" />
          سجل التدقيق الشرعي للأوعية الزكوية
          <Badge variant="outline" className="text-[10px] me-auto">
            AAOIFI · المجامع الفقهية · بيت الزكاة
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-end">
                <th className="p-2 font-semibold">الوعاء</th>
                <th className="p-2 font-semibold">الحكم الشرعي</th>
                <th className="p-2 font-semibold">المعدل</th>
                <th className="p-2 font-semibold">المرجع</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i} className="border-t border-border/50 align-top hover:bg-accent/30">
                  <td className="p-2 font-semibold text-foreground/90 whitespace-nowrap">
                    {r.pot}
                  </td>
                  <td className="p-2 leading-relaxed text-muted-foreground">{r.rule}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {r.rate}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {r.refs.map((ref, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] font-normal">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          <b>ملاحظة:</b> هذا السجل استرشادي يوثّق المراجع الفقهية المعتمدة لكل وعاء. للحالات الخاصة
          يُرجى مراجعة دار الإفتاء المختصة.
        </p>
      </CardContent>
    </Card>
  );
}
