import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Save,
  Trash2,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Info,
  History,
  User,
  Building2,
  Send,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signReport } from "@/lib/signature.functions";
import { fmt, ZAKAT_RATE } from "@/lib/zakat";
import {
  fetchClient,
  updateClient,
  deleteClients,
  addHistory,
  wealthOf,
  zakatOf,
  complianceCheck,
  complianceScore,
  COUNTRY_LABELS,
  
  STATUS_LABELS,
  KIND_LABELS,
  type Client,
  type ClientStatus,
  type ZakatBreakdown,
} from "@/lib/accountantStore";

export const Route = createFileRoute("/_authenticated/accountant/$clientId")({
  head: () => ({
    meta: [
      { title: "تفاصيل العميل — بوابة المحاسب" },
      { name: "description", content: "ملخص حساب الزكاة للعميل مع سجل التعديلات ومتابعة الحالة." },
    ],
  }),
  component: ClientDetail,
  notFoundComponent: () => <div className="p-8 text-center">العميل غير موجود</div>,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

  const reload = async () => {
    try {
      setClient(await fetchClient(clientId));
    } catch (e) {
      toast.error("تعذّر التحميل", { description: (e as Error).message });
    }
  };
  useEffect(() => {
    void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [clientId]);

  if (!client) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16 text-center" dir="rtl">
        <p className="text-muted-foreground mb-4">العميل غير موجود.</p>
        <Button asChild>
          <Link to="/accountant">العودة إلى بوابة المحاسب</Link>
        </Button>
      </main>
    );
  }

  const applyPatch = async (patch: Partial<Client>) => {
    setClient({ ...client, ...patch });
    try {
      await updateClient(client.id, patch);
    } catch (e) {
      toast.error("تعذّر الحفظ", { description: (e as Error).message });
      await reload();
    }
  };

  const updateBreakdown = (key: keyof ZakatBreakdown, v: number) => {
    void applyPatch({ breakdown: { ...client.breakdown, [key]: v } });
  };

  const wealth = wealthOf(client);
  const zakat = zakatOf(client);
  const above = wealth >= client.nisab;
  const issues = complianceCheck(client);
  const score = complianceScore(client);

  const recalc = async () => {
    const amount = zakatOf(client);
    await applyPatch({
      lastCalcAt: new Date().toISOString(),
      lastCalcAmount: amount,
      status: "review",
    });
    try {
      await addHistory(client.id, { action: "احتساب الزكاة", amount });
      await reload();
    } catch (e) {
      toast.error("تعذّر تسجيل السجل", { description: (e as Error).message });
    }
    toast.success("تم الاحتساب", {
      description: `الزكاة المستحقة: ${fmt(amount)} ${client.currency}`,
    });
  };

  const setStatus = async (status: ClientStatus) => {
    await applyPatch({ status });
    try {
      await addHistory(client.id, { action: `تغيير الحالة إلى ${STATUS_LABELS[status]}` });
      await reload();
    } catch (e) {
      toast.error("تعذّر تسجيل السجل", { description: (e as Error).message });
    }
    toast.success("تم تحديث الحالة");
  };

  const deleteClient = async () => {
    if (!confirm(`حذف العميل ${client.name}؟`)) return;
    try {
      await deleteClients([client.id]);
      toast.success("تم الحذف");
      navigate({ to: "/accountant" });
    } catch (e) {
      toast.error("تعذّر الحذف", { description: (e as Error).message });
    }
  };

  const issueAndSendReport = async () => {
    if (!client.email) {
      toast.error("لا يوجد بريد إلكتروني للعميل");
      return;
    }
    setSendingReport(true);
    try {
      const zakatAmount = zakatOf(client);
      const reportId = `RPT-${client.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const issued = new Date().toISOString();
      const hash = btoa(`${reportId}|${zakatAmount}|${issued}`).slice(0, 16);
      const { sig } = await signReport({ data: { id: reportId, hash, issued } });

      // احفظ في zakat_records
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error("لم يتم التحقق من هوية المستخدم");
      await supabase.from("zakat_records").insert({
        user_id: uid,
        record_type: client.kind,
        gregorian_date: issued.slice(0, 10),
        currency: client.currency,
        total_assets: wealthOf(client),
        total_liabilities: client.breakdown.debts,
        zakat_base: wealthOf(client),
        zakat_due: zakatAmount,
        prepaid_zakat: 0,
        net_due: zakatAmount,
        notes: `[معتمد] ${client.name} — ${reportId} sig:${sig}`,
        snapshot: { client, reportId, sig } as never,
      });

      // أرسل البريد
      const { error } = await supabase.functions.invoke("send-report-email", {
        body: {
          to: client.email,
          clientName: client.name,
          zakatDue: zakatAmount,
          currency: client.currency,
          reportId,
          gregorianDate: issued.slice(0, 10),
          accountantName: "المحاسب المعتمد",
        },
      });
      if (error) throw new Error(error.message);

      await applyPatch({ status: "completed" });
      await addHistory(client.id, { action: `إصدار تقرير معتمد ${reportId}`, amount: zakatAmount });
      toast.success("تم إصدار التقرير وإرساله", { description: `${client.email} — ${reportId}` });
    } catch (e) {
      toast.error("تعذّر إصدار التقرير", { description: (e as Error).message });
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/accountant" className="hover:text-primary flex items-center gap-1">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> بوابة المحاسب
        </Link>
        <span>/</span>
        <span>{client.name}</span>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {client.kind === "individual" ? (
            <User className="h-8 w-8 text-primary" />
          ) : (
            <Building2 className="h-8 w-8 text-primary" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <div className="text-xs text-muted-foreground">
              {KIND_LABELS[client.kind]} · {COUNTRY_LABELS[client.country] ?? client.country} ·
              السنة {client.fiscalYear}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={client.status} onValueChange={(v) => setStatus(v as ClientStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_LABELS) as [ClientStatus, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={recalc} className="gap-1.5">
            <Calculator className="h-4 w-4" /> احسب الزكاة
          </Button>
          <Button
            onClick={issueAndSendReport}
            disabled={sendingReport}
            variant="outline"
            className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
          >
            {sendingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إصدار وإرسال التقرير
          </Button>
          <Button variant="ghost" size="icon" onClick={deleteClient}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </header>

      {/* ملخص الحساب */}
      <section className="grid md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">الوعاء الزكوي</div>
            <div className="text-2xl font-bold" dir="ltr">
              {fmt(wealth)} <span className="text-xs">{client.currency}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">النصاب</div>
            <div className="text-2xl font-bold" dir="ltr">
              {fmt(client.nisab)}
            </div>
            <div className={`text-[10px] ${above ? "text-emerald-600" : "text-amber-600"}`}>
              {above ? "✓ بلغ النصاب" : "لم يبلغ النصاب"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">
              الزكاة المستحقة ({(ZAKAT_RATE * 100).toFixed(2)}%)
            </div>
            <div className="text-2xl font-bold text-primary" dir="ltr">
              {above ? fmt(zakat) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">مؤشر الامتثال</div>
            <div className="text-2xl font-bold">{score}%</div>
            <div className="text-[10px] text-muted-foreground">تاريخ الحول: {client.hawlDate}</div>
          </CardContent>
        </Card>
      </section>

      {/* تنبيهات الامتثال */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تنبيهات الامتثال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {issues.map((i, idx) => (
            <Alert
              key={idx}
              variant={i.level === "error" ? "destructive" : "default"}
              className={i.level === "ok" ? "border-emerald-500/40 bg-emerald-500/5" : ""}
            >
              {i.level === "error" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : i.level === "warn" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              <AlertDescription className="text-sm">{i.message}</AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* تفصيل الأصول */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تفصيل الأصول الزكوية</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <NumField
            label="نقد وأرصدة بنكية"
            value={client.breakdown.cash}
            onChange={(v) => updateBreakdown("cash", v)}
          />
          <NumField
            label="ذهب وفضة (بالقيمة)"
            value={client.breakdown.gold}
            onChange={(v) => updateBreakdown("gold", v)}
          />
          <NumField
            label="أسهم/استثمارات/عقارات تجارية"
            value={client.breakdown.investments}
            onChange={(v) => updateBreakdown("investments", v)}
          />
          <NumField
            label="عروض تجارة/مخزون"
            value={client.breakdown.inventory}
            onChange={(v) => updateBreakdown("inventory", v)}
          />
          <NumField
            label="ديون مستحقة للعميل"
            value={client.breakdown.receivables}
            onChange={(v) => updateBreakdown("receivables", v)}
          />
          <NumField
            label="ديون على العميل (تُطرح)"
            value={client.breakdown.debts}
            onChange={(v) => updateBreakdown("debts", v)}
          />
          <NumField
            label="النصاب"
            value={client.nisab}
            onChange={(v) => void applyPatch({ nisab: v })}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ الحول</Label>
            <Input
              type="date"
              value={client.hawlDate}
              onChange={(e) => void applyPatch({ hawlDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* سجل التعديلات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> سجل التعديلات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.history.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">لا يوجد سجل بعد</div>
          ) : (
            <ol className="space-y-2 text-sm">
              {[...client.history].reverse().map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 border-r-2 border-primary/40 pr-3 py-1"
                >
                  <div className="flex-1">
                    <div className="font-medium">{h.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString("ar")}
                    </div>
                  </div>
                  {h.amount != null && (
                    <Badge variant="outline" dir="ltr">
                      {fmt(h.amount)} {client.currency}
                    </Badge>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" /> التعديلات تُحفظ تلقائياً في السحابة. اضغط «احسب الزكاة»
        لتسجيل قيمة جديدة في السجل.
      </div>
    </main>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        dir="ltr"
        style={{ textAlign: "right" }}
      />
    </div>
  );
}
