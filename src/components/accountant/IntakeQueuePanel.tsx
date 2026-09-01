import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, Info, Clock, Mail, MapPin, Calendar, User } from "lucide-react";
import {
  listIntakeQueue,
  assignIntakeItem,
  completeIntakeItem,
} from "@/lib/intakeQueue.functions";
import {
  intakeRowToClientInput,
  type IntakeQueueRow,
  type IntakeStatus,
} from "@/lib/intakeQueueMapping";
import { createClient as createAccountantClient, COUNTRY_LABELS } from "@/lib/accountantStore";

const STATUS_LABEL: Record<IntakeStatus, string> = {
  pending: "جديد — بانتظار محاسب",
  assigned: "مُسنَد إليّ",
  done: "استُورد كعميل",
};
const STATUS_COLOR: Record<IntakeStatus, string> = {
  pending: "text-warning border-warning/40",
  assigned: "text-primary border-primary/40",
  done: "text-success border-success/40",
};
const KIND_LABEL: Record<string, string> = {
  individual: "فرد",
  company: "شركة",
  institution: "مؤسسة",
};

/**
 * صندوق وارد طلبات الزوّار غير المسجَّلين (intake_queue).
 *
 * الهجرة 20260707000002 وعدت: "المحاسب يراه في لوحته ويستورده كعميل جديد".
 * الاستيراد يمرّ بثلاث خطوات كي لا يتصادم محاسبان على الطلب نفسه:
 *   1. assignIntakeItem  — يقفل الطلب على هذا المحاسب (pending → assigned)
 *   2. createClient      — يُنشئ العميل في accountant_clients بجلسة المحاسب
 *   3. completeIntakeItem — يختم الطلب (assigned → done)
 * فشل الخطوة 2 يترك الطلب "مُسنَداً" لا "مكتملاً"، فيعاد الاستيراد لاحقاً
 * بدل أن يضيع.
 */
export function IntakeQueuePanel() {
  const listFn = useServerFn(listIntakeQueue);
  const assignFn = useServerFn(assignIntakeItem);
  const completeFn = useServerFn(completeIntakeItem);

  const [items, setItems] = useState<IntakeQueueRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [notAccountant, setNotAccountant] = useState(false);
  const [filter, setFilter] = useState<IntakeStatus | "all">("pending");

  const load = async (status: IntakeStatus | "all") => {
    setBusy(true);
    try {
      const { rows } = await listFn({ data: status === "all" ? {} : { status } });
      setItems(rows);
      setNotAccountant(false);
    } catch (e) {
      if ((e as Error).message === "accountant_role_required") {
        setNotAccountant(true);
      } else {
        toast.error("تعذّر تحميل الطلبات", { description: (e as Error).message });
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (v: IntakeStatus | "all") => {
    setFilter(v);
    void load(v);
  };

  const assign = async (id: string) => {
    setWorking(id);
    try {
      await assignFn({ data: { id } });
      toast.success("أُسنِد الطلب إليك");
      await load(filter);
    } catch (e) {
      toast.error("تعذّر الإسناد", { description: (e as Error).message });
    } finally {
      setWorking(null);
    }
  };

  const importAsClient = async (row: IntakeQueueRow) => {
    setWorking(row.id);
    try {
      if (row.status === "pending") await assignFn({ data: { id: row.id } });
      const client = await createAccountantClient(intakeRowToClientInput(row));
      await completeFn({ data: { id: row.id, clientId: client.id } });
      toast.success("استُورد كعميل جديد", { description: client.name });
      await load(filter);
    } catch (e) {
      toast.error("تعذّر الاستيراد", { description: (e as Error).message });
      // قد يكون الإسناد نجح والإنشاء فشل — أعد التحميل ليظهر الطلب مُسنَداً
      await load(filter);
    } finally {
      setWorking(null);
    }
  };

  if (notAccountant) {
    return (
      <Alert className="border-warning/40 bg-warning/5">
        <Info className="h-4 w-4 text-warning" />
        <AlertDescription className="text-xs">
          طلبات الزوّار متاحة فقط لمن يحمل دور "محاسب" أو "مدير" — لا تملك هذا الدور حالياً.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          طلبات أُرسلت من نموذج الاستلام العام دون تسجيل دخول. الطلب يظهر لكل المحاسبين حتى
          يُسنَد لأحدهم، ثم يُستورد كعميل جديد في محفظته بكل ما أدخله الزائر.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> طلبات الزوّار ({items.length})
        </h3>
        <Select value={filter} onValueChange={(v) => changeFilter(v as IntakeStatus | "all")}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {(Object.keys(STATUS_LABEL) as IntakeStatus[]).map((s) => (
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
        {items.map((it) => {
          const isWorking = working === it.id;
          return (
            <Card key={it.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    {it.name || "بلا اسم"}
                    <Badge variant="outline" className="text-[10px]">
                      {KIND_LABEL[it.kind] ?? it.kind}
                    </Badge>
                  </span>
                  <Badge variant="outline" className={STATUS_COLOR[it.status]}>
                    {STATUS_LABEL[it.status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(it.created_at).toLocaleString("ar-EG")}
                  </span>
                  {it.email && (
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      <Mail className="h-3 w-3" /> {it.email}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {COUNTRY_LABELS[it.country] ?? it.country}
                  </span>
                  {it.hawl_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> حول: {it.hawl_date}
                    </span>
                  )}
                  {it.assigned_to && (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" /> مُسنَد
                    </span>
                  )}
                </div>
                {it.notes && (
                  <p className="text-muted-foreground whitespace-pre-wrap border-s-2 border-muted ps-2">
                    {it.notes}
                  </p>
                )}
                {it.status !== "done" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {it.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isWorking}
                        onClick={() => void assign(it.id)}
                      >
                        إسناد إليّ
                      </Button>
                    )}
                    <Button size="sm" disabled={isWorking} onClick={() => void importAsClient(it)}>
                      {isWorking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                      استيراد كعميل
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
