/**
 * طابور المراجعة البشرية — صندوق وارد مشترك بين كل من يحمل دور accountant
 * لطلبات "المراجعة البشرية قبل الاعتماد النهائي" المُعلَنة في الموقع بأنها
 * "قريباً". هذه الدوال جاهزة الآن، والميزة تُفعَّل تسويقياً بمجرد توقيع
 * أول محاسب حقيقي — لا حاجة لبناء أي بنية تحتية وقتها.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReviewStatus =
  | "queued"
  | "claimed"
  | "in_review"
  | "needs_info"
  | "completed"
  | "cancelled";

export interface ReviewQueueItem {
  id: string;
  requester_user_id: string;
  source_client_id: string | null;
  report_kind: "individual" | "company" | "institution";
  status: ReviewStatus;
  payload: Record<string, any>;
  claimed_by: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

// جدول human_review_queue غير مُدرج بعد في types.ts المولَّد تلقائياً
// (هجرته حديثة) — from<any> مؤقت يُزال عند إعادة توليد الأنواع بعد مزامنة
// Supabase القادمة (نفس نمط shariaStockScreeningStore.functions.ts).

async function isAccountant(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "accountant")
    .maybeSingle();
  return !!data;
}

/** يقدّم المستخدم طلب مراجعة بشرية لتقرير محتسَب آلياً بالفعل. */
export const submitReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      reportKind: "individual" | "company" | "institution";
      sourceClientId?: string | null;
      payload: Record<string, any>;
    }) => {
      if (!["individual", "company", "institution"].includes(d.reportKind)) {
        throw new Error("reportKind_invalid");
      }
      if (!d.payload || typeof d.payload !== "object") throw new Error("payload_required");
      return d;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      requester_user_id: context.userId,
      source_client_id: data.sourceClientId ?? null,
      report_kind: data.reportKind,
      payload: JSON.parse(JSON.stringify(data.payload)),
      status: "queued",
    };
    const { data: saved, error } = await (
      context.supabase.from("human_review_queue" as never) as any
    )
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error((error as { message: string }).message);
    return { id: (saved as { id: string }).id };
  });

/** حالة طلبات المستخدم نفسه — لصفحة "تتبّع طلبي". */
export const listMyReviewRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReviewQueueItem[]> => {
    const { data, error } = await (
      context.supabase.from("human_review_queue" as never) as any
    )
      .select("*")
      .eq("requester_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error((error as { message: string }).message);
    return (data ?? []) as ReviewQueueItem[];
  });

/** الطابور الكامل — للمحاسبين فقط (تتحقق الدالة من الدور صراحةً، وRLS يفرضه أيضاً كطبقة ثانية). */
export const listReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: ReviewStatus; offset?: number } | undefined) => d ?? {})
  .handler(
    async ({ data, context }): Promise<{ rows: ReviewQueueItem[]; hasMore: boolean }> => {
      if (!(await isAccountant(context.supabase, context.userId))) {
        throw new Error("accountant_role_required");
      }
      const PAGE = 25;
      const offset = data.offset ?? 0;
      let q = (context.supabase.from("human_review_queue" as never) as any)
        .select("*")
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (data.status) q = q.eq("status", data.status);
      const { data: rows, error } = await q;
      if (error) throw new Error((error as { message: string }).message);
      const list = (rows ?? []) as ReviewQueueItem[];
      return { rows: list, hasMore: list.length === PAGE };
    },
  );

/** مطالبة (claim) بطلب — شرط أن يكون لا يزال queued كي لا يتصادم محاسبان. */
export const claimReviewItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAccountant(context.supabase, context.userId))) {
      throw new Error("accountant_role_required");
    }
    const { data: updated, error } = await (
      context.supabase.from("human_review_queue" as never) as any
    )
      .update({
        status: "claimed",
        claimed_by: context.userId,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (error) throw new Error((error as { message: string }).message);
    if (!updated) throw new Error("تعذّرت المطالبة — ربما طالب به محاسب آخر للتو");
    return { ok: true };
  });

/** تحديث حالة/ملاحظات طلب — للمحاسب الذي طالب به. */
export const updateReviewItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; status: ReviewStatus; reviewerNotes?: string }) => d,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAccountant(context.supabase, context.userId))) {
      throw new Error("accountant_role_required");
    }
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.reviewerNotes !== undefined) patch.reviewer_notes = data.reviewerNotes;
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await (context.supabase.from("human_review_queue" as never) as any)
      .update(patch)
      .eq("id", data.id)
      .eq("claimed_by", context.userId);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });

/** إلغاء طلب — للطالب نفسه، وطالما لم يُطالَب به بعد. */
export const cancelReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await (context.supabase.from("human_review_queue" as never) as any)
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("requester_user_id", context.userId)
      .eq("status", "queued");
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });
