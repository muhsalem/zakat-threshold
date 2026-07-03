import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, KeyRound } from "lucide-react";
import { grantAccountantAccess } from "@/lib/accountantGate.functions";
import { useAuth } from "@/hooks/useAuth";

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
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grant = useServerFn(grantAccountantAccess);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
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

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardHeader><CardTitle className="text-base">مطلوب تسجيل دخول</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              سجّل دخول بحسابك الشخصي أولاً ثم أعد فتح هذه الصفحة.
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>الدخول</Button>
          </CardContent>
        </Card>
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
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">كلمة المرور الرئيسية</Label>
              <div className="relative">
                <KeyRound className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                  className="pr-8" dir="ltr" autoComplete="off" required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy || !pw}>
              {busy ? "جاري التحقق…" : "دخول"}
            </Button>
            {error && <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
