import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Clock, Hash, FileText, AlertTriangle, ArrowRight, Printer, Search, BadgeCheck, ShieldAlert } from "lucide-react";
import { verifyReport } from "@/lib/signature.functions";

interface VerifySearch {
  id?: string;
  hash?: string;
  basis?: string;
  method?: string;
  issuer?: string;
  v?: string;
  issued?: string;
  sig?: string;
}

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): VerifySearch => ({
    id: typeof s.id === "string" ? s.id : undefined,
    hash: typeof s.hash === "string" ? s.hash : undefined,
    basis: typeof s.basis === "string" ? s.basis : undefined,
    method: typeof s.method === "string" ? s.method : undefined,
    issuer: typeof s.issuer === "string" ? s.issuer : undefined,
    v: typeof s.v === "string" ? s.v : undefined,
    issued: typeof s.issued === "string" ? s.issued : undefined,
    sig: typeof s.sig === "string" ? s.sig : undefined,
  }),
  component: VerifyPage,
});

const PLATFORM = "نِصاب — الحاسبة الشرعية المعتمدة للزكاة";

function VerifyPage() {
  const s = useSearch({ from: "/verify" });
  const navigate = useNavigate({ from: "/verify" });
  const [code, setCode] = useState(s.id ?? "");
  const [sigState, setSigState] = useState<"unsigned" | "checking" | "valid" | "invalid">("unsigned");

  const id = s.id ?? "";
  const issued = s.issued ? new Date(s.issued) : null;
  const validUntil = issued ? new Date(issued.getTime() + 354 * 86400000) : null;
  const expired = validUntil ? Date.now() > validUntil.getTime() : false;
  const sigVerified = sigState === "valid";
  const sigBroken = sigState === "invalid";
  const isValid = !!id && !expired && !sigBroken;
  const hasQuery = !!id;

  useEffect(() => {
    if (!s.sig || !s.id || !s.hash || !s.issued) { setSigState("unsigned"); return; }
    setSigState("checking");
    verifyReport({ data: { id: s.id, hash: s.hash, issued: s.issued, sig: s.sig } })
      .then((r) => setSigState(r.valid ? "valid" : "invalid"))
      .catch(() => setSigState("invalid"));
  }, [s.sig, s.id, s.hash, s.issued]);

  const onLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const v = code.trim();
    if (!v) return;
    navigate({ to: "/verify", search: { id: v } });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 py-10 px-4 text-right">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowRight className="h-4 w-4 rotate-180" /> العودة إلى الحاسبة
        </Link>

        <Card className="border-2 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" /> التحقق من تقرير برقم/كود التقرير
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              أدخل رقم التقرير (يظهر أعلى ملف PDF أو في رابط QR) للتحقق من صحته وصلاحيته.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onLookup} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: NSB-2026-000123"
                className="font-mono text-sm"
                dir="ltr"
              />
              <Button type="submit" className="gap-2 shrink-0">
                <Search className="h-4 w-4" /> تحقق الآن
              </Button>
            </form>
          </CardContent>
        </Card>

        {hasQuery && (

        <Card className="border-2 shadow-lg overflow-hidden">
          <div className={`h-2 ${isValid ? "bg-primary" : "bg-destructive"}`} />
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className={`h-6 w-6 ${isValid ? "text-primary" : "text-destructive"}`} />
                صفحة التحقق من تقرير الزكاة
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isValid ? "default" : "destructive"} className="text-sm px-3 py-1">
                  {isValid ? "صالح · Valid" : expired ? "منتهي الصلاحية · Expired" : sigBroken ? "توقيع غير مطابق" : "غير معروف"}
                </Badge>
                {sigVerified && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" /> توقيع رقمي صحيح
                  </Badge>
                )}
                {sigBroken && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> توقيع غير صالح / مُحرَّف
                  </Badge>
                )}
                {sigState === "unsigned" && (
                  <Badge variant="outline" className="gap-1 text-xs">بدون توقيع رقمي</Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{PLATFORM}</p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Field icon={<FileText className="h-4 w-4" />} label="رقم التقرير" value={id || "—"} mono />
              <Field icon={<Hash className="h-4 w-4" />} label="بصمة التوثيق (SHA‑256)" value={s.hash || "—"} mono />
              <Field icon={<Clock className="h-4 w-4" />} label="وقت الإنشاء" value={issued ? issued.toLocaleString("ar-EG") : "—"} />
              <Field icon={<Clock className="h-4 w-4" />} label="صالح حتى" value={validUntil ? validUntil.toLocaleDateString("ar-EG") : "—"} />
              <Field label="إصدار النظام" value={s.v || "Nisab v1.0"} />
              <Field label="طريقة الحساب" value={s.method || "وفق معيار AAOIFI 35 ومدخلات المستخدم"} />
              <Field label="النصاب المعتمد" value={basisLabel(s.basis)} />
              <Field label="جهة الإصدار" value={s.issuer || PLATFORM} />
              <Field icon={<ShieldCheck className="h-4 w-4" />} label="التوقيع الرقمي (HMAC‑SHA256)" value={s.sig || "—"} mono />
            </div>

            <Separator />

            <div className={`rounded-lg p-4 text-sm flex gap-3 ${isValid ? "bg-primary/5 border border-primary/20" : "bg-destructive/5 border border-destructive/20"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${isValid ? "text-primary" : "text-destructive"}`} />
              <div className="leading-relaxed">
                <b>إخلاء مسؤولية:</b> هذه الصفحة تتحقّق من بيانات التقرير المُمرَّرة في الرابط فقط،
                وهي أداة مساعدة للتحقق من سلامة الوثيقة وليست فتوى شرعية ملزمة. التوقيع الرقمي يضمن
                أن التقرير صادر فعلاً من منصة نِصاب ولم يُعدَّل بعد الإصدار. للحالات الخاصة يُرجى
                مراجعة عالم/مفتٍ معتمد.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> طباعة هذه الصفحة
              </Button>
              <Link to="/">
                <Button variant="default" className="gap-2">
                  <FileText className="h-4 w-4" /> إنشاء/تنزيل تقرير جديد
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              لتنزيل النسخة الأصلية من ملف PDF، استخدم الزرّ أعلاه أو افتح الحاسبة وأعد طباعة
              نفس التقرير برقم التعريف المُبيَّن. التقرير صالح لمدة سنة قمرية (354 يوماً) من تاريخ إصداره
              ويصبح بعدها بحاجة إلى إعادة احتساب لتقدير الحَوْل الجديد.
            </p>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className={`mt-1 font-semibold break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</div>
    </div>
  );
}

function basisLabel(b?: string): string {
  if (b === "gold") return "نصاب الذهب (85 جم)";
  if (b === "silver") return "نصاب الفضة (595 جم)";
  if (b === "beneficial") return "الأنفع للفقراء (الأدنى بين النصابين)";
  return "الأنفع للفقراء (افتراضي)";
}
