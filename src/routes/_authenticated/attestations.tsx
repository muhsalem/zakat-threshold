import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAttestation, listMyAttestations } from "@/lib/attestations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Stamp, Shield, FileCheck2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/attestations")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AttestationsPage,
});

function AttestationsPage() {
  const { id } = useSearch({ from: "/_authenticated/attestations" });
  return id ? <SingleAttestation id={id} /> : <AttestationsList />;
}

function AttestationsList() {
  const listFn = useServerFn(listMyAttestations);
  const { data, isLoading } = useQuery({ queryKey: ["attestations"], queryFn: () => listFn() });
  return (
    <div dir="rtl" className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Stamp className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">شهادات الاعتماد الشرعي</h1>
          <p className="text-sm text-muted-foreground">شهادات مطبوعة ببصمة SHA-256 قابلة للتحقق العام.</p>
        </div>
      </div>
      {isLoading ? <p className="text-sm">جارٍ التحميل…</p> :
        !data?.length ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد شهادات بعد.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {data.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      المراجع: {a.attestor_name} · {new Date(a.issued_at).toLocaleDateString("ar-EG")}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">
                      بصمة: {a.content_hash.slice(0, 24)}…
                    </div>
                  </div>
                  <a href={`/attestations?id=${a.id}`} className="text-sm text-primary hover:underline">عرض</a>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}

function SingleAttestation({ id }: { id: string }) {
  const getFn = useServerFn(getAttestation);
  const { data: a, isLoading } = useQuery({
    queryKey: ["attestation", id],
    queryFn: () => getFn({ data: { id } }),
  });

  if (isLoading) return <div dir="rtl" className="container py-8">جارٍ التحميل…</div>;
  if (!a) return <div dir="rtl" className="container py-8 text-destructive">الشهادة غير موجودة أو لا تملك صلاحية عرضها.</div>;

  const verifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify?id=${a.id}&hash=${a.content_hash}&issued=${a.issued_at}`
    : "";

  return (
    <div dir="rtl" className="container mx-auto max-w-3xl py-8">
      <div className="flex justify-end gap-2 print:hidden mb-4">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> طباعة الشهادة
        </Button>
      </div>

      <div className="bg-card border-4 border-double border-primary/40 rounded-lg p-10 print:border-2 print:shadow-none shadow-2xl">
        <div className="text-center space-y-3 border-b border-primary/20 pb-6">
          <div className="flex justify-center"><Shield className="h-12 w-12 text-primary" /></div>
          <h1 className="text-3xl font-bold text-primary">شهادة الاعتماد الشرعي</h1>
          <p className="text-sm text-muted-foreground">وفق معيار AAOIFI رقم (35) للزكاة</p>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="موضوع الشهادة" value={a.title} />
          <Field label="المراجع الشرعي" value={a.attestor_name} />
          {a.attestor_license && <Field label="رقم الترخيص" value={a.attestor_license} />}
          <Field label="تاريخ الإصدار" value={new Date(a.issued_at).toLocaleString("ar-EG")} />

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">رأي المراجع</div>
            <div className="bg-muted/40 p-4 rounded leading-relaxed border-r-4 border-primary">
              {a.opinion}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">المراجع الشرعية المعتمدة</div>
            <div className="flex flex-wrap gap-2">
              {(a.sharia_refs ?? []).map((r: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-primary/20">
          <div className="flex items-start gap-4">
            <FileCheck2 className="h-8 w-8 text-primary shrink-0 mt-1" />
            <div className="flex-1 text-xs space-y-1">
              <div className="font-semibold">بصمة المحتوى (SHA-256) قابلة للتحقق:</div>
              <div className="font-mono break-all text-muted-foreground">{a.content_hash}</div>
              <div className="font-semibold mt-2">رابط التحقق العام:</div>
              <div className="font-mono break-all text-primary">{verifyUrl}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-muted-foreground">
          هذه الشهادة موقّعة رقميًا ومخزّنة في سجل التدقيق غير القابل للتعديل. أي تغيير في محتواها يُبطل البصمة.
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-dashed border-primary/10 pb-2">
      <div className="text-xs font-semibold text-muted-foreground min-w-32">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
