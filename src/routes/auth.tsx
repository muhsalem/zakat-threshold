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
