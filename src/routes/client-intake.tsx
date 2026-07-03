import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, Shield, Users, Building2, ArrowLeft, Send } from "lucide-react";
import { upsertClient, newClientFromIntake, type ClientKind, type Madhab, MADHAB_LABELS, COUNTRY_LABELS } from "@/lib/accountantStore";

export const Route = createFileRoute("/client-intake")({
  head: () => ({
    meta: [
      { title: "احسب زكاتك مع محاسبك المعتمد — نافذة العميل" },
      { name: "description", content: "أدخل بياناتك المالية بأمان لتصلك حاسبة زكاة مخصصة، وترسل مباشرة إلى محاسبك أو شركتك المعتمدة." },
      { property: "og:title", content: "احسب زكاتك — نافذة العميل" },
      { property: "og:description", content: "تسليم بيانات آمن للمحاسب المعتمد" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ClientIntakePage,
});

function ClientIntakePage() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", kind: "individual" as ClientKind, country: "SA", madhab: "mixed" as Madhab,
    cash: 0, gold: 0, investments: 0, inventory: 0, receivables: 0, debts: 0,
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) return toast.error("الاسم والبريد مطلوبان");
    const client = newClientFromIntake({
      name: form.name, email: form.email, kind: form.kind, country: form.country, madhab: form.madhab,
      breakdown: {
        cash: form.cash, gold: form.gold, investments: form.investments,
        inventory: form.inventory, receivables: form.receivables, debts: form.debts,
      },
      notes: form.notes,
    });
    upsertClient(client);
    setSubmitted(true);
    toast.success("تم إرسال بياناتك إلى المحاسب", { description: "سيتواصل معك المحاسب بعد مراجعة الحساب." });
  };

  if (submitted) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16 text-center space-y-4" dir="rtl">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-3xl font-bold">تم استلام بياناتك بنجاح</h1>
        <p className="text-muted-foreground">
          سيقوم المحاسب/الشركة بمراجعة بياناتك واحتساب الزكاة، وستصلك النتيجة على بريدك.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline"><Link to="/">العودة للرئيسية</Link></Button>
          <Button onClick={() => { setSubmitted(false); setForm({ ...form, name: "", email: "" }); }}>إرسال حساب آخر</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6" dir="rtl">
      {/* هيرو تسويقي */}
      <section className="relative rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-background border p-8 md:p-12 space-y-4">
        <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> نافذة العميل</Badge>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
          احسب زكاتك بدقة شرعية — وأرسلها لمحاسبك بضغطة زر
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          أدخل بياناتك المالية في نموذج آمن، وتصل مباشرة إلى المحاسب أو الشركة المعتمدة عبر منصتنا لمراجعتها واعتمادها.
          مبنية على المعايير الشرعية للاتحاد الدولي لعلماء المسلمين وهيئة المحاسبة (AAOIFI).
        </p>
        <div className="flex flex-wrap gap-3">
          <FeatureChip icon={<Shield className="h-3.5 w-3.5" />} text="حماية بيانات مشفّرة" />
          <FeatureChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="مراجعة محاسب معتمد" />
          <FeatureChip icon={<Users className="h-3.5 w-3.5" />} text="أفراد وشركات ومؤسسات" />
        </div>
      </section>

      {!signedIn && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span>لحفظ حساباتك ومتابعتها لاحقاً، سجّل الدخول (اختياري).</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSignedIn(true)}>متابعة بدون تسجيل</Button>
              <Button size="sm" asChild><Link to="/auth">تسجيل دخول</Link></Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>بياناتك</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="الاسم الكامل *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="محمد بن عبدالله" />
          </Field>
          <Field label="البريد الإلكتروني *">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" dir="ltr" />
          </Field>
          <Field label="نوع الحساب">
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as ClientKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual"><Users className="inline h-3.5 w-3.5 ms-1" /> فرد</SelectItem>
                <SelectItem value="company"><Building2 className="inline h-3.5 w-3.5 ms-1" /> شركة</SelectItem>
                <SelectItem value="institution"><Building2 className="inline h-3.5 w-3.5 ms-1" /> مؤسسة</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="الدولة">
            <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(COUNTRY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="المذهب الفقهي">
            <Select value={form.madhab} onValueChange={(v) => setForm({ ...form, madhab: v as Madhab })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(MADHAB_LABELS) as [Madhab, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الأصول والالتزامات</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <NumField label="نقد وأرصدة بنكية" v={form.cash} on={(v) => setForm({ ...form, cash: v })} />
          <NumField label="ذهب/فضة (بالقيمة)" v={form.gold} on={(v) => setForm({ ...form, gold: v })} />
          <NumField label="أسهم واستثمارات" v={form.investments} on={(v) => setForm({ ...form, investments: v })} />
          <NumField label="عروض تجارة/مخزون" v={form.inventory} on={(v) => setForm({ ...form, inventory: v })} />
          <NumField label="ديون مستحقة لك" v={form.receivables} on={(v) => setForm({ ...form, receivables: v })} />
          <NumField label="ديون عليك" v={form.debts} on={(v) => setForm({ ...form, debts: v })} />
          <div className="md:col-span-2">
            <Field label="ملاحظات للمحاسب">
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="أي تفاصيل إضافية..." />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/" })} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> إلغاء
        </Button>
        <Button size="lg" onClick={submit} className="gap-1.5">
          <Send className="h-4 w-4" /> إرسال إلى المحاسب
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        بإرسالك النموذج فأنت توافق على مشاركة بياناتك مع المحاسب/الشركة المسجّلين على المنصة لغرض احتساب الزكاة فقط.
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function NumField({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min="0" step="0.01" value={v || ""} onChange={(e) => on(Number(e.target.value) || 0)} dir="ltr" style={{ textAlign: "right" }} />
    </Field>
  );
}

function FeatureChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 border text-xs">
      {icon}{text}
    </div>
  );
}
