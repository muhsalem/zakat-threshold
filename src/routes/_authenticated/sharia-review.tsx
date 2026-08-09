import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollText, MessageSquare, CheckCircle2, XCircle, Loader2, Plus } from "lucide-react";
import {
  listReviewRequests,
  getReviewRequest,
  createReviewRequest,
  addReviewComment,
  setRequesterStatus,
  decideReviewRequest,
  type ShariaReviewStatus,
} from "@/lib/shariaReview.functions";

const STATUS_LABEL: Record<ShariaReviewStatus, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم للمراجعة",
  in_review: "قيد المراجعة",
  changes_requested: "مطلوب تعديل",
  approved: "معتمد شرعاً",
  rejected: "مرفوض",
  withdrawn: "مسحوب",
};
const STATUS_CLASS: Record<ShariaReviewStatus, string> = {
  draft: "text-muted-foreground border-muted",
  submitted: "text-warning border-warning/40",
  in_review: "text-primary border-primary/40",
  changes_requested: "text-destructive border-destructive/40",
  approved: "text-success border-success/40",
  rejected: "text-destructive border-destructive/40",
  withdrawn: "text-muted-foreground border-muted",
};
const EVENT_LABEL: Record<string, string> = {
  created: "إنشاء الطلب",
  status_changed: "تغيير الحالة",
  comment_added: "إضافة تعليق",
};

