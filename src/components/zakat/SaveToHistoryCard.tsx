import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, CheckCircle2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Payload {
  record_type: string;
  hijri_year: string | null;
  currency: string;
  total_assets: number;
  total_liabilities: number;
  zakat_base: number;
  zakat_due: number;
  prepaid_zakat: number;
  net_due: number;
  snapshot?: Record<string, any>;
}

export function SaveToHistoryCard({ payload }: { payload: Payload }) {
  const { user, loading } = useAuth();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!user) return;
    setBusy(true); setError(null);
    const { snapshot, ...rest } = payload;
    const { data, error } = await supabase.from("zakat_records").insert({
      user_id: user.id,
      ...rest,
      snapshot: snapshot ?? null,
      notes: notes || null,
    }).select("id").single();
    if (!error && data) {
      setSavedId(data.id);
      const fp = `${user.id}-${data.id}-${payload.zakat_due}`.slice(0, 32);
      await supabase.from("sharia_audit_log").insert({
        user_id: user.id,
        zakat_record_id: data.id,
        action: "create_zakat_record",
        fingerprint: fp,
        payload: payload as any,
        sharia_refs: ["AAOIFI-35", "MAJMAA-FIQHI-3/1", "QURAN-9:60"],
        user_agent: navigator.userAgent.slice(0, 200),
      });
    }
    setBusy(false);
    if (error) setError(error.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 6000); }
  }

  if (loading) return null;

  return (
    <Card className="shadow-soft print:hidden border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Save className="h-4 w-4 text-primary" /> حفظ في السجل السنوي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!user ? (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertDescription className="text-xs leading-relaxed">
              سجّل دخولك لحفظ نتيجة الزكاة وتتبّع تطورها عبر السنوات مع مخططات إحصائية.
              <Link to="/auth" className="inline-flex items-center gap-1 mr-2 text-primary font-bold hover:underline">
                <LogIn className="h-3 w-3" /> دخول / إنشاء حساب
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات اختيارية (مصدر الدخل، ظروف خاصة...)"
              rows={2}
              className="text-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleSave} disabled={busy || saved} className="gap-1.5 flex-1 min-w-[160px]">
                {saved ? <><CheckCircle2 className="h-4 w-4" /> تم الحفظ</> : busy ? "جاري الحفظ..." : <><Save className="h-4 w-4" /> حفظ هذه السنة</>}
              </Button>
              {savedId && (
                <Link to="/certified-report/$recordId" params={{ recordId: savedId }}>
                  <Button variant="default" className="bg-gold hover:bg-gold/90 text-gold-foreground">تقرير معتمد</Button>
                </Link>
              )}
              <Link to="/history"><Button variant="outline">السجل</Button></Link>
              <Link to="/audit"><Button variant="outline">التدقيق</Button></Link>
            </div>
            {error && <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
