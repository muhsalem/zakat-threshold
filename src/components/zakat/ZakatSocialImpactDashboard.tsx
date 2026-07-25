import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  HeartHandshake,
  Users,
  GraduationCap,
  Home,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  PieChart,
  Target,
  Award,
  Globe,
  Coins,
} from "lucide-react";
import { fmt } from "@/lib/zakat";

interface ZakatSocialImpactDashboardProps {
  currencyName?: string;
  totalZakatCollected?: number;
}

export function ZakatSocialImpactDashboard({
  currencyName = "ر.س",
  totalZakatCollected = 2500000,
}: ZakatSocialImpactDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "recipients" | "sdg">("overview");

  // توزيع التمكين الأثر التنموي
  const impactStats = useMemo(() => {
    const familiesEmpowered = Math.floor(totalZakatCollected / 15000);
    const studentsSponsored = Math.floor(totalZakatCollected / 5000);
    const medicalCasesCovered = Math.floor(totalZakatCollected / 10000);
    const microProjectsFunded = Math.floor(totalZakatCollected / 25000);

    return {
      familiesEmpowered,
      studentsSponsored,
      medicalCasesCovered,
      microProjectsFunded,
    };
  }, [totalZakatCollected]);

  return (
    <Card className="border-emerald-600/30 shadow-md bg-card" dir="rtl">
      <CardHeader className="bg-emerald-500/5 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-emerald-600" />
              لوحة الأثر الاجتماعي والتنموي للزكاة (Impact Dashboard)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              قياس أثر تحويل أموال الزكاة من الاستهلاك إلى التمكين الاقتصادي والتنمية المستدامة.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border">
            <Button
              size="sm"
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => setActiveTab("overview")}
              className="h-7 text-xs"
            >
              نظرة عامة
            </Button>
            <Button
              size="sm"
              variant={activeTab === "recipients" ? "default" : "ghost"}
              onClick={() => setActiveTab("recipients")}
              className="h-7 text-xs"
            >
              المصارف الثمانية
            </Button>
            <Button
              size="sm"
              variant={activeTab === "sdg" ? "default" : "ghost"}
              onClick={() => setActiveTab("sdg")}
              className="h-7 text-xs"
            >
              أهداف التنمية المستدامة (SDGs)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        {/* نظرة عامة */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-1">
                  <Home className="h-4 w-4 text-emerald-600" /> أسر تم نقلها للإنتاج
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {fmt(impactStats.familiesEmpowered)} <span className="text-xs font-normal">أسرة</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-teal-500/10 border-teal-500/30">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 text-xs font-semibold mb-1">
                  <GraduationCap className="h-4 w-4 text-teal-600" /> طلاب تم كفالتهم
                </div>
                <div className="text-xl font-black text-teal-600 dark:text-teal-400">
                  {fmt(impactStats.studentsSponsored)} <span className="text-xs font-normal">طالب</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-blue-500/10 border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-xs font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> حالات علاجية مغطاة
                </div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                  {fmt(impactStats.medicalCasesCovered)} <span className="text-xs font-normal">حالة</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/30">
                <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 text-xs font-semibold mb-1">
                  <Target className="h-4 w-4 text-indigo-600" /> مشاريع صغيرة مموّلة
                </div>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {fmt(impactStats.microProjectsFunded)} <span className="text-xs font-normal">مشروع</span>
                </div>
              </div>
            </div>

            {/* شريط تقدم كفاءة التوزيع */}
            <div className="p-4 rounded-xl border space-y-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">نسبة وصول الزكاة المباشرة للمستحقين (Direct Delivery Rate):</span>
                <span className="font-extrabold text-emerald-600">98.5% (صفر اقتطاع إداري)</span>
              </div>
              <Progress value={98.5} className="h-2 bg-emerald-200 dark:bg-emerald-950" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يتم توجيه أموال الزكاة بالكامل إلى حسابات الجمعيات المعتمدة والمستحقين الفعليين دون احتساب أي مصاريف تشغيلية من أصل الزكاة.
              </p>
            </div>
          </div>
        )}

        {/* المصارف الثمانية */}
        {activeTab === "recipients" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="font-bold text-emerald-700 dark:text-emerald-300">1. الفقراء والمساكين (45%)</div>
              <p className="text-muted-foreground">تغطية الاحتياجات الأساسية للطعام والسكن والخدمات الطبية.</p>
            </div>

            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="font-bold text-teal-700 dark:text-teal-300">2. الغارمون (20%)</div>
              <p className="text-muted-foreground">سداد ديون المعسرين الذين سُجنوا أو هُددوا بسبب ديون استهلاكية بديهية.</p>
            </div>

            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="font-bold text-blue-700 dark:text-blue-300">3. في سبيل الله وتدريس العلم (20%)</div>
              <p className="text-muted-foreground">دعم الأوقاف التعليمية، كفالة طالب العلم، ورعاية كتاتيب المدارس.</p>
            </div>

            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="font-bold text-indigo-700 dark:text-indigo-300">4. ابن السبيل والرقاب والعاملين (15%)</div>
              <p className="text-muted-foreground">إغاثة المسافرين المنقطعين وتيسير السبل وتحقيق التكافل.</p>
            </div>
          </div>
        )}

        {/* أهداف التنمية المستدامة */}
        {activeTab === "sdg" && (
          <div className="p-4 rounded-xl border bg-muted/30 space-y-3 text-xs">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-600" />
              التوافق مع أهداف التنمية المستدامة للأمم المتحدة (UN SDGs)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200">
                <strong>SDG 1: القضاء على الفقر</strong>
                <p className="text-[10px] mt-0.5">تحويل الأسر المعوزة إلى عناصر منتجة عبر القروض الحسنة والمشاريع.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                <strong>SDG 4: التعليم الجيد</strong>
                <p className="text-[10px] mt-0.5">تمويل المنح الدراسية والمستلزمات التعليمية لطلاب الأسر العفيفة.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                <strong>SDG 8: العمل اللائق والنمو</strong>
                <p className="text-[10px] mt-0.5">تنمية المهارات الحرفية وتأسيس مشروعات صغيرة مستدامة.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
