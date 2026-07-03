import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, LayoutDashboard, Users, Building2, TrendingUp, Wallet, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/zakat";

type Row = {
  id: string;
  record_type: string;
  hijri_year: string | null;
  gregorian_date: string;
  currency: string;
  total_assets: number;
  zakat_due: number;
  net_due: number;
  created_at: string;
  user_id: string;
  notes: string | null;
  approval_status?: "pending" | "approved" | "rejected" | null;
  client_name?: string;
};

const STATUS_META: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  approved: { label: "معتمد", variant: "default" },
  pending: { label: "قيد المراجعة", variant: "secondary" },
  rejected: { label: "مرفوض", variant: "destructive" },
  draft: { label: "مسودة", variant: "outline" },
};

export function AccountantDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "company">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [recRes, apprRes] = await Promise.all([
        supabase
          .from("zakat_records")
          .select("id,record_type,hijri_year,gregorian_date,currency,total_assets,zakat_due,net_due,created_at,user_id,notes")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("zakat_approvals")
          .select("zakat_record_id,status")
          .not("zakat_record_id", "is", null),
      ]);
      if (cancelled) return;
      if (recRes.error) { setErr(recRes.error.message); setLoading(false); return; }
      const records = (recRes.data ?? []) as any[];
      const statusMap = new Map<string, "pending" | "approved" | "rejected">();
      for (const a of (apprRes.data ?? []) as any[]) {
        if (a.zakat_record_id) statusMap.set(a.zakat_record_id, a.status);
      }
      const userIds = Array.from(new Set(records.map((r) => r.user_id)));
      let names = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", userIds);
        for (const p of (profiles ?? []) as any[]) names.set(p.user_id, p.display_name ?? "—");
      }
      setRows(records.map((r) => ({
        ...r,
        total_assets: Number(r.total_assets),
        zakat_due: Number(r.zakat_due),
        net_due: Number(r.net_due),
        approval_status: statusMap.get(r.id) ?? null,
        client_name: names.get(r.user_id) ?? "عميل",
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (typeFilter !== "all" && r.record_type !== typeFilter) return false;
    const status = r.approval_status ?? "draft";
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (q) {
      const hay = `${r.id} ${r.hijri_year ?? ""} ${r.client_name ?? ""} ${r.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, q, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const last30 = rows.filter((r) => now - new Date(r.created_at).getTime() < 30 * 24 * 3600 * 1000);
    const pending = rows.filter((r) => (r.approval_status ?? "draft") === "pending").length;
    const totalDue = last30.reduce((s, r) => s + (r.zakat_due || 0), 0);
    const individuals = last30.filter((r) => r.record_type === "individual").length;
    const companies = last30.length - individuals;
    return { count: last30.length, pending, totalDue, individuals, companies };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<LayoutDashboard className="h-4 w-4" />} label="إقرارات آخر 30 يوم" value={String(kpis.count)} />
        <Kpi icon={<Users className="h-4 w-4" />} label="أفراد / شركات" value={`${kpis.individuals} / ${kpis.companies}`} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="قيد المراجعة" value={String(kpis.pending)} />
        <Kpi icon={<Wallet className="h-4 w-4" />} label="زكاة مستحقة (30 يوم)" value={fmt(kpis.totalDue)} suffix="ر.س" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> أحدث الإقرارات
          </CardTitle>
          <p className="text-xs text-muted-foreground">آخر 100 إقرار عبر المنصة — افتح أي سطر لعرض التقرير المعتمد.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input placeholder="بحث بالعميل/السنة/الملاحظات…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:col-span-2" />
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="individual">فرد</SelectItem>
                <SelectItem value="company">شركة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin ml-2" /> جارٍ التحميل…
            </div>
          )}
          {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
          {!loading && !err && (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>السنة</TableHead>
                    <TableHead className="text-end">الوعاء</TableHead>
                    <TableHead className="text-end">الزكاة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>فتح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">لا توجد إقرارات مطابقة.</TableCell>
                    </TableRow>
                  )}
                  {filtered.map((r) => {
                    const s = STATUS_META[r.approval_status ?? "draft"];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ar-EG")}</TableCell>
                        <TableCell className="text-sm">{r.client_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {r.record_type === "individual" ? <><Users className="h-3 w-3 ml-1 inline" />فرد</> : <><Building2 className="h-3 w-3 ml-1 inline" />شركة</>}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.hijri_year || "—"}</TableCell>
                        <TableCell className="text-end" dir="ltr">{fmt(r.total_assets)}</TableCell>
                        <TableCell className="text-end font-semibold text-primary" dir="ltr">{fmt(r.zakat_due)}</TableCell>
                        <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="outline" className="gap-1">
                            <Link to="/certified-report/$recordId" params={{ recordId: r.id }}>
                              <ExternalLink className="h-3.5 w-3.5" /> فتح
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
        <div className="mt-1 text-xl font-bold" dir="ltr">
          {value} {suffix && <span className="text-xs text-muted-foreground font-normal">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
