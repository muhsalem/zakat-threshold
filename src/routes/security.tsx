import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  LogIn,
  Smartphone,
  CheckCircle2,
  Trash2,
  Lock,
  KeyRound,
  Database,
  Timer,
  ShieldAlert,
  Loader2,
} from "lucide-react";

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
  const otpInputRef = useRef<HTMLInputElement>(null);
  const enrollButtonRef = useRef<HTMLButtonElement>(null);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.all as Factor[]) ?? []);
  }
  useEffect(() => {
    if (user) refresh();
  }, [user]);

  // Move focus into the OTP field the moment enrollment starts
  useEffect(() => {
    if (enrollQr && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [enrollQr]);

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

  if (loading) {
    return (
      <div
        className="container max-w-2xl py-16 flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">جارٍ التحميل…</span>
      </div>
    );
  }

  return (
    <main
      className="container max-w-2xl py-8 space-y-6"
      dir="rtl"
      aria-labelledby="security-heading"
    >
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        <h1 id="security-heading" className="text-2xl font-bold">
          الأمان والتحقق بخطوتين
        </h1>
      </header>
      <p className="text-sm text-muted-foreground">
        فعِّل التحقق بخطوتين (TOTP) لحماية حسابك. تحتاج إلى تطبيق مصادقة مثل Google Authenticator أو
        Authy.
      </p>

      <section aria-labelledby="platform-controls-heading">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle id="platform-controls-heading" className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              ضوابط الأمان المُفعّلة على المنصّة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <li className="flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>عزل بيانات كل مستخدم عبر سياسات RLS مربوطة بمعرِّف الحساب.</span>
              </li>
              <li className="flex items-start gap-2">
                <KeyRound className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>رفض كلمات المرور المُسرَّبة تلقائيًا (فحص HIBP).</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>دوال إدارية داخلية غير قابلة للاستدعاء من الجلسات العادية.</span>
              </li>
              <li className="flex items-start gap-2">
                <Database className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>
                  فصل مفاتيح الخدمة عن مفاتيح المتصفح، وامتدادات النظام خارج المخطط العام.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Timer className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>حدّ معدّل على نقاط الاستدعاء العامة (webhooks) لمنع الإساءة.</span>
              </li>
              <li className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                <span>دعم التحقّق بخطوتين TOTP لكل مستخدم (أدناه).</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              هذه قائمة بالضوابط المُفعّلة داخل التطبيق ولا تُعدّ شهادة امتثال مستقلة. للاستفسار عن
              سياسات الحماية والخصوصية راسِلنا عبر صفحة الاتصال.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Live region for status/error announcements — always mounted so SR picks up updates */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {msg?.text ?? ""}
      </div>

      {!user ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm">يجب تسجيل الدخول أولًا.</p>
            <Link to="/auth">
              <Button className="gap-1.5 min-h-11">
                <LogIn className="h-4 w-4" aria-hidden="true" /> دخول
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {msg && (
            <Alert variant={msg.kind === "err" ? "destructive" : "default"} role="alert">
              <AlertDescription className="text-sm">{msg.text}</AlertDescription>
            </Alert>
          )}

          <section aria-labelledby="registered-factors-heading">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle
                  id="registered-factors-heading"
                  className="text-base flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" aria-hidden="true" /> العوامل المُسجَّلة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {factors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا يوجد عامل تحقق بعد.</p>
                ) : (
                  <ul className="space-y-2 list-none p-0 m-0">
                    {factors.map((f) => {
                      const label = f.friendly_name || f.factor_type;
                      return (
                        <li
                          key={f.id}
                          className="flex items-center justify-between border rounded-md p-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span className="font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">({f.status})</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFactor(f.id)}
                            disabled={busy}
                            aria-label={`إزالة عامل التحقق ${label}`}
                            className="min-h-11 min-w-11"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {!enrollQr ? (
            <Button
              ref={enrollButtonRef}
              onClick={startEnroll}
              disabled={busy}
              className="gap-1.5 min-h-11"
              aria-busy={busy}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {busy ? "جاري…" : "تفعيل التحقق بخطوتين"}
            </Button>
          ) : (
            <section aria-labelledby="enroll-heading">
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle id="enroll-heading" className="text-base">
                    امسح رمز QR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center bg-white p-4 rounded-md border">
                    <img
                      src={enrollQr}
                      alt="رمز QR لتفعيل التحقق بخطوتين — امسحه بتطبيق المصادقة"
                      className="w-48 h-48"
                    />
                  </div>
                  {enrollSecret && (
                    <div className="text-xs text-center text-muted-foreground">
                      أو أدخل المفتاح يدويًا:{" "}
                      <code
                        className="font-mono text-foreground"
                        aria-label={`المفتاح السري: ${enrollSecret}`}
                      >
                        {enrollSecret}
                      </code>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="mfa-otp-code" className="text-sm font-medium block">
                      رمز التحقق المكوَّن من 6 أرقام
                    </label>
                    <Input
                      id="mfa-otp-code"
                      ref={otpInputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && code.length === 6 && !busy) {
                          e.preventDefault();
                          verifyEnroll();
                        }
                      }}
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      dir="ltr"
                      aria-describedby="mfa-otp-hint"
                      aria-invalid={msg?.kind === "err"}
                      required
                    />
                    <p id="mfa-otp-hint" className="text-xs text-muted-foreground">
                      أدخل الرمز الظاهر في تطبيق المصادقة الآن.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={verifyEnroll}
                      disabled={busy || code.length !== 6}
                      className="flex-1 min-h-11"
                      aria-busy={busy}
                    >
                      {busy ? "جاري التحقق…" : "تأكيد التفعيل"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEnrollQr(null);
                        setEnrollSecret(null);
                        setEnrollFactorId(null);
                        setCode("");
                        setMsg(null);
                        // Return focus to the trigger button
                        setTimeout(() => enrollButtonRef.current?.focus(), 0);
                      }}
                      disabled={busy}
                      className="min-h-11"
                    >
                      إلغاء
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </main>
  );
}
