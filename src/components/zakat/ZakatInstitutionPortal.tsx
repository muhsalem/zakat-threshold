import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Award,
  Users,
  Coins,
  Send,
  Sparkles,
  Search,
} from "lucide-react";
import { fmt } from "@/lib/zakat";
import { toast } from "sonner";

export function ZakatInstitutionPortal() {
  const [selectedTab, setSelectedTab] = useState("verification");

  const issueClearanceCertificate = () => {
    toast.success("تم إصدار وتوثيق شهادة براءة الذمة الزكوية الرسمية (Zakat Clearance Certificate)", {
      description: "تم توثيق الشهادة ببصمة تشفير رقمية SHA-256 قابلة للتحقق من الهيئات الرسمية.",
    });
  };

  return (
    <Card className="border-emerald-600/40 bg-gradient-to-br from-emerald-950/20 via-background to-teal-950/10 shadow-lg" dir="rtl">
      <CardHeader className="border-b bg-emerald-500/5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-0.5">
                <Building2 className="h-3.5 w-3.5 ms-1 inline" /> بوابة مؤسسات الزكاة والبيوت الخيرية
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs">
                براءة الذمة والتحقق الميداني
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              لوحة حوكمة وتدقيق بيوت ومؤسسات الزكاة (Zakat Institution Portal)
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              منظومة المراجعة والاعتماد المؤسسي: دراسة استحقاق الحالات، إصدار شهادات براءة الذمة، وتسوية المدفوعات.
            </CardDescription>
          </div>

          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs" onClick={issueClearanceCertificate}>
            <FileCheck className="h-4 w-4" /> إصدار شهادة براءة ذمة زكوية
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-xl mx-auto text-xs">
            <TabsTrigger value="verification">التحقق ودراسة الاستحقاق</TabsTrigger>
            <TabsTrigger value="clearance">شهادات براءة الذمة</TabsTrigger>
            <TabsTrigger value="settlement">تسوية وتحويل الأموال</TabsTrigger>
          </TabsList>

          {/* 1. التحقق ودراسة الاستحقاق */}
          <TabsContent value="verification" className="space-y-3">
            <div className="p-4 rounded-xl border bg-background space-y-3">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-600" />
                دراسة استحقاق الحالات وفق المصارف القرآنية الثمانية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">مصرف الفقراء والمساكين</div>
                  <p className="text-[11px] text-muted-foreground mt-1">التحقق من معدل الدخل وتغطية الاحتياج المالي الأساسي.</p>
                  <Badge className="bg-emerald-600 text-white text-[10px] mt-2">مستوفاة 100%</Badge>
                </div>

                <div className="p-3 rounded-lg border bg-teal-500/5 border-teal-500/20">
                  <div className="font-bold text-teal-800 dark:text-teal-300">مصرف الغارمين المعسرين</div>
                  <p className="text-[11px] text-muted-foreground mt-1">فحص الأحكام والتأكد من كون الدين استهلاكياً لا تجارياً.</p>
                  <Badge className="bg-teal-600 text-white text-[10px] mt-2">موثق قضائياً</Badge>
                </div>

                <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
                  <div className="font-bold text-blue-800 dark:text-blue-300">مصرف ابن السبيل وكفالة العلم</div>
                  <p className="text-[11px] text-muted-foreground mt-1">رعاية الطلاب العففاء المنقطعين وتوفير البيئة العلمية.</p>
                  <Badge className="bg-blue-600 text-white text-[10px] mt-2">معتمد أكاديمياً</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 2. شهادات براءة الذمة */}
          <TabsContent value="clearance" className="space-y-3">
            <div className="p-4 rounded-xl border bg-background space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">الشهادة الحالية:</span>
                <span className="font-mono text-emerald-600 font-bold">ZAKAT-CERT-2026-8891</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                تشهد المنصة والمؤسسة الزكوية المعتمدة بأن المكلف قد أدى زكاته الواجبة شرعاً عن الحول المالي المعتمد وفق معيار AAOIFI 35 وتم تسليم الإقرار الرسمي.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1 border-emerald-500/40" onClick={() => window.print()}>
                  <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> طباعة شهادة براءة الذمة (PDF)
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* 3. تسوية وتصفية الأموال */}
          <TabsContent value="settlement" className="space-y-3">
            <div className="p-4 rounded-xl border bg-background space-y-3 text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" />
                تسوية وتحويل زكاوات العملات الأجنبية والعملات الرقمية
              </h4>
              <p className="text-muted-foreground">
                تصفية وتسوية المبالغ المحصلة من الأسهم أو الأصول المشفرة وتحويلها بالعملة المحلية المقبولة شرعاً لمستحقي الزكاة.
              </p>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-xs">تسوية فورية (Instant FX Settlement)</Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
