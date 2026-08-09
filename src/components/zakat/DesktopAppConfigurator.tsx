import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Laptop, HardDrive, Info, CheckCircle2, Clock } from "lucide-react";

const STATUS = [
  { label: "سقالة Tauri 2 (Rust)", done: true },
  { label: "أيقونات كل المنصات (سطح مكتب/iOS/Android)", done: true },
  { label: "بناء تطويري محلي يعمل فعلياً", done: false },
  { label: "حزم تثبيت قابلة للتنزيل (.msi / .dmg / .AppImage)", done: false },
  { label: "نشر المنصة على دومين فعلي (يتطلبه التطبيق أصلاً)", done: false },
];

export function DesktopAppConfigurator() {
  return (
    <Card
      className="border-indigo-500/30 bg-gradient-to-br from-background via-slate-900/10 to-indigo-950/20 shadow-lg"
      dir="rtl"
    >
      <CardHeader className="border-b bg-indigo-500/5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-warning text-white text-xs px-2.5 py-0.5">
            <Laptop className="h-3.5 w-3.5 ms-1 inline" /> تطبيق سطح المكتب: قيد التطوير
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          <HardDrive className="h-5 w-5 text-indigo-600" />
          نِصاب لسطح المكتب (Tauri)
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          غلاف Tauri حول نفس واجهة الويب — يحتاج المنصة منشورة على دومين فعلي ليعمل، إذ يعتمد على
          نفس دوال الخادم الحية (لا نسخة أوفلاين مستقلة).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <Alert className="border-warning/40 bg-warning/5">
          <Info className="h-4 w-4 text-warning" />
          <AlertDescription className="text-xs leading-relaxed">
            لا توجد بعد حزمة قابلة للتنزيل لأي نظام تشغيل. الجدول أدناه يعكس الحالة الفعلية فقط.
          </AlertDescription>
        </Alert>
        <div className="space-y-2 text-xs">
          {STATUS.map((s) => (
            <div key={s.label} className="flex items-center gap-2 rounded-lg border p-3">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-warning shrink-0" />
              )}
              <span className={s.done ? "text-foreground" : "text-muted-foreground"}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
