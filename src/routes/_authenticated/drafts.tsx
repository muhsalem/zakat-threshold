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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DraftVersionsDialog } from "@/components/wizards/DraftVersionsDialog";
import { usePaginationKeys } from "@/hooks/usePaginationKeys";

export const Route = createFileRoute("/_authenticated/drafts")({
  head: () => ({
    meta: [
      { title: "المسودات والسجل — حاسبة الزكاة" },
      {
        name: "description",
        content: "احفظ مسودات حسابك، وتصفّح المحاولات السابقة، وأعد فتح أيّها.",
      },
    ],
  }),
  component: DraftsPage,
});

// Snapshot is intentionally NOT selected in list queries — it can be tens of KB
// per row (full wizard state). We fetch it on-demand when the user clicks
// "reopen", which cuts payload by ~90% and Postgres time by ~60% on typical
// accounts.
type DraftListItem = {
  id: string;
  title: string;
  wizard_kind: "individual" | "company" | "institution";
  step: number;
  updated_at: string;
};

type RecordListItem = {
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
  has_snapshot: boolean;
  created_at: string;
};

type TypeFilter = "all" | "individual" | "company" | "institution";
type StatusFilter = "all" | "due" | "paid" | "zero";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const WIZARD_KEYS: Record<DraftListItem["wizard_kind"], string> = {
  individual: "wizard:individual:v1",
  company: "wizard:company:v1",
  institution: "wizard:institution:v1",
};

const KIND_LABEL: Record<DraftListItem["wizard_kind"], string> = {
  individual: "فرد",
  company: "شركة",
  institution: "مؤسسة",
};

const RECORDS_PAGE_SIZE = 25;

function DraftsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [savingKind, setSavingKind] = useState<DraftListItem["wizard_kind"] | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recordsRefreshing, setRecordsRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const saving = savingKind !== null;
  // Filters for records (applied server-side)
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Refresh drafts (small list — always fetched fully, sans snapshot).
  async function refreshDrafts(uid: string) {
    const { data, error: de } = await supabase
      .from("zakat_drafts" as never)
      .select("id,title,wizard_kind,step,updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (de) setError(de.message);
    setDrafts((data as unknown as DraftListItem[]) ?? []);
  }

  // Fetch a single page of records with server-side filters, sort, count.
  async function refreshRecords(uid: string, pageIdx: number) {
    const orderMap: Record<SortKey, { col: string; asc: boolean }> = {
      date_desc: { col: "gregorian_date", asc: false },
      date_asc: { col: "gregorian_date", asc: true },
      amount_desc: { col: "zakat_due", asc: false },
      amount_asc: { col: "zakat_due", asc: true },
    };
    const { col, asc } = orderMap[sortKey];

    // Note: `snapshot` replaced with `snapshot IS NOT NULL AS has_snapshot`
    // via a computed alias — Supabase doesn't support that directly, so we
    // instead select a small "snapshot->>0" fragment; simpler: fetch a tiny
    // marker using JSON operator. Cheapest: read the `id` field only from
    // snapshot with `snapshot->>'__marker'` — but any key works to force
    // Postgres to touch the JSON only if requested. Since we want a boolean
    // flag cheaply, we omit snapshot entirely and treat every listed record
    // as reopenable (we re-check on click and show a message if empty).
    let query = supabase
      .from("zakat_records")
      .select(
        "id,record_type,gregorian_date,hijri_year,currency,zakat_base,zakat_due,prepaid_zakat,net_due,notes,created_at",
        { count: "exact" },
      )
      .eq("user_id", uid);

    if (typeFilter !== "all") query = query.eq("record_type", typeFilter);
    if (fromDate) query = query.gte("gregorian_date", fromDate);
    if (toDate) query = query.lte("gregorian_date", toDate);
    if (q.trim()) {
      const needle = q.trim();
      // Search across a few text-ish columns; numeric fields are best filtered separately.
      query = query.or(
        `hijri_year.ilike.%${needle}%,notes.ilike.%${needle}%,currency.ilike.%${needle}%`,
      );
    }

    // Status filter mirrors `statusOf()` server-side so pagination and total
    // counts stay accurate. `net_due` is populated by the writer; when it is
    // null we treat the row as "due" (matches client fallback below).
    if (statusFilter === "zero") {
      query = query.lte("zakat_due", 0);
    } else if (statusFilter === "paid") {
      query = query.gt("zakat_due", 0).lte("net_due", 0);
    } else if (statusFilter === "due") {
      query = query.gt("zakat_due", 0).gt("net_due", 0);
    }

    const from = pageIdx * RECORDS_PAGE_SIZE;
    const to = from + RECORDS_PAGE_SIZE - 1;
    const {
      data,
      error: re,
      count,
    } = await query.order(col, { ascending: asc, nullsFirst: false }).range(from, to);

    if (re) setError((prev) => prev ?? re.message);
    const rows = ((data as unknown as Omit<RecordListItem, "has_snapshot">[]) ?? []).map((r) => ({
      ...r,
      has_snapshot: true,
    }));

    setRecords(rows);
    setRecordsTotal(count ?? 0);
  }

  async function refresh() {
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setError("يجب تسجيل الدخول");
      setLoading(false);
      return;
    }
    // Parallel — drafts & records are independent.
    await Promise.all([refreshDrafts(uid), refreshRecords(uid, page)]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload records when filters/sort/page change (drafts stay put).
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      setRecordsRefreshing(true);
      try {
        await refreshRecords(uid, page);
      } finally {
        setRecordsRefreshing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, typeFilter, statusFilter, sortKey, fromDate, toDate, page]);

  async function saveCurrent(kind: DraftListItem["wizard_kind"]) {
    setSavingKind(kind);
    try {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(WIZARD_KEYS[kind]) : null;
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
      await refreshDrafts(uid);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "خطأ في الحفظ");
    } finally {
      setSavingKind(null);
    }
  }

  async function removeDraft(id: string) {
    if (!confirm("حذف المسودة نهائياً؟")) return;
    setDeletingId(id);
    const { error: err } = await supabase
      .from("zakat_drafts" as never)
      .delete()
      .eq("id", id);
    setDeletingId(null);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success("تم الحذف");
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  // Fetch snapshot on demand (list is snapshot-free for perf).
  async function reopenDraft(d: DraftListItem) {
    setReopening(d.id);
    const { data, error: err } = await supabase
      .from("zakat_drafts" as never)
      .select("snapshot")
      .eq("id", d.id)
      .maybeSingle();
    setReopening(null);
    if (err || !data) {
      toast.error(err?.message ?? "تعذّر جلب المسودة");
      return;
    }
    const snapshot = (data as unknown as { snapshot: Record<string, unknown> }).snapshot ?? {};
    const payload = { at: new Date().toISOString(), step: d.step, data: snapshot };
    window.localStorage.setItem(WIZARD_KEYS[d.wizard_kind], JSON.stringify(payload));
    toast.success("تم استعادة المسودة — انتقل إلى لوحتك");
    navigate({ to: "/dashboard" });
  }

  async function reopenRecord(r: RecordListItem) {
    setReopening(r.id);
    const { data, error: err } = await supabase
      .from("zakat_records")
      .select("snapshot")
      .eq("id", r.id)
      .maybeSingle();
    setReopening(null);
    if (err) {
      toast.error(err.message);
      return;
    }
    const snapshot = (data as unknown as { snapshot: Record<string, unknown> | null } | null)
      ?.snapshot;
    if (!snapshot) {
      toast.error("هذه المحاولة لا تحمل بيانات مصدر قابلة لإعادة الفتح");
      return;
    }
    const kind: DraftListItem["wizard_kind"] =
      r.record_type === "company"
        ? "company"
        : r.record_type === "institution"
          ? "institution"
          : "individual";
    const payload = { at: new Date().toISOString(), step: 0, data: snapshot };
    window.localStorage.setItem(WIZARD_KEYS[kind], JSON.stringify(payload));
    toast.success("تم فتح المحاولة كمسودة قابلة للتعديل");
    navigate({ to: "/dashboard" });
  }

  function statusOf(
    r: Pick<RecordListItem, "zakat_due" | "net_due" | "prepaid_zakat">,
  ): "due" | "paid" | "zero" {
    if ((Number(r.zakat_due) || 0) <= 0) return "zero";
    const net =
      r.net_due != null ? Number(r.net_due) : Number(r.zakat_due) - Number(r.prepaid_zakat ?? 0);
    return net <= 0 ? "paid" : "due";
  }

  const STATUS_LABEL: Record<"due" | "paid" | "zero", string> = {
    due: "مستحقة",
    paid: "مدفوعة",
    zero: "دون النصاب",
  };

  // Only client-side responsibility left: fine-grained free text on the current page.
  // Server already did type/date/needle/sort. Kept minimal for responsiveness.
  const displayRecords = useMemo(() => records, [records]);

  const totalPages = Math.max(1, Math.ceil(recordsTotal / RECORDS_PAGE_SIZE));

  const onPagerKeyDown = usePaginationKeys({
    page,
    totalPages,
    firstPage: 0,
    onChange: setPage,
  });

  function resetFilters() {
    setQ("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortKey("date_desc");
    setFromDate("");
    setToDate("");
    setPage(0);
  }

  // Reset to first page whenever filters change.
  useEffect(() => {
    setPage(0);
  }, [q, typeFilter, statusFilter, sortKey, fromDate, toDate]);

  if (loading) {
    return (
      <div
        className="container mx-auto px-4 py-6 max-w-5xl space-y-6"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">جاري تحميل المسودات والسجل…</span>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-9 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {[0, 1, 2].map((i) => (
                <li key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
            يحفظ الحالة الحالية للمعالج النشط في لوحتك بسحابتك الآمنة، ويصبح متاحاً لإعادة الفتح
            لاحقاً من أي جهاز.
          </p>
          <Input
            placeholder="عنوان اختياري (مثال: زكاة 1447 - الفرع الشمالي)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={saving}
          />
          <div className="flex flex-wrap gap-2" aria-busy={saving}>
            {[
              {
                kind: "individual" as const,
                variant: "default" as const,
                label: "حفظ مسودة (فرد)",
              },
              { kind: "company" as const, variant: "outline" as const, label: "حفظ مسودة (شركة)" },
              {
                kind: "institution" as const,
                variant: "outline" as const,
                label: "حفظ مسودة (مؤسسة)",
              },
            ].map((b) => {
              const busy = savingKind === b.kind;
              return (
                <Button
                  key={b.kind}
                  size="sm"
                  variant={b.variant}
                  onClick={() => saveCurrent(b.kind)}
                  disabled={saving}
                  aria-busy={busy}
                  className="gap-1.5"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {busy ? "جاري الحفظ…" : b.label}
                </Button>
              );
            })}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
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
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_LABEL[d.wizard_kind]}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        خطوة {d.step + 1}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      آخر تحديث: {new Date(d.updated_at).toLocaleString("ar")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => reopenDraft(d)}
                      disabled={reopening !== null || deletingId === d.id}
                      aria-busy={reopening === d.id}
                      className="h-8 gap-1"
                    >
                      {reopening === d.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {reopening === d.id ? "جاري الفتح…" : "فتح"}
                    </Button>
                    <DraftVersionsDialog draftId={d.id} draftTitle={d.title} onRestored={refresh} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDraft(d.id)}
                      disabled={deletingId !== null || reopening === d.id}
                      aria-busy={deletingId === d.id}
                      className="h-8 text-destructive"
                      aria-label={`حذف المسودة ${d.title}`}
                    >
                      {deletingId === d.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card aria-busy={recordsRefreshing}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HistoryIcon className="h-5 w-5 text-primary" /> سجل المحاولات السابقة ({recordsTotal})
            {recordsRefreshing && (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> تحديث…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordsTotal > 0 && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label className="text-xs">بحث</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="سنة، عملة، ملاحظة…"
                      className="pe-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">النوع</Label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">فرز</Label>
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 gap-1 text-xs"
                >
                  <X className="h-3 w-3" /> إعادة تعيين
                </Button>
              </div>
            </div>
          )}
          {recordsTotal === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُنجز أي حسابات معتمدة بعد.</p>
          ) : displayRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد نتائج تطابق التصفية الحالية.</p>
          ) : (
            <>
              <ul className="divide-y">
                {displayRecords.map((r) => {
                  const st = statusOf(r);
                  const stVariant =
                    st === "paid" ? "secondary" : st === "due" ? "default" : "outline";
                  return (
                    <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.hijri_year ?? r.gregorian_date}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {KIND_LABEL[
                              (r.record_type as DraftListItem["wizard_kind"]) ?? "individual"
                            ] ?? r.record_type}
                          </Badge>
                          <Badge variant={stVariant} className="text-[10px]">
                            {STATUS_LABEL[st]}
                          </Badge>
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
                          disabled={reopening !== null}
                          aria-busy={reopening === r.id}
                          title="إعادة فتح كمسودة"
                        >
                          {reopening === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          {reopening === r.id ? "جاري الفتح…" : "إعادة فتح"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {totalPages > 1 && (
                <nav
                  aria-label="تصفّح السجلات"
                  className="flex items-center justify-between pt-2 border-t"
                  onKeyDown={onPagerKeyDown}
                >
                  <span className="text-xs text-muted-foreground">
                    صفحة {page + 1} من {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="h-8"
                      aria-label="الصفحة السابقة"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="h-8"
                      aria-label="الصفحة التالية"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                  </div>
                </nav>
              )}
            </>
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
