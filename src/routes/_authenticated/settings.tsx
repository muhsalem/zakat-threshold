import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BellRing, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — نِصاب" },
      { name: "description", content: "تحكّم في تفضيلات الإشعارات وتذكيرات الحول." },
    ],
  }),
  component: SettingsPage,
});

const DAY_OPTIONS = [
  { value: 30, label: "قبل 30 يوماً" },
  { value: 14, label: "قبل 14 يوماً" },
  { value: 7, label: "قبل 7 أيام" },
  { value: 3, label: "قبل 3 أيام" },
  { value: 1, label: "قبل يوم واحد" },
  { value: 0, label: "في يوم الحول" },
];

function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState<number[]>([7, 1, 0]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("hawl_reminder_enabled, hawl_reminder_days")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.hawl_reminder_enabled);
        setDays(data.hawl_reminder_days ?? [7, 1, 0]);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  function toggleDay(v: number) {
    setDays((prev) =>
      prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v].sort((a, b) => b - a),
    );
  }

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        hawl_reminder_enabled: enabled,
        hawl_reminder_days: days.length ? days : [0],
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("تعذّر حفظ التفضيلات");
    } else {
      toast.success("تم حفظ التفضيلات");
    }
  }

  if (loading) {
    return (
      <div className="container max-w-3xl py-10 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">
          خصّص تجربتك — تحكّم في الإشعارات والتذكيرات دون التأثير على بقية الميزات.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <CardTitle>تذكير الحول</CardTitle>
          </div>
          <CardDescription>
            نُذكّرك بموعد اكتمال الحول (354 يوماً هجرياً) لكل سجل زكاة. الإشعارات الأخرى
            (المرفقات، الاعتمادات، النظام) لا تتأثر بهذا الإعداد.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="hawl-toggle" className="text-base font-medium">
                تفعيل تذكيرات الحول
              </Label>
              <p className="text-xs text-muted-foreground">
                عند الإيقاف، لن يتم توليد أي إشعار حول جديد.
              </p>
            </div>
            <Switch
              id="hawl-toggle"
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="تفعيل تذكيرات الحول"
            />
          </div>

          <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
            <Label className="text-base font-medium mb-3 block">
              متى تريد استلام التذكير؟
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              اختر يوماً أو أكثر قبل موعد الحول. الافتراضي: 7 و1 و0.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DAY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40 transition"
                >
                  <Checkbox
                    checked={days.includes(opt.value)}
                    onCheckedChange={() => toggleDay(opt.value)}
                    aria-label={opt.label}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            {enabled && days.length === 0 && (
              <Alert className="mt-3">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  لم تختر أي يوم — سيتم استخدام يوم الحول (0) كحد أدنى.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ms-2" />}
              حفظ التفضيلات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
