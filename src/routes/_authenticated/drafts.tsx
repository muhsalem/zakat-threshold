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
  snapshot: Record<string, unknown> | null;
  created_at: string;
};

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
        .select("id,record_type,gregorian_date,hijri_year,currency,zakat_base,zakat_due,snapshot,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50),
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
            <HistoryIcon className="h-5 w-5 text-primary" /> سجل المحاولات السابقة ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُنجز أي حسابات معتمدة بعد.</p>
          ) : (
            <ul className="divide-y">
              {records.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{r.hijri_year ?? r.gregorian_date}</span>
                      <Badge variant="outline" className="text-[10px]">{r.record_type}</Badge>
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
              ))}
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
