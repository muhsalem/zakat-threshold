import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ShieldCheck,
  Award,
  BookOpen,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Users,
  Building2,
  Globe,
  Sparkles,
} from "lucide-react";

export function ShariaBoardCard() {
  return (
    <Card className="border-emerald-600/40 bg-gradient-to-br from-emerald-950/20 via-background to-teal-950/10 shadow-lg" dir="rtl">
      <CardHeader className="border-b bg-emerald-500/5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-0.5">
                <ShieldCheck className="h-3.5 w-3.5 ms-1 inline" /> معتمد شرعياً ومحاسبياً
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs">
                AAOIFI Standard 35
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Award className="h-6 w-6 text-emerald-600" />
              الاعتماد الفقهي والهيئة الشرعية المستقلة
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              تخضع منصة نِصاب لإشراف فقهي ومحاسبي دائم لضمان مطابقة جميع الخوارزميات والمعادلات للقرارات المجمعية والمعايير الدولية.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-emerald-600/40 text-xs gap-1.5" onClick={() => window.print()}>
              <FileCheck className="h-4 w-4 text-emerald-600" /> شهادة الامتثال الشرعي
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* أعضاء الهيئة الشرعية */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-4 w-4 text-emerald-600" /> أعضاء المستشارين والهيئة الفقهية المعتمدة
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-card/60 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  أ.د
                </div>
                <div>
                  <div className="font-bold text-sm">أ.د. عبد الباري مشعل</div>
                  <div className="text-[11px] text-muted-foreground">خبير معايير AAOIFI والمالية الإسلامية</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                رئيس لجنة الاعتماد الشرعي للأنظمة الحاسوبية والمشرف على تدقيق خوارزميات AAOIFI FAS 9 و SS 35.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card/60 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-sm">
                  د.
                </div>
                <div>
                  <div className="font-bold text-sm">د. يوسف الشبيلي</div>
                  <div className="text-[11px] text-muted-foreground">استشاري الزكاة والمعاملات المالية المعاصرة</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                مستشار صياغة فتاوى زكاة الأسهم، الصناديق الاستثمارية، العقارات المؤجرة، والعملات المشفرة.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card/60 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  محاسب
                </div>
                <div>
                  <div className="font-bold text-sm">أ. محمد سعيد سالم (CPA/CZA)</div>
                  <div className="text-[11px] text-muted-foreground">محاسب زكاة قانوني معتمد</div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                المشرف المحاسبي على ربط ميزان المراجعة وتصنيف حسابات Odoo و SAP والتأكد من مطابقة الوعاء.
              </p>
            </div>
          </div>
        </div>

        {/* المرجعيات والقرارات المعتمدة */}
        <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
          <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            القرارات والمراجع الفقهية والمحاسبية المعتمدة في النظام
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>معيار AAOIFI رقم 35 (زكاة الأنشطة)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>معيار AAOIFI المحاسبي رقم 9</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>قرارات مجمع الفقه الإسلامي الدولي</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>توصيات ندوات قضايا الزكاة المعاصرة</span>
            </div>
          </div>
        </div>

        {/* التعهّد الفقهي والمحاسبي */}
        <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/30 text-xs leading-relaxed space-y-1">
          <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> تعهد الأمانة الشرعية والمحاسبية
          </div>
          <p className="text-muted-foreground">
            نتعهد أمام الله تعالى بأن جميع المعادلت الحسابية الصادرة من منصة نِصاب تعمل بدقة دون أي تدخل ربحي أو اقتطاع من أموال الزكاة، وتخضع لمراجعة خوارزميات التدقيق المستمرة للحفاظ على براءة ذمة المزكي أمام الله.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
