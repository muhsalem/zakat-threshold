import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, KeyRound, Mail, Loader2 } from "lucide-react";
import { grantAccountantAccess } from "@/lib/accountantGate.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/a-console")({
  head: () => ({
    meta: [
      { title: "بوابة إدارية" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HiddenConsole,
});

function HiddenConsole() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const grant = useServerFn(grantAccountantAccess);

  // Step 1: sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Step 2: master password state
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setSignInError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (err) setSignInError(err.message === "Invalid login credentials" ? "بيانات الدخول غير صحيحة" : err.message);
    // On success, useAuth updates and step 2 renders automatically.
  }

  async function handleMaster(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await grant({ data: { masterPassword: pw } });
      if (!res.ok) setError(res.reason);
      else navigate({ to: "/accountant" });
    } catch (err: any) {
      setError(err?.message ?? "خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" /> بوابة إدارية مقيّدة
          </CardTitle>
          <StepIndicator step={user ? 2 : 1} />
        </CardHeader>
        <CardContent>
          {!user ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                الخطوة 1 من 2: سجّل الدخول بحسابك، ثم أدخل كلمة المرور الرئيسية.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-8"
                    dir="ltr"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">كلمة مرور الحساب</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={signingIn || !email || !password}>
                {signingIn ? "جاري الدخول…" : "تسجيل الدخول"}
              </Button>
              {signInError && (
                <Alert variant="destructive"><AlertDescription className="text-xs">{signInError}</AlertDescription></Alert>
              )}
              <p className="text-[11px] text-muted-foreground text-center">
                ليس لديك حساب؟{" "}
                <button type="button" className="underline" onClick={() => navigate({ to: "/auth" })}>
                  أنشئ حسابًا
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleMaster} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                الخطوة 2 من 2: تم التوثيق كـ <span dir="ltr">{user.email}</span>. أدخل كلمة المرور الرئيسية للمتابعة.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">كلمة المرور الرئيسية</Label>
                <div className="relative">
                  <KeyRound className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="pr-8"
                    dir="ltr"
                    autoComplete="off"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy || !pw}>
                {busy ? "جاري التحقق…" : "منح صلاحية المحاسب"}
              </Button>
              {error && (
                <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>
              )}
              <button
                type="button"
                className="text-[11px] text-muted-foreground underline w-full text-center"
                onClick={async () => { await supabase.auth.signOut(); }}
              >
                تسجيل الخروج والعودة للخطوة 1
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className={`h-1.5 flex-1 rounded ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
      <span className={`h-1.5 flex-1 rounded ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
    </div>
  );
}
