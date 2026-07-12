import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Users,
  ClipboardCheck,
  Wallet,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";

type RecordRow = {
  id: string;
  user_id: string;
  hijri_year: number | null;
  record_type: string | null;
  total_assets: number | null;
  zakat_due: number | null;
  currency: string | null;
  created_at: string;
  status: string | null;
  display_name?: string | null;
};

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "مسودة", variant: "outline" },
  pending: { label: "بانتظار المراجعة", variant: "secondary" },
  approved: { label: "معتمد", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

export function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [users, setUsers] = useState<{
    total: number;
    individual: number;
    company: number;
    institution: number;
    admin: number;
  }>({
    total: 0,
    individual: 0,
    company: 0,
    institution: 0,
    admin: 0,
  });
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: recs }, { data: profs }, { data: apprs }] = await Promise.all([
        supabase
          .from("zakat_records")
          .select("id,user_id,hijri_year,record_type,total_assets,zakat_due,currency,created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("profiles").select("user_id,display_name,account_type"),
        supabase.from("zakat_approvals").select("zakat_record_id,status"),
      ]);

      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const statusMap = new Map((apprs ?? []).map((a: any) => [a.zakat_record_id, a.status]));

      const enriched: RecordRow[] = ((recs as any[]) ?? []).map((r) => ({
        ...r,
        display_name: (profMap.get(r.user_id) as any)?.display_name ?? null,
        status: (statusMap.get(r.id) as string) ?? "draft",
      }));
      setRows(enriched);

      const counts = { total: 0, individual: 0, company: 0, institution: 0, admin: 0 };
      for (const p of (profs as any[]) ?? []) {
        counts.total += 1;
        if (p.account_type && counts[p.account_type as keyof typeof counts] !== undefined) {
          counts[p.account_type as keyof typeof counts] += 1;
        }
      }
      setUsers(counts);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const totalDue = rows.reduce((s, r) => s + (Number(r.zakat_due) || 0), 0);
    return { total: rows.length, pending, approved, totalDue };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.record_type !== typeFilter) return false;
      if (!query) return true;
      return (
        (r.display_name ?? "").toLowerCase().includes(query) ||
        String(r.hijri_year ?? "").includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    });
  }, [rows, q, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<FileText className="h-4 w-4" />} label="إجمالي الإقرارات" value={kpis.total} />
        <Kpi
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="بانتظار المراجعة"
          value={kpis.pending}
          tone="warn"
        />
        <Kpi
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="معتمدة"
          value={kpis.approved}
          tone="ok"
        />
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="إجمالي الزكاة المستحقة"
          value={kpis.totalDue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}
          suffix="ر.س"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> المستخدمون
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">إجمالي: {users.total}</Badge>
            <Badge variant="secondary">أفراد: {users.individual}</Badge>
            <Badge variant="secondary">شركات: {users.company}</Badge>
            <Badge variant="secondary">مؤسسات: {users.institution}</Badge>
            <Badge>مديرون: {users.admin}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">أحدث الإقرارات — وصول سريع لأي تقرير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث بالاسم/السنة/المعرّف…"
                className="pe-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="individual">فرد</SelectItem>
                <SelectItem value="company">شركة</SelectItem>
                <SelectItem value="institution">مؤسسة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending">بانتظار المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="text-end border-b bg-muted/40">
                <tr>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">المستخدم</th>
                  <th className="py-2 px-2">النوع</th>
                  <th className="py-2 px-2">السنة</th>
                  <th className="py-2 px-2">الموجودات</th>
                  <th className="py-2 px-2">الزكاة</th>
                  <th className="py-2 px-2">الحالة</th>
                  <th className="py-2 px-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      لا نتائج مطابقة
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 100).map((r) => {
                    const meta = STATUS_META[r.status ?? "draft"] ?? STATUS_META.draft;
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 text-xs">
                          {new Date(r.created_at).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="py-2 px-2 text-xs">{r.display_name ?? "—"}</td>
                        <td className="py-2 px-2 text-xs">{r.record_type ?? "—"}</td>
                        <td className="py-2 px-2 text-xs">{r.hijri_year ?? "—"}</td>
                        <td className="py-2 px-2 text-xs">
                          {(Number(r.total_assets) || 0).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-2 px-2 text-xs font-medium">
                          {(Number(r.zakat_due) || 0).toLocaleString("ar-EG")} {r.currency ?? ""}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="py-2 px-2">
                          <Button asChild size="sm" variant="outline" className="h-7 gap-1">
                            <Link to="/certified-report/$recordId" params={{ recordId: r.id }}>
                              فتح <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  tone?: "ok" | "warn";
}) {
  const toneCls =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-primary";
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`flex items-center gap-2 text-xs ${toneCls}`}>
          {icon}
          <span>{label}</span>
        </div>
        <div className="mt-1 text-xl font-bold">
          {value}
          {suffix ? (
            <span className="text-xs font-normal text-muted-foreground me-1">{suffix}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
