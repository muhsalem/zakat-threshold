/**
 * مركز المراجعات — طبقة عرض موحَّدة فوق نظامَي مراجعة منفصلَين عمداً:
 *  - human_review_queue (محاسب يعتمد تقريراً محتسَباً آلياً — humanReviewQueue.functions.ts)
 *  - sharia_review_requests (عالِم/مشرف يفتي في مسألة شرعية محدَّدة — shariaReview.functions.ts)
 *
 * لماذا لم تُدمَج الجداول: الأدوار مختلفة (accountant مقابل moderator/admin)،
 * آلة الحالة مختلفة (طابور مطالبة بسيط مقابل مسودة/تقديم/تعليقات/قرار)،
 * وحتى الجدول المرجعي مختلف (source_client_id يشير لـclients القديم،
 * zakat_record_id يشير لـzakat_records الأحدث). دمج قسري كان سيُفقد بنية
 * كل نظام أو يُدخل حقولاً NULL غير منطقية. هذه الطبقة تحل المشكلة الفعلية
 * (لا رؤية موحَّدة للمستخدم) دون المخاطرة بدمج مخطط بيانات غير متوافق.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReviewKind = "accountant" | "sharia";
export type ReviewMetaStatus = "needs_action" | "pending" | "in_progress" | "done" | "cancelled";

export interface UnifiedReviewItem {
  id: string;
  kind: ReviewKind;
  title: string;
  status: string;
  statusLabel: string;
  metaStatus: ReviewMetaStatus;
  createdAt: string;
  link: string;
}

const ACCOUNTANT_STATUS_LABEL: Record<string, string> = {
  queued: "بانتظار المطالبة",
  claimed: "مُطالَب به",
  in_review: "قيد المراجعة",
  needs_info: "بحاجة معلومات إضافية",
  completed: "مكتمل",
  cancelled: "ملغى",
};
const ACCOUNTANT_META: Record<string, ReviewMetaStatus> = {
  queued: "pending",
  claimed: "in_progress",
  in_review: "in_progress",
  needs_info: "needs_action",
  completed: "done",
  cancelled: "cancelled",
};

const SHARIA_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم للمراجعة",
  in_review: "قيد المراجعة",
  changes_requested: "مطلوب تعديل",
  approved: "معتمد شرعاً",
  rejected: "مرفوض",
  withdrawn: "مسحوب",
};
const SHARIA_META: Record<string, ReviewMetaStatus> = {
  draft: "needs_action",
  submitted: "pending",
  in_review: "in_progress",
  changes_requested: "needs_action",
  approved: "done",
  rejected: "done",
  withdrawn: "cancelled",
};

/** كل مراجعات المستخدم الحالي من النظامين معاً، مُطبَّعة ومرتَّبة زمنياً. */
export const listMyAllReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UnifiedReviewItem[]> => {
    const [accountantRes, shariaRes] = await Promise.all([
      (context.supabase.from("human_review_queue" as never) as any)
        .select("id, status, report_kind, payload, created_at")
        .eq("requester_user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("sharia_review_requests")
        .select("id, status, title, created_at")
        .eq("requester_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const accountantItems: UnifiedReviewItem[] = (accountantRes.data ?? []).map(
      (r: { id: string; status: string; report_kind: string; payload: { name?: string } | null; created_at: string }) => ({
        id: r.id,
        kind: "accountant" as const,
        title: r.payload?.name || `طلب تقرير ${r.report_kind === "company" ? "شركة" : r.report_kind === "institution" ? "مؤسسة" : "فرد"}`,
        status: r.status,
        statusLabel: ACCOUNTANT_STATUS_LABEL[r.status] ?? r.status,
        metaStatus: ACCOUNTANT_META[r.status] ?? "pending",
        createdAt: r.created_at,
        link: "/accountant",
      }),
    );

    const shariaItems: UnifiedReviewItem[] = (shariaRes.data ?? []).map(
      (r: { id: string; status: string; title: string; created_at: string }) => ({
        id: r.id,
        kind: "sharia" as const,
        title: r.title,
        status: r.status,
        statusLabel: SHARIA_STATUS_LABEL[r.status] ?? r.status,
        metaStatus: SHARIA_META[r.status] ?? "pending",
        createdAt: r.created_at,
        link: "/sharia-review",
      }),
    );

    return [...accountantItems, ...shariaItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });
