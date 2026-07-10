import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, LogIn, Smartphone, CheckCircle2, Trash2, Lock, KeyRound, Database, Timer, ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/security")({
  component: SecurityPage,
  head: () => ({ meta: [{ title: "الأمان والتحقق بخطوتين | نِصاب" }] }),
});

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

function SecurityPage() {
  const { user, loading } = useAuth();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.all as Factor[]) ?? []);
  }
  useEffect(() => {
    if (user) refresh();
  }, [user]);

  async function startEnroll() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `نِصاب-${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setEnrollQr(data.totp.qr_code);
    setEnrollSecret(data.totp.secret);
    setEnrollFactorId(data.id);
  }

  async function verifyEnroll() {
    if (!enrollFactorId) return;
    setBusy(true);
    setMsg(null);
    const ch = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
    if (ch.error) {
      setBusy(false);
      setMsg({ kind: "err", text: ch.error.message });
      return;
    }
    const vr = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: ch.data.id,
      code,
    });
    setBusy(false);
    if (vr.error) {
      setMsg({ kind: "err", text: vr.error.message });
      return;
    }
    setMsg({ kind: "ok", text: "تم تفعيل التحقق بخطوتين بنجاح" });
    setEnrollQr(null);
    setEnrollSecret(null);
    setEnrollFactorId(null);
    setCode("");
    refresh();
  }

  async function removeFactor(id: string) {
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) setMsg({ kind: "err", text: error.message });
    else {
      setMsg({ kind: "ok", text: "تم الإلغاء" });
      refresh();
    }
  }

  if (loading) return null;

  return (
    <div className="container max-w-2xl py-8 space-y-6" dir="rtl">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">الأمان والتحقق بخطوتين</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        فعِّل التحقق بخطوتين (TOTP) لحماية حسابك. تحتاج إلى تطبيق مصادقة مثل Google Authenticator أو
        Authy.
      </p>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> ضوابط الأمان المُفعّلة على المنصّة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <li className="flex items-start gap-2"><Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>عزل بيانات كل مستخدم عبر سياسات RLS مربوطة بمعرِّف الحساب.</span></li>
            <li className="flex items-start gap-2"><KeyRound className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>رفض كلمات المرور المُسرَّبة تلقائيًا (فحص HIBP).</span></li>
            <li className="flex items-start gap-2"><ShieldAlert className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>دوال إدارية داخلية غير قابلة للاستدعاء من الجلسات العادية.</span></li>
            <li className="flex items-start gap-2"><Database className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>فصل مفاتيح الخدمة عن مفاتيح المتصفح، وامتدادات النظام خارج المخطط العام.</span></li>
            <li className="flex items-start gap-2"><Timer className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>حدّ معدّل على نقاط الاستدعاء العامة (webhooks) لمنع الإساءة.</span></li>
            <li className="flex items-start gap-2"><Smartphone className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>دعم التحقّق بخطوتين TOTP لكل مستخدم (أدناه).</span></li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            هذه قائمة بالضوابط المُفعّلة داخل التطبيق ولا تُعدّ شهادة امتثال مستقلة. للاستفسار عن سياسات الحماية والخصوصية راسِلنا عبر صفحة الاتصال.
          </p>
        </CardContent>
      </Card>

      {!user ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm">يجب تسجيل الدخول أولًا.</p>
            <Link to="/auth">
              <Button className="gap-1.5">
                <LogIn className="h-4 w-4" /> دخول
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {msg && (
            <Alert variant={msg.kind === "err" ? "destructive" : "default"}>
              <AlertDescription className="text-sm">{msg.text}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> العوامل المُسجَّلة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {factors.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد عامل تحقق بعد.</p>
              ) : (
                factors.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between border rounded-md p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{f.friendly_name || f.factor_type}</span>
                      <span className="text-xs text-muted-foreground">({f.status})</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFactor(f.id)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {!enrollQr ? (
            <Button onClick={startEnroll} disabled={busy} className="gap-1.5">
              <ShieldCheck className="h-4 w-4" /> {busy ? "جاري…" : "تفعيل التحقق بخطوتين"}
            </Button>
          ) : (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">امسح رمز QR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center bg-white p-4 rounded-md border">
                  <img src={enrollQr} alt="رمز QR لتفعيل التحقق بخطوتين — امسحه بتطبيق المصادقة" className="w-48 h-48" />
                </div>
                {enrollSecret && (
                  <div className="text-xs text-center text-muted-foreground">
                    أو أدخل المفتاح يدويًا:{" "}
                    <code className="font-mono text-foreground">{enrollSecret}</code>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">رمز التحقق المكوَّن من 6 أرقام</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="123456"
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={verifyEnroll}
                  disabled={busy || code.length !== 6}
                  className="w-full"
                >
                  {busy ? "جاري التحقق…" : "تأكيد التفعيل"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
