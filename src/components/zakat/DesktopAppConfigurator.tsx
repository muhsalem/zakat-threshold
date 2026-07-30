import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Laptop,
  HardDrive,
  Database,
  WifiOff,
  Printer,
  ShieldCheck,
  Download,
  FolderOpen,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export function DesktopAppConfigurator() {
  const [offlineMode, setOfflineMode] = useState(true);
  const [localEncryption, setLocalEncryption] = useState(true);
  const [nativePrinting, setNativePrinting] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const handleDownloadDesktopApp = (os: "windows" | "mac" | "linux") => {
    toast.success(`جاري تجهيز حزمة تطبيق سطح المكتب (${os.toUpperCase()})`, {
      description: "التطبيق مبني برمجياً بـ Tauri 2.0 / Rust محلياً بدون إمكانية تسريب البيانات المالية.",
    });
  };

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-background via-slate-900/10 to-indigo-950/20 shadow-lg" dir="rtl">
      <CardHeader className="border-b bg-indigo-500/5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-600 text-white text-xs px-2.5 py-0.5">
                <Laptop className="h-3.5 w-3.5 ms-1 inline" /> تطبيق سطح المكتب (Tauri / Native Desktop)
              </Badge>
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-xs">
                Offline-First & Local Encryption
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <HardDrive className="h-5 w-5 text-indigo-600" />
              تجهيز وتكوين تطبيق نِصاب لسطح المكتب (Desktop App Configuration)
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              تشغيل المنظومة محلياً كبرنامج سطح مكتب محمي لتسريع المعالجة والعمل دون اتصال بالإنترنت (Offline-First).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5" onClick={() => handleDownloadDesktopApp("windows")}>
              <Download className="h-4 w-4" /> تحميل نسخة Windows (.msi)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        {/* إعدادات التشغيل المحلي والـ Offline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border bg-background space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <WifiOff className="h-4 w-4 text-indigo-600" /> التشغيل دون اتصال (Offline-First)
                </Label>
                <p className="text-muted-foreground text-[11px]">حفظ وإجراء الحسابات محلياً على قاعدة بيانات SQLite مشفرة.</p>
              </div>
              <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-background space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-600" /> التشفير المحلي (AES-256 GCM)
                </Label>
                <p className="text-muted-foreground text-[11px]">تشفير ميزانيات الشركات والملفات المالية بمفتاح تشفير الجهاز.</p>
              </div>
              <Switch checked={localEncryption} onCheckedChange={setLocalEncryption} />
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-background space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-indigo-600" /> الطباعة المباشرة بطابعات النظام
                </Label>
                <p className="text-muted-foreground text-[11px]">استخراج التقارير وإيصالات الزكاة مباشرة لطابعات الـ POS والسيرفر.</p>
              </div>
              <Switch checked={nativePrinting} onCheckedChange={setNativePrinting} />
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-background space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-emerald-600" /> المزامنة الخلفية عند توفر الشبكة
                </Label>
                <p className="text-muted-foreground text-[11px]">رفع التقارير المعتمدة آلياً لقاعدة البيانات المركزية عند الاتصال.</p>
              </div>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>
          </div>
        </div>

        {/* تحميل نسخ المتاجر والنظم التشغيلية */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-3 text-xs">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-indigo-600" />
            تحميل حزم البرامج لكافة أنظمة التشغيل (Cross-Platform Bundles)
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-indigo-500/40" onClick={() => handleDownloadDesktopApp("windows")}>
              💻 Windows (.exe / .msi)
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-indigo-500/40" onClick={() => handleDownloadDesktopApp("mac")}>
              🍏 macOS (.dmg / Silicon & Intel)
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 border-indigo-500/40" onClick={() => handleDownloadDesktopApp("linux")}>
              🐧 Linux (.AppImage / .deb)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