export const Route = createFileRoute("/_authenticated/sharia-review")({
  component: ShariaReviewPage,
  head: () => ({
    meta: [
      { title: "سير عمل المراجعة الشرعية | زكاة" },
      {
        name: "description",
        content:
          "قدّم طلب مراجعة شرعية لتقارير الزكاة، تابع التعليقات والاعتماد النهائي مع سجل تدقيق كامل.",
      },
      { property: "og:title", content: "سير عمل المراجعة الشرعية" },
      {
        property: "og:description",
        content: "طلب مراجعة، تعليقات المراجع الشرعي، اعتماد نهائي، وسجل تدقيق غير قابل للتعديل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ShariaReviewPage() {
  const listFn = useServerFn(listReviewRequests);
  const [selected, setSelected] = useState<string | null>(null);
  const [scope, setScope] = useState<"mine" | "queue">("mine");

  const mine = useQuery({
    queryKey: ["sharia-review", "mine"],
    queryFn: () => listFn({ data: { scope: "mine" } }),
  });
  const isReviewer = mine.data?.isReviewer ?? false;
  const queue = useQuery({
    queryKey: ["sharia-review", "queue"],
    queryFn: () => listFn({ data: { scope: "queue" } }),
    enabled: isReviewer,
  });

  const rows = (scope === "queue" ? queue.data?.rows : mine.data?.rows) ?? [];

  return (
    <div dir="rtl" className="container mx-auto max-w-6xl py-8 space-y-6">
      <header className="flex items-center gap-3">
        <ScrollText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">سير عمل المراجعة الشرعية</h1>
          <p className="text-sm text-muted-foreground">
            طلب مراجعة → تعليقات المراجع الشرعي → اعتماد أو رفض، مع سجل تدقيق تلقائي لكل خطوة.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="space-y-4">
          <NewRequestCard />
          <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "queue")}>
            <TabsList className="w-full">
              <TabsTrigger value="mine" className="flex-1">
                طلباتي
              </TabsTrigger>
              {isReviewer && (
                <TabsTrigger value="queue" className="flex-1">
                  طابور المراجعة
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value={scope} className="mt-3 space-y-2">
              {(mine.isLoading || (scope === "queue" && queue.isLoading)) && (
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto my-6" />
              )}
              {rows.length === 0 && !mine.isLoading && (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات.</p>
              )}
              {rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`w-full text-right rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                    selected === r.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{r.title}</span>
                    <Badge
                      variant="outline"
                      className={STATUS_CLASS[r.status as ShariaReviewStatus]}
                    >
                      {STATUS_LABEL[r.status as ShariaReviewStatus]}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleString("ar-EG")}
                  </p>
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {selected ? (
          <RequestDetail id={selected} />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              اختر طلباً من القائمة لعرض التعليقات والقرار وسجل التدقيق.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewRequestCard() {
  const createFn = useServerFn(createReviewRequest);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [madhab, setMadhab] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createFn({ data: { title, question, madhab: madhab || undefined, submit: true } }),
    onSuccess: () => {
      toast.success("تم إرسال طلب المراجعة الشرعية");
      setTitle("");
      setQuestion("");
      setMadhab("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["sharia-review"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <Button className="w-full gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> طلب مراجعة شرعية جديد
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">طلب مراجعة شرعية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="srr-title">عنوان الطلب</Label>
          <Input
            id="srr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: مراجعة وعاء زكاة شركة 1447هـ"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="srr-q">السؤال / محل الإشكال</Label>
          <Textarea
            id="srr-q"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="اذكر البنود محل الاستشكال والمرجع المستخدم..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="srr-m">المذهب المعتمد (اختياري)</Label>
          <Input
            id="srr-m"
            value={madhab}
            onChange={(e) => setMadhab(e.target.value)}
            placeholder="حنفي / مالكي / شافعي / حنبلي"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button size="sm" disabled={mut.isPending || !title.trim()} onClick={() => mut.mutate()}>
            إرسال للمراجعة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestDetail({ id }: { id: string }) {
  const getFn = useServerFn(getReviewRequest);
  const commentFn = useServerFn(addReviewComment);
  const decideFn = useServerFn(decideReviewRequest);
  const requesterFn = useServerFn(setRequesterStatus);
  const qc = useQueryClient();

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sharia-review", "detail", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["sharia-review"] });

  const comment = useMutation({
    mutationFn: () => commentFn({ data: { requestId: id, body, isInternal: internal } }),
    onSuccess: () => {
      setBody("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: (status: ShariaReviewStatus) => decideFn({ data: { id, status, note } }),
    onSuccess: () => {
      toast.success("تم تحديث حالة المراجعة");
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const requesterAct = useMutation({
    mutationFn: (action: "submit" | "withdraw") => requesterFn({ data: { id, action } }),
    onSuccess: () => {
      toast.success("تم تحديث الطلب");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  const r = data.request;
  const status = r.status as ShariaReviewStatus;
  const isFinal = status === "approved" || status === "rejected";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span>{r.title}</span>
            <Badge variant="outline" className={STATUS_CLASS[status]}>
              {STATUS_LABEL[status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {r.question && <p className="whitespace-pre-wrap">{r.question}</p>}
          <p className="text-xs text-muted-foreground">
            {r.madhab ? `المذهب: ${r.madhab} · ` : ""}
            تاريخ الإنشاء: {new Date(r.created_at).toLocaleString("ar-EG")}
            {r.decided_at ? ` · تاريخ القرار: ${new Date(r.decided_at).toLocaleString("ar-EG")}` : ""}
          </p>
          {r.decision_note && (
            <p className="text-xs rounded-md border p-2 bg-muted/40">
              ملاحظة المراجع: {r.decision_note}
            </p>
          )}
          {!data.isReviewer && !isFinal && (
            <div className="flex gap-2 pt-1">
              {status === "draft" && (
                <Button size="sm" onClick={() => requesterAct.mutate("submit")}>
                  تقديم للمراجعة
                </Button>
              )}
              {(status === "draft" || status === "submitted") && (
                <Button size="sm" variant="outline" onClick={() => requesterAct.mutate("withdraw")}>
                  سحب الطلب
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {data.isReviewer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">قرار المراجع الشرعي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={2}
              placeholder="سبب القرار / التوجيه الشرعي — يُحفظ في سجل التدقيق."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => decide.mutate("in_review")}>
                بدء المراجعة
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide.mutate("changes_requested")}>
                طلب تعديل
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                onClick={() => decide.mutate("rejected")}
              >
                <XCircle className="h-4 w-4" /> رفض
              </Button>
              <Button size="sm" className="gap-1" onClick={() => decide.mutate("approved")}>
                <CheckCircle2 className="h-4 w-4" /> اعتماد شرعي
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> التعليقات ({data.comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد تعليقات بعد.</p>
          )}
          {data.comments.map((c) => (
            <div key={c.id} className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{new Date(c.created_at).toLocaleString("ar-EG")}</span>
                {c.is_internal && (
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
                    داخلي
                  </Badge>
                )}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          <div className="space-y-2 pt-1">
            <Textarea
              rows={2}
              placeholder="أضف تعليقاً..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              {data.isReviewer ? (
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={internal} onCheckedChange={setInternal} />
                  تعليق داخلي (للمراجعين فقط)
                </label>
              ) : (
                <span />
              )}
              <Button
                size="sm"
                disabled={!body.trim() || comment.isPending}
                onClick={() => comment.mutate()}
              >
                إرسال التعليق
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" /> سجل التدقيق ({data.events.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {data.events.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
              <div>
                <p className="font-medium">{EVENT_LABEL[e.event_type] ?? e.event_type}</p>
                <p className="text-muted-foreground">
                  {e.from_status
                    ? `${STATUS_LABEL[e.from_status as ShariaReviewStatus]} ← ${
                        STATUS_LABEL[e.to_status as ShariaReviewStatus]
                      }`
                    : e.to_status
                      ? STATUS_LABEL[e.to_status as ShariaReviewStatus]
                      : ""}
                </p>
              </div>
              <span className="text-muted-foreground whitespace-nowrap">
                {new Date(e.created_at).toLocaleString("ar-EG")}
              </span>
            </div>
          ))}
          {data.events.length === 0 && <p className="text-muted-foreground">لا توجد أحداث.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
