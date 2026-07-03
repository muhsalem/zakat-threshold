import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listErpConnections,
  saveErpConnection,
  deleteErpConnection,
  testErpConnection,
  listErpSyncLog,
  pushZakatRecordToErp,
} from "@/lib/erp/connections.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Trash2, Plug, RefreshCw, Send, ExternalLink } from "lucide-react";

type Provider = "odoo" | "odoo_sandbox" | "sap" | "sap_sandbox";

export const Route = createFileRoute("/_authenticated/erp-setup")({
  head: () => ({
    meta: [
      { title: "إعداد موصلات ERP — Odoo & SAP" },
      { name: "description", content: "اربط حاسبة الزكاة بحسابك على Odoo أو SAP لدفع قيود الزكاة تلقائياً." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ErpSetupPage,
});

const PRESETS: Record<Provider, { base_url: string; hint: string; docs: string }> = {
  odoo_sandbox: {
    base_url: "https://demo.odoo.com",
    hint: "استخدم بيئة demo.odoo.com المجانية للاختبار.",
    docs: "https://www.odoo.com/documentation/17.0/developer/reference/external_api.html",
  },
  odoo: {
    base_url: "https://YOUR-ORG.odoo.com",
    hint: "أدخل رابط instance الخاص بك على Odoo.sh أو self-hosted.",
    docs: "https://www.odoo.com/documentation/17.0/developer/reference/external_api.html",
  },
  sap_sandbox: {
    base_url: "https://sandbox.api.sap.com",
    hint: "استخدم SAP API Business Hub Sandbox (API Key من api.sap.com).",
    docs: "https://api.sap.com/api/API_JOURNALENTRY_SRV/overview",
  },
  sap: {
    base_url: "https://myXXXXXX.s4hana.cloud.sap",
    hint: "أدخل رابط S/4HANA Cloud الخاص بشركتك + Communication User.",
    docs: "https://help.sap.com/docs/SAP_S4HANA_CLOUD",
  },
};

interface Conn {
  id: string;
  provider: Provider;
  label: string;
  base_url: string;
  db_name: string | null;
  username: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
}
interface LogRow {
  id: string;
  provider: string;
  external_id: string | null;
  status: string;
  reference: string | null;
  amount: number | null;
  currency: string | null;
  error_message: string | null;
  created_at: string;
  zakat_record_id: string | null;
}
interface ZakatRow {
  id: string;
  gregorian_date: string;
  currency: string;
  zakat_due: number;
}

function ErpSetupPage() {
  const router = useRouter();
  const list = useServerFn(listErpConnections);
  const save = useServerFn(saveErpConnection);
  const del = useServerFn(deleteErpConnection);
  const test = useServerFn(testErpConnection);
  const listLog = useServerFn(listErpSyncLog);
  const push = useServerFn(pushZakatRecordToErp);

  const [conns, setConns] = useState<Conn[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [records, setRecords] = useState<ZakatRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{
    provider: Provider; label: string; base_url: string;
    db_name: string; username: string; api_key: string;
  }>({
    provider: "odoo_sandbox", label: "Odoo Sandbox",
    base_url: PRESETS.odoo_sandbox.base_url, db_name: "demo", username: "admin", api_key: "",
  });

  const reload = async () => {
    const [c, l] = await Promise.all([list(), listLog()]);
    setConns(c as Conn[]);
    setLogs(l as LogRow[]);
    const { data: rec } = await supabase
      .from("zakat_records")
      .select("id, gregorian_date, currency, zakat_due")
      .order("gregorian_date", { ascending: false }).limit(10);
    setRecords((rec as ZakatRow[]) ?? []);
  };

  useEffect(() => { reload().catch(console.error); /* eslint-disable-line */ }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("save");
    try {
      await save({ data: form });
      toast.success("تم حفظ الاتصال بنجاح");
      setForm({ ...form, api_key: "" });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ في الحفظ");
    } finally { setBusy(null); }
  };

  const runTest = async (id: string) => {
    setBusy(`test:${id}`);
    try {
      const r = await test({ data: { id } }) as { ok: boolean; message: string; latency_ms: number };
      if (r.ok) toast.success(`✔ ${r.message} (${r.latency_ms}ms)`);
      else toast.error(`✖ ${r.message}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاختبار");
    } finally { setBusy(null); }
  };

  const runPush = async (connection_id: string, zakat_record_id: string) => {
    setBusy(`push:${zakat_record_id}`);
    try {
      const r = await push({ data: { connection_id, zakat_record_id } }) as { ok: boolean; external_id?: string; error?: string };
      if (r.ok) toast.success(`تم دفع القيد — ID: ${r.external_id}`);
      else toast.error(`فشل الدفع: ${r.error}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الدفع");
    } finally { setBusy(null); }
  };

  const runDelete = async (id: string) => {
    if (!confirm("حذف هذا الاتصال؟")) return;
    await del({ data: { id } });
    await reload();
    toast.success("تم الحذف");
    router.invalidate();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3">
          <Plug className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">إعداد موصلات ERP</h1>
            <p className="text-sm text-muted-foreground">
              اربط حسابك على Odoo أو SAP لدفع قيود الزكاة تلقائياً (Dr Zakat Expense / Cr Zakat Payable).
            </p>
          </div>
        </header>

        <Card>
          <CardHeader><CardTitle>إضافة اتصال جديد</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>المزوّد</Label>
                <Select value={form.provider} onValueChange={(v: Provider) => setForm({ ...form, provider: v, base_url: PRESETS[v].base_url, label: PRESETS[v].base_url.replace(/https?:\/\//, "") })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="odoo_sandbox">Odoo — Sandbox (demo.odoo.com)</SelectItem>
                    <SelectItem value="odoo">Odoo — Production / Odoo.sh</SelectItem>
                    <SelectItem value="sap_sandbox">SAP — API Business Hub Sandbox</SelectItem>
                    <SelectItem value="sap">SAP S/4HANA Cloud — Production</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{PRESETS[form.provider].hint}{" "}
                  <a href={PRESETS[form.provider].docs} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">
                    التوثيق <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div>
                <Label>اسم الاتصال</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Base URL</Label>
                <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://..." required />
              </div>
              {(form.provider === "odoo" || form.provider === "odoo_sandbox") && (
                <div>
                  <Label>Database</Label>
                  <Input value={form.db_name} onChange={(e) => setForm({ ...form, db_name: e.target.value })} placeholder="mycompany" />
                </div>
              )}
              <div>
                <Label>Username / User ID</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin@company.com" />
              </div>
              <div className="sm:col-span-2">
                <Label>API Key / Password</Label>
                <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} required
                  placeholder={form.provider.startsWith("sap") ? "APIKey من SAP API Business Hub" : "Odoo API Key (Preferences → Account Security)"} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy === "save"} className="w-full">
                  {busy === "save" ? "جارٍ الحفظ..." : "حفظ الاتصال"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>اتصالات ERP المحفوظة ({conns.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {conns.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد اتصالات بعد.</p>}
            {conns.map((c) => (
              <div key={c.id} className="rounded border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.provider} · {c.base_url}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => runTest(c.id)} disabled={busy === `test:${c.id}`}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      اختبار
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => runDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {c.last_test_status && (
                  <Badge variant={c.last_test_status.startsWith("ok") ? "default" : "destructive"}
                    className={c.last_test_status.startsWith("ok") ? "bg-emerald-600 hover:bg-emerald-600 gap-1" : "gap-1"}>
                    {c.last_test_status.startsWith("ok") ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {c.last_test_status.slice(0, 80)}
                  </Badge>
                )}
                {records.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">دفع قيد زكاة إلى هذا الـERP:</div>
                    {records.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{r.gregorian_date} · {Number(r.zakat_due).toFixed(2)} {r.currency}</span>
                        <Button size="sm" variant="secondary" onClick={() => runPush(c.id, r.id)} disabled={busy === `push:${r.id}`}>
                          <Send className="h-3 w-3 mr-1" /> دفع
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>سجل عمليات المزامنة ({logs.length})</CardTitle></CardHeader>
          <CardContent>
            {logs.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد عمليات مزامنة بعد.</p>}
            <div className="space-y-1 text-xs">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 border-b py-1.5">
                  <span className="font-mono truncate">
                    {new Date(l.created_at).toLocaleString("ar-EG-u-nu-latn")} · {l.provider} · {l.reference}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{l.amount?.toFixed(2)} {l.currency}</span>
                    {l.status === "success" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />{l.external_id}</Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{l.error_message?.slice(0, 30)}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
