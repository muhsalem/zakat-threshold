import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Award, BookOpen, CheckCircle2, FileCheck, Users } from "lucide-react";

/**
 * حالة الاعتماد الشرعي المؤسسي — ابقِها فارغة حتى يوجد تعاقد فعلي موقَّع
 * وموثَّق (contractUrl لملف/شهادة حقيقية قابلة للتحقق). لا تُدرَج هنا أي
 * جهة أو اسم دون توثيق فعلي — العرض أدناه مشروط بوجود بيانات هنا فقط.
 */
interface VerifiedShariaBoardEntry {
  name: string;
  credential: string;
  contractSignedAt: string;
  contractUrl: string;
}
const VERIFIED_SHARIA_BOARD: VerifiedShariaBoardEntry[] = [];

export function ShariaBoardCard() {
  const hasVerifiedBoard = VERIFIED_SHARIA_BOARD.length > 0;
  return (
    <Card className="border-success/40 bg-gradient-to-br from-success/20 via-background to-teal-950/10 shadow-lg" dir="rtl">
      <CardHeader className="border-b bg-success/5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                className={hasVerifiedBoard ? "bg-success text-white text-xs px-2.5 py-0.5" : "bg-warning text-white text-xs px-2.5 py-0.5"}
              >
                <ShieldCheck className="h-3.5 w-3.5 ms-1 inline" />
                {hasVerifiedBoard ? "معتمد شرعياً موثَّقاً" : "الاعتماد الشرعي المؤسسي: قيد الإجراء"}
              </Badge>
              <Badge variant="outline" className="border-success/40 text-success dark:text-success text-xs">
                خوارزميات مبنية وفق AAOIFI Standard 35
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Award className="h-6 w-6 text-success" />
              الاعتماد الفقهي والهيئة الشرعية المستقلة
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {hasVerifiedBoard
                ? "تخضع منصة نِصاب لإشراف فقهي ومحاسبي دائم لضمان مطابقة جميع الخوارزميات والمعادلات للقرارات المجمعية والمعايير الدولية."
                : "الخوارزميات مبنية على معايير AAOIFI والقرارات المجمعية المنشورة، لكن لا توجد بعد هيئة رقابة شرعية مستقلة متعاقَد معها بشكل موثَّق. نعمل على التعاقد مع جهة اعتماد شرعي متخصصة — سيظهر هنا اسمها وشهادتها فور توقيع العقد فعلياً، لا قبل ذلك."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!hasVerifiedBoard && (
          <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-xs leading-relaxed text-muted-foreground">
            <b className="text-foreground">للمستخدم: </b>
            هذه المنصة تطبّق خوارزمياً معايير AAOIFI 35 وAAOIFI 9 وقرارات مجمع الفقه الإسلامي الدولي كما هي منشورة،
            لكنها لا تحمل حتى الآن اعتماداً من هيئة رقابة شرعية مستقلة موقِّعة. لا تُغني نتائج الحاسبة عن مراجعة مفتٍ
            أو محاسب زكاة مرخّص قبل اعتماد أي تقرير في قرارات مالية أو شرعية جوهرية.
          </div>
        )}

        {hasVerifiedBoard && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-success" /> أعضاء الهيئة الشرعية الموثَّقون
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VERIFIED_SHARIA_BOARD.map((m) => (
                <div key={m.name} className="p-4 rounded-xl border bg-card/60 space-y-2">
                  <div className="font-bold text-sm">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.credential}</div>
                  <a
                    href={m.contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-success hover:underline flex items-center gap-1"
                  >
                    <FileCheck className="h-3 w-3" /> عقد التعاقد الموقَّع ({m.contractSignedAt})
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* المرجعيات والقرارات المعتمدة */}
        <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
          <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <BookOpen className="h-4 w-4 text-success" />
            القرارات والمراجع الفقهية والمحاسبية المعتمدة في النظام
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span>معيار AAOIFI رقم 35 (زكاة الأنشطة)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span>معيار AAOIFI المحاسبي رقم 9</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span>قرارات مجمع الفقه الإسلامي الدولي</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span>توصيات ندوات قضايا الزكاة المعاصرة</span>
            </div>
          </div>
        </div>

        {/* التعهّد الفقهي والمحاسبي */}
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-xs leading-relaxed space-y-1">
          <div className="font-bold text-success dark:text-success flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-success" /> تعهد الأمانة الشرعية والمحاسبية
          </div>
          <p className="text-muted-foreground">
            نتعهد أمام الله تعالى بأن جميع المعادلت الحسابية الصادرة من منصة نِصاب تعمل بدقة دون أي تدخل ربحي أو اقتطاع من أموال الزكاة، وتخضع لمراجعة خوارزميات التدقيق المستمرة للحفاظ على براءة ذمة المزكي أمام الله.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
