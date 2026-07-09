import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Trash2,
  Play,
  Save,
  Loader2,
  History as HistoryIcon,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DraftVersionsDialog } from "@/components/wizards/DraftVersionsDialog";

export const Route = createFileRoute("/_authenticated/drafts")({
  head: () => ({
    meta: [
      { title: "المسودات والسجل — حاسبة الزكاة" },
      { name: "description", content: "احفظ مسودات حسابك، وتصفّح المحاولات السابقة، وأعد فتح أيّها." },
    ],
  }),
  component: DraftsPage,
});

type Draft = {
  id: string;
  title: string;
  wizard_kind: "individual" | "company" | "institution";
  step: number;
  snapshot: Record<string, unknown>;
  updated_at: string;
};

type Record_ = {
  id: string;
  record_type: string;
  gregorian_date: string;
  hijri_year: string | null;
  currency: string;
  zakat_base: number;
  zakat_due: number;
  prepaid_zakat: number | null;
  net_due: number | null;
  notes: string | null;
  snapshot: Record<string, unknown> | null;
  created_at: string;
};

type TypeFilter = "all" | "individual" | "company" | "institution";
type StatusFilter = "all" | "due" | "paid" | "zero";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const WIZARD_KEYS: Record<Draft["wizard_kind"], string> = {
  individual: "wizard:individual:v1",
  company: "wizard:company:v1",
  institution: "wizard:institution:v1",
};

const KIND_LABEL: Record<Draft["wizard_kind"], string> = {
  individual: "فرد",
  company: "شركة",
  institution: "مؤسسة",
};

function DraftsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Filters for records
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function refresh() {
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setError("يجب تسجيل الدخول");
      setLoading(false);
      return;
    }
    const [{ data: d, error: de }, { data: r, error: re }] = await Promise.all([
      supabase
        .from("zakat_drafts" as never)
        .select("id,title,wizard_kind,step,snapshot,updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("zakat_records")
        .select(
          "id,record_type,gregorian_date,hijri_year,currency,zakat_base,zakat_due,prepaid_zakat,net_due,notes,snapshot,created_at",
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (de) setError(de.message);
    if (re) setError((prev) => prev ?? re.message);
    setDrafts(((d as unknown) as Draft[]) ?? []);
    setRecords(((r as unknown) as Record_[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveCurrent(kind: Draft["wizard_kind"]) {
    setSaving(true);
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(WIZARD_KEYS[kind]) : null;
      if (!raw) {
        toast.error(`لا توجد مسودة نشطة للنوع (${KIND_LABEL[kind]}). ابدأ الحساب أولاً.`);
        return;
      }
      const parsed = JSON.parse(raw) as { at: string; step: number; data: unknown };
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const title = newTitle.trim() || `${KIND_LABEL[kind]} — ${new Date().toLocaleString("ar")}`;
      const { error: err } = await supabase.from("zakat_drafts" as never).insert({
        user_id: uid,
        title,
        wizard_kind: kind,
        step: parsed.step ?? 0,
        snapshot: (parsed.data ?? {}) as never,
      } as never);
      if (err) throw err;
      toast.success("تم حفظ المسودة");
      setNewTitle("");
      await refresh();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function removeDraft(id: string) {
    if (!confirm("حذف المسودة نهائياً؟")) return;
    const { error: err } = await supabase.from("zakat_drafts" as never).delete().eq("id", id);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("تم الحذف");
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function reopenDraft(d: Draft) {
    const payload = { at: new Date().toISOString(), step: d.step, data: d.snapshot };
    window.localStorage.setItem(WIZARD_KEYS[d.wizard_kind], JSON.stringify(payload));
    toast.success("تم استعادة المسودة — انتقل إلى لوحتك");
    navigate({ to: "/dashboard" });
  }

  function reopenRecord(r: Record_) {
    if (!r.snapshot) {
      toast.error("هذه المحاولة لا تحمل بيانات مصدر قابلة لإعادة الفتح");
      return;
    }
    const kind: Draft["wizard_kind"] =
      r.record_type === "company"
        ? "company"
        : r.record_type === "institution"
          ? "institution"
          : "individual";
    const payload = { at: new Date().toISOString(), step: 0, data: r.snapshot };
    window.localStorage.setItem(WIZARD_KEYS[kind], JSON.stringify(payload));
    toast.success("تم فتح المحاولة كمسودة قابلة للتعديل");
    navigate({ to: "/dashboard" });
  }

  function statusOf(r: Record_): "due" | "paid" | "zero" {
    if ((Number(r.zakat_due) || 0) <= 0) return "zero";
    const net = r.net_due != null ? Number(r.net_due) : Number(r.zakat_due) - Number(r.prepaid_zakat ?? 0);
    return net <= 0 ? "paid" : "due";
  }

  const STATUS_LABEL: Record<"due" | "paid" | "zero", string> = {
    due: "مستحقة",
    paid: "مدفوعة",
    zero: "دون النصاب",
  };

  const filteredRecords = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 86_400_000 - 1 : null;
    const list = records.filter((r) => {
      if (typeFilter !== "all" && r.record_type !== typeFilter) return false;
      if (statusFilter !== "all" && statusOf(r) !== statusFilter) return false;
      const t = r.gregorian_date ? new Date(r.gregorian_date).getTime() : new Date(r.created_at).getTime();
      if (from != null && t < from) return false;
      if (to != null && t > to) return false;
      if (needle) {
        const hay = [
          r.hijri_year ?? "",
          r.gregorian_date ?? "",
          r.record_type,
          r.currency,
          r.notes ?? "",
          String(r.zakat_due),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const cmp = (a: Record_, b: Record_) => {
      switch (sortKey) {
        case "date_asc":
          return (a.gregorian_date ?? a.created_at).localeCompare(b.gregorian_date ?? b.created_at);
        case "amount_desc":
          return Number(b.zakat_due) - Number(a.zakat_due);
        case "amount_asc":
          return Number(a.zakat_due) - Number(b.zakat_due);
        case "date_desc":
        default:
          return (b.gregorian_date ?? b.created_at).localeCompare(a.gregorian_date ?? a.created_at);
      }
    };
    return [...list].sort(cmp);
  }, [records, q, typeFilter, statusFilter, sortKey, fromDate, toDate]);

  function resetFilters() {
    setQ("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortKey("date_desc");
    setFromDate("");
    setToDate("");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Save className="h-5 w-5 text-primary" /> حفظ مسودة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            يحفظ الحالة الحالية للمعالج النشط في لوحتك بسحابتك الآمنة، ويصبح متاحاً لإعادة الفتح لاحقاً من أي جهاز.
          </p>
          <Input
            placeholder="عنوان اختياري (مثال: زكاة 1447 - الفرع الشمالي)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => saveCurrent("individual")} disabled={saving} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> حفظ مسودة (فرد)
            </Button>
            <Button size="sm" variant="outline" onClick={() => saveCurrent("company")} disabled={saving} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> حفظ مسودة (شركة)
            </Button>
            <Button size="sm" variant="outline" onClick={() => saveCurrent("institution")} disabled={saving} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> حفظ مسودة (مؤسسة)
            </Button>
          </div>
          {error && (
            <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" /> مسوداتي ({drafts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مسودات محفوظة بعد.</p>
          ) : (
            <ul className="divide-y">
              {drafts.map((d) => (
                <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{d.title}</span>
                      <Badge variant="outline" className="text-[10px]">{KIND_LABEL[d.wizard_kind]}</Badge>
                      <Badge variant="secondary" className="text-[10px]">خطوة {d.step + 1}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      آخر تحديث: {new Date(d.updated_at).toLocaleString("ar")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="default" onClick={() => reopenDraft(d)} className="h-8 gap-1">
                      <Play className="h-3 w-3" /> فتح
                    </Button>
                    <DraftVersionsDialog draftId={d.id} draftTitle={d.title} onRestored={refresh} />
                    <Button size="sm" variant="ghost" onClick={() => removeDraft(d.id)} className="h-8 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HistoryIcon className="h-5 w-5 text-primary" /> سجل المحاولات السابقة ({filteredRecords.length}
            {filteredRecords.length !== records.length ? ` / ${records.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {records.length > 0 && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label className="text-xs">بحث</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="سنة، عملة، ملاحظة، مبلغ…"
                      className="pr-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">النوع</Label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="individual">فرد</SelectItem>
                      <SelectItem value="company">شركة</SelectItem>
                      <SelectItem value="institution">مؤسسة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الحالة</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="due">مستحقة</SelectItem>
                      <SelectItem value="paid">مدفوعة</SelectItem>
                      <SelectItem value="zero">دون النصاب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">من تاريخ</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">فرز</Label>
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">التاريخ ↓</SelectItem>
                      <SelectItem value="date_asc">التاريخ ↑</SelectItem>
                      <SelectItem value="amount_desc">المبلغ ↓</SelectItem>
                      <SelectItem value="amount_asc">المبلغ ↑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 gap-1 text-xs">
                  <X className="h-3 w-3" /> إعادة تعيين
                </Button>
              </div>
            </div>
          )}
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُنجز أي حسابات معتمدة بعد.</p>
          ) : filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد نتائج تطابق التصفية الحالية.</p>
          ) : (
            <ul className="divide-y">
              {filteredRecords.map((r) => {
                const st = statusOf(r);
                const stVariant = st === "paid" ? "secondary" : st === "due" ? "default" : "outline";
                return (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{r.hijri_year ?? r.gregorian_date}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {KIND_LABEL[(r.record_type as Draft["wizard_kind"]) ?? "individual"] ?? r.record_type}
                        </Badge>
                        <Badge variant={stVariant} className="text-[10px]">{STATUS_LABEL[st]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          الزكاة: {Number(r.zakat_due).toLocaleString()} {r.currency}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        محفوظ: {new Date(r.created_at).toLocaleString("ar")}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reopenRecord(r)}
                        className="h-8 gap-1"
                        disabled={!r.snapshot}
                        title={r.snapshot ? "إعادة فتح كمسودة" : "لا تحمل بيانات مصدر"}
                      >
                        <Play className="h-3 w-3" /> إعادة فتح
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard">← العودة إلى لوحتي</Link>
        </Button>
      </div>
    </div>
  );
}
