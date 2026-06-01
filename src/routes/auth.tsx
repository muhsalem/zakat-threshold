import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, LogIn, UserPlus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — حاسبة الزكاة" },
      { name: "description", content: "سجّل دخولك لحفظ سجل زكواتك السنوية والاطلاع على إحصائياتك." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/history" });
  }, [authLoading, user, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else navigate({ to: "/history" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    const redirectUrl = `${window.location.origin}/history`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName || email },
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setInfo("تم إنشاء الحساب. تحقق من بريدك لتفعيل الحساب ثم سجّل الدخول.");
  }

  async function handleGoogle() {
    setError(null); setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setError(result.error.message); setBusy(false); return; }
    if (result.redirected) return;
    navigate({ to: "/history" });
  }

  async function handleForgot() {
    if (!email) { setError("أدخل بريدك الإلكتروني أولاً"); return; }
    setError(null); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setInfo("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.");
  }



  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-gold">
            <Moon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold">حاسبة الزكاة</h1>
            <p className="text-xs text-muted-foreground">سجل زكواتك السنوي</p>
          </div>
        </Link>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-center">الدخول إلى حسابك</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" dir="rtl">
              <TabsList dir="rtl" className="grid grid-cols-2 w-full">
                <TabsTrigger value="login" className="gap-1.5"><LogIn className="h-4 w-4" /> دخول</TabsTrigger>
                <TabsTrigger value="signup" className="gap-1.5"><UserPlus className="h-4 w-4" /> إنشاء حساب</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>كلمة المرور</Label>
                    <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "جاري الدخول..." : "دخول"}
                  </Button>
                  <button type="button" onClick={handleForgot} className="block w-full text-xs text-muted-foreground hover:text-primary text-center">
                    نسيت كلمة المرور؟
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <Label>الاسم</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="اسمك" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>كلمة المرور</Label>
                    <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "جاري الإنشاء..." : "إنشاء حساب"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">أو</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full gap-2" disabled={busy} onClick={handleGoogle}>
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              متابعة بحساب Google
            </Button>

            {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
            {info && <Alert className="mt-4 border-primary/30 bg-primary/5"><AlertDescription>{info}</AlertDescription></Alert>}

            <Link to="/" className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-6 hover:text-foreground">
              <ArrowRight className="h-3 w-3" /> العودة إلى الحاسبة
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
