import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BellRing, Loader2, Info, Mail, MessageSquare, Smartphone, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — نِصاب" },
      { name: "description", content: "تحكّم في تفضيلات إشعارات الحول عبر البريد والجوّال." },
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

type Prefs = {
  hawl_reminder_enabled: boolean;
  hawl_reminder_days: number[];
  channel_inapp: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  email_address: string | null;
  phone_e164: string | null;
  language: "ar" | "en";
};

const DEFAULTS: Prefs = {
  hawl_reminder_enabled: true,
  hawl_reminder_days: [7, 1, 0],
  channel_inapp: true,
  channel_email: false,
  channel_sms: false,
  email_address: null,
  phone_e164: null,
  language: "ar",
};

const E164 = /^\+[1-9]\d{6,14}$/;

function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select(
          "hawl_reminder_enabled, hawl_reminder_days, channel_inapp, channel_email, channel_sms, email_address, phone_e164, language",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      setPrefs({
        hawl_reminder_enabled: data?.hawl_reminder_enabled ?? true,
        hawl_reminder_days: data?.hawl_reminder_days ?? [7, 1, 0],
        channel_inapp: data?.channel_inapp ?? true,
        channel_email: data?.channel_email ?? false,
        channel_sms: data?.channel_sms ?? false,
        email_address: data?.email_address ?? user.email ?? null,
        phone_e164: data?.phone_e164 ?? null,
        language: (data?.language as "ar" | "en") ?? "ar",
      });
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  function toggleDay(v: number) {
    setPrefs((p) => {
      const has = p.hawl_reminder_days.includes(v);
      const next = has
        ? p.hawl_reminder_days.filter((d) => d !== v)
        : [...p.hawl_reminder_days, v].sort((a, b) => b - a);
      return { ...p, hawl_reminder_days: next };
    });
  }

  const emailInvalid =
    prefs.channel_email && (!prefs.email_address || !/^\S+@\S+\.\S+$/.test(prefs.email_address));
  const phoneInvalid = prefs.channel_sms && (!prefs.phone_e164 || !E164.test(prefs.phone_e164));

  async function save() {
    if (!user?.id) return;
    if (emailInvalid) return toast.error("أدخل بريداً إلكترونياً صحيحاً");
    if (phoneInvalid) return toast.error("أدخل رقم جوّال بصيغة دولية مثل +9665XXXXXXXX");
    setSaving(true);
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        hawl_reminder_enabled: prefs.hawl_reminder_enabled,
        hawl_reminder_days: prefs.hawl_reminder_days.length ? prefs.hawl_reminder_days : [0],
        channel_inapp: prefs.channel_inapp,
        channel_email: prefs.channel_email,
        channel_sms: prefs.channel_sms,
        email_address: prefs.email_address || null,
        phone_e164: prefs.phone_e164 || null,
        language: prefs.language,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) toast.error("تعذّر حفظ التفضيلات");
    else toast.success("تم حفظ التفضيلات");
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
        <h1 className="text-2xl font-bold">إعدادات الإشعارات</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تحكّم في قنوات وأوقات تذكيرات الحول، وشاهد معاينة نص الإشعار قبل الإرسال.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <CardTitle>تذكيرات الحول</CardTitle>
          </div>
          <CardDescription>
            نُذكّرك بموعد اكتمال الحول (354 يوماً هجرياً) لكل سجل زكاة. تُطبَّق التفضيلات على كل السجلات
            المستقبلية.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="hawl-toggle" className="text-base font-medium">
                تفعيل تذكيرات الحول
              </Label>
              <p className="text-xs text-muted-foreground">
                عند الإيقاف، لن يتم توليد أي تذكير جديد.
              </p>
            </div>
            <Switch
              id="hawl-toggle"
              checked={prefs.hawl_reminder_enabled}
              onCheckedChange={(v) => update("hawl_reminder_enabled", v)}
              aria-label="تفعيل تذكيرات الحول"
            />
          </div>

          <div className={prefs.hawl_reminder_enabled ? "space-y-6" : "space-y-6 opacity-50 pointer-events-none"}>
            {/* Timing */}
            <section>
              <Label className="text-base font-medium mb-2 block">متى تريد استلام التذكير؟</Label>
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
                      checked={prefs.hawl_reminder_days.includes(opt.value)}
                      onCheckedChange={() => toggleDay(opt.value)}
                      aria-label={opt.label}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              {prefs.hawl_reminder_days.length === 0 && (
                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    لم تختر أي يوم — سيتم استخدام يوم الحول (0) كحد أدنى.
                  </AlertDescription>
                </Alert>
              )}
            </section>

            {/* Channels */}
            <section className="space-y-3">
              <Label className="text-base font-medium block">قنوات الإشعار</Label>

              <ChannelRow
                icon={<BellRing className="h-4 w-4 text-primary" />}
                title="داخل التطبيق"
                subtitle="يظهر في جرس الإشعارات — دائماً مجاني."
                checked={prefs.channel_inapp}
                onChange={(v) => update("channel_inapp", v)}
              />

              <ChannelRow
                icon={<Mail className="h-4 w-4 text-primary" />}
                title="البريد الإلكتروني"
                subtitle="نُرسل رسالة رسمية إلى بريدك مع تفاصيل السجل."
                checked={prefs.channel_email}
                onChange={(v) => update("channel_email", v)}
              >
                {prefs.channel_email && (
                  <div className="pt-3">
                    <Label htmlFor="email" className="text-xs text-muted-foreground">
                      عنوان البريد
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      placeholder="you@example.com"
                      value={prefs.email_address ?? ""}
                      onChange={(e) => update("email_address", e.target.value)}
                      className={emailInvalid ? "border-destructive" : ""}
                    />
                  </div>
                )}
              </ChannelRow>

              <ChannelRow
                icon={<MessageSquare className="h-4 w-4 text-primary" />}
                title="الرسائل النصية (SMS)"
                subtitle="تنبيه مختصر على جوّالك — بصيغة رقم دولي."
                checked={prefs.channel_sms}
                onChange={(v) => update("channel_sms", v)}
              >
                {prefs.channel_sms && (
                  <div className="pt-3">
                    <Label htmlFor="phone" className="text-xs text-muted-foreground">
                      رقم الجوّال (بالصيغة الدولية)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      placeholder="+9665XXXXXXXX"
                      value={prefs.phone_e164 ?? ""}
                      onChange={(e) => update("phone_e164", e.target.value.trim())}
                      className={phoneInvalid ? "border-destructive" : ""}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      مثال: <span dir="ltr">+966501234567</span> — يبدأ بـ + ثم رمز الدولة.
                    </p>
                  </div>
                )}
              </ChannelRow>

              <div className="rounded-md border p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">لغة الإشعار</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={prefs.language === "ar" ? "default" : "outline"}
                    onClick={() => update("language", "ar")}
                  >
                    عربي
                  </Button>
                  <Button
                    size="sm"
                    variant={prefs.language === "en" ? "default" : "outline"}
                    onClick={() => update("language", "en")}
                  >
                    English
                  </Button>
                </div>
              </div>
            </section>

            {/* Preview */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">معاينة نص الإشعار</Label>
              </div>
              <NotificationPreview prefs={prefs} />
            </section>
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

function ChannelRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{icon}</div>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
      </div>
      {children}
    </div>
  );
}

function NotificationPreview({ prefs }: { prefs: Prefs }) {
  const firstActive = prefs.channel_inapp ? "inapp" : prefs.channel_email ? "email" : "sms";
  const [tab, setTab] = useState(firstActive);
  useEffect(() => {
    const disabled =
      (tab === "inapp" && !prefs.channel_inapp) ||
      (tab === "email" && !prefs.channel_email) ||
      (tab === "sms" && !prefs.channel_sms);
    if (disabled) setTab(firstActive);
  }, [prefs.channel_inapp, prefs.channel_email, prefs.channel_sms, tab, firstActive]);
  const sampleDays = useMemo(() => {
    const d = [...prefs.hawl_reminder_days].sort((a, b) => a - b);
    return d[0] ?? 7;
  }, [prefs.hawl_reminder_days]);

  const hawlDate = useMemo(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + sampleDays);
    return dt.toLocaleDateString(prefs.language === "ar" ? "ar-EG" : "en-GB");
  }, [sampleDays, prefs.language]);

  const isAr = prefs.language === "ar";
  const daysLabel = isAr
    ? sampleDays === 0
      ? "اليوم"
      : sampleDays === 1
      ? "غداً"
      : `خلال ${sampleDays} أيام`
    : sampleDays === 0
    ? "today"
    : sampleDays === 1
    ? "tomorrow"
    : `in ${sampleDays} days`;

  const inappTitle = isAr
    ? sampleDays === 0
      ? "حلّ موعد إخراج زكاتك اليوم"
      : `تذكير: يحلّ حولُ زكاتك ${daysLabel}`
    : sampleDays === 0
    ? "Your Zakat is due today"
    : `Reminder: your Zakat Hawl completes ${daysLabel}`;

  const inappBody = isAr
    ? `موعد اكتمال الحول: ${hawlDate} — قيمة الزكاة المقدّرة: 1٬250 SAR.`
    : `Hawl completion date: ${hawlDate} — estimated Zakat: 1,250 SAR.`;

  const smsBody = isAr
    ? `نِصاب: ${inappTitle}. ${hawlDate}. للتفاصيل: nisab.app/history`
    : `Nisab: ${inappTitle}. ${hawlDate}. Details: nisab.app/history`;

  const activeChannels = [
    prefs.channel_inapp && "in-app",
    prefs.channel_email && "email",
    prefs.channel_sms && "sms",
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      {activeChannels.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          فعّل قناة واحدة على الأقل لمعاينة الرسالة.
        </p>
      )}
      {activeChannels.length > 0 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="inapp" disabled={!prefs.channel_inapp}>
              داخل التطبيق
            </TabsTrigger>
            <TabsTrigger value="email" disabled={!prefs.channel_email}>
              البريد
            </TabsTrigger>
            <TabsTrigger value="sms" disabled={!prefs.channel_sms}>
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inapp" className="mt-3">
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-start gap-2">
                <BellRing className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{inappTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{inappBody}</div>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    /history
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-3">
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="border-b p-3 text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">من:</span> نِصاب &lt;reminders@nisab.app&gt;
                </div>
                <div>
                  <span className="text-muted-foreground">إلى:</span>{" "}
                  <span dir="ltr">{prefs.email_address || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الموضوع:</span>{" "}
                  <span className="font-semibold">{inappTitle}</span>
                </div>
              </div>
              <div className="p-4 text-sm leading-relaxed">
                <p>{isAr ? "السلام عليكم،" : "Assalamu alaikum,"}</p>
                <p className="mt-2">
                  {isAr
                    ? `نُذكّرك أن حَولَ إحدى زكواتك يكتمل ${daysLabel} بتاريخ ${hawlDate}.`
                    : `A reminder that one of your Zakat cycles completes ${daysLabel} on ${hawlDate}.`}
                </p>
                <p className="mt-2">
                  {isAr
                    ? "القيمة التقديرية للزكاة بناءً على آخر سجل: 1٬250 SAR."
                    : "Estimated Zakat based on your latest record: 1,250 SAR."}
                </p>
                <div className="mt-3">
                  <span className="inline-block rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs font-medium">
                    {isAr ? "عرض السجل" : "View record"}
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {isAr ? "بارك الله فيك — فريق نِصاب" : "May Allah bless you — Nisab team"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sms" className="mt-3">
            <div className="mx-auto max-w-xs rounded-2xl border bg-card p-3 shadow-sm">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center justify-between">
                <span dir="ltr">{prefs.phone_e164 || "—"}</span>
                <span>الآن</span>
              </div>
              <div className="rounded-2xl bg-primary/10 px-3 py-2 text-sm leading-relaxed">
                {smsBody}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground text-end">
                {smsBody.length} حرفاً · {Math.ceil(smsBody.length / 160)} رسالة
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
