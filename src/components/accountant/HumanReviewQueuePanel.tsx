import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inbox, Loader2, Info, Clock, User } from "lucide-react";
import {
  listReviewQueue,
  claimReviewItem,
  updateReviewItem,
  type ReviewQueueItem,
  type ReviewStatus,
} from "@/lib/humanReviewQueue.functions";

const STATUS_LABEL: Record<ReviewStatus, string> = {
  queued: "بانتظار المطالبة",
  claimed: "مُطالَب به",
  in_review: "قيد المراجعة",
  needs_info: "بحاجة معلومات إضافية",
  completed: "مكتمل",
  cancelled: "ملغى",
};
const STATUS_COLOR: Record<ReviewStatus, string> = {
  queued: "text-amber-600 border-amber-500/40",
  claimed: "text-primary border-primary/40",
  in_review: "text-primary border-primary/40",
  needs_info: "text-destructive border-destructive/40",
  completed: "text-emerald-600 border-emerald-500/40",
  cancelled: "text-muted-foreground border-muted",
};
const KIND_LABEL: Record<string, string> = {
  individual: "فرد",
  company: "شركة",
  institution: "مؤسسة",
};

export function HumanReviewQueuePanel() {
  const listFn = useServerFn(listReviewQueue);
  const claimFn = useServerFn(claimReviewItem);
  const updateFn = useServerFn(updateReviewItem);

  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notAccountant, setNotAccountant] = useState(false);
  const [filter, setFilter] = useState<ReviewStatus | "all">("queued");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async (status: ReviewStatus | "all") => {
    setBusy(true);
    try {
      const { rows } = await listFn({ data: status === "all" ? {} : { status } });
      setItems(rows);
      setNotAccountant(false);
    } catch (e) {
      if ((e as Error).message === "accountant_role_required") {
        setNotAccountant(true);
      } else {
        toast.error("تعذّر تحميل الطابور", { description: (e as Error).message });
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (v: ReviewStatus | "all") => {
    setFilter(v);
    void load(v);
  };

  const claim = async (id: string) => {
    try {
      await claimFn({ data: { id } });
      toast.success("تمت المطالبة بالطلب");
      void load(filter);
    } catch (e) {
      toast.error("تعذّرت المطالبة", { description: (e as Error).message });
    }
  };

  const setStatus = async (id: string, status: ReviewStatus) => {
    try {
      await updateFn({ data: { id, status, reviewerNotes: notes[id] } });
      toast.success("تم تحديث الحالة");
      void load(filter);
    } catch (e) {
      toast.error("تعذّر التحديث", { description: (e as Error).message });
    }
  };

  if (notAccountant) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs">
          طابور المراجعة البشرية متاح فقط لمن يحمل دور "محاسب" — لا تملك هذا الدور حالياً.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          طلبات "التقرير الشامل" التي أرسلها المستخدمون وتنتظر مراجعة بشرية قبل الاعتماد النهائي.
          الطلب يظهر للجميع حتى يُطالِب به أحد المحاسبين، ثم يُقفَل عليه وحده.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" /> طابور المراجعة ({items.length})
        </h3>
        <Select value={filter} onValueChange={(v) => changeFilter(v as ReviewStatus | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {(Object.keys(STATUS_LABEL) as ReviewStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {busy && (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      )}

      {!busy && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات بهذه الحالة.</p>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <Card key={it.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  {(it.payload as { name?: string })?.name || "بلا اسم"}
                  <Badge variant="outline" className="text-[10px]">
                    {KIND_LABEL[it.report_kind] ?? it.report_kind}
                  </Badge>
                </span>
                <Badge variant="outline" className={STATUS_COLOR[it.status]}>
                  {STATUS_LABEL[it.status]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {new Date(it.created_at).toLocaleString("ar-EG")}
                </span>
                {it.claimed_by && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" /> مُطالَب به
                  </span>
                )}
              </div>
              {it.status === "queued" && (
                <Button size="sm" onClick={() => void claim(it.id)}>
                  المطالبة بهذا الطلب
                </Button>
              )}
              {(it.status === "claimed" || it.status === "in_review" || it.status === "needs_info") && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="ملاحظات المراجعة..."
                    value={notes[it.id] ?? it.reviewer_notes ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                    className="text-xs min-h-[60px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void setStatus(it.id, "in_review")}>
                      قيد المراجعة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void setStatus(it.id, "needs_info")}>
                      بحاجة معلومات
                    </Button>
                    <Button size="sm" onClick={() => void setStatus(it.id, "completed")}>
                      اعتماد نهائي
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
