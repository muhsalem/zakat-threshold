/**
 * سير عمل المراجعة الشرعية: طلب مراجعة → تعليقات → اعتماد/رفض، مع سجل تدقيق
 * تلقائي (تُكتب أحداثه عبر مشغّلات قاعدة البيانات).
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AuthCtx = { supabase: SupabaseClient<Database>; userId: string };

export type ShariaReviewStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ShariaReviewRequest =
  Database["public"]["Tables"]["sharia_review_requests"]["Row"];
export type ShariaReviewComment =
  Database["public"]["Tables"]["sharia_review_comments"]["Row"];
export type ShariaReviewEvent =
  Database["public"]["Tables"]["sharia_review_events"]["Row"];

const REVIEWER_STATUSES: ShariaReviewStatus[] = [
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
];

async function isReviewer(ctx: AuthCtx): Promise<boolean> {
  const [{ data: mod }, { data: admin }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "moderator" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
  ]);
  return Boolean(mod || admin);
}

/** هل المستخدم الحالي مراجع شرعي (مشرف/مدير)؟ */
export const getReviewerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isReviewer: boolean }> => ({
    isReviewer: await isReviewer(context as AuthCtx),
  }));

/** إنشاء طلب مراجعة شرعية (مسودة أو مُقدَّم مباشرة). */
export const createReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      title: string;
      question?: string;
      madhab?: string;
      zakatRecordId?: string | null;
      subjectKind?: string;
      snapshot?: Record<string, unknown>;
      shariaRefs?: string[];
      submit?: boolean;
    }) => {
      if (!d?.title?.trim()) throw new Error("العنوان مطلوب");
      return d;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const ctx = context as AuthCtx;
    const submit = data.submit !== false;
    const { data: row, error } = await ctx.supabase
      .from("sharia_review_requests")
      .insert({
        requester_id: ctx.userId,
        title: data.title.trim(),
        question: data.question?.trim() || null,
        madhab: data.madhab || null,
        zakat_record_id: data.zakatRecordId ?? null,
        subject_kind: data.subjectKind ?? "zakat_record",
        snapshot: (data.snapshot ?? {}) as never,
        sharia_refs: data.shariaRefs ?? [],
        status: submit ? "submitted" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** قائمة الطلبات: طلباتي، أو الطابور الكامل للمراجعين. */
export const listReviewRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { scope?: "mine" | "queue"; status?: ShariaReviewStatus } | undefined) => d ?? {},
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ rows: ShariaReviewRequest[]; isReviewer: boolean }> => {
      const ctx = context as AuthCtx;
      const reviewer = await isReviewer(ctx);
      const scope = data.scope ?? "mine";
      if (scope === "queue" && !reviewer) throw new Error("reviewer_role_required");

      let q = ctx.supabase
        .from("sharia_review_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (scope === "mine") q = q.eq("requester_id", ctx.userId);
      if (data.status) q = q.eq("status", data.status);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: rows ?? [], isReviewer: reviewer };
    },
  );

/** تفاصيل طلب + تعليقاته + سجل تدقيقه (RLS يحكم ما يُرى). */
export const getReviewRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id مطلوب");
    return d;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      request: ShariaReviewRequest;
      comments: ShariaReviewComment[];
      events: ShariaReviewEvent[];
      isReviewer: boolean;
    }> => {
      const ctx = context as AuthCtx;
      const [reviewer, req, comments, events] = await Promise.all([
        isReviewer(ctx),
        ctx.supabase.from("sharia_review_requests").select("*").eq("id", data.id).maybeSingle(),
        ctx.supabase
          .from("sharia_review_comments")
          .select("*")
          .eq("request_id", data.id)
          .order("created_at", { ascending: true }),
        ctx.supabase
          .from("sharia_review_events")
          .select("*")
          .eq("request_id", data.id)
          .order("created_at", { ascending: false }),
      ]);
      if (req.error) throw new Error(req.error.message);
      if (!req.data) throw new Error("الطلب غير موجود أو لا تملك صلاحية عرضه");
      return {
        request: req.data,
        comments: comments.data ?? [],
        events: events.data ?? [],
        isReviewer: reviewer,
      };
    },
  );

/** إضافة تعليق (الداخلي للمراجعين فقط). */
export const addReviewComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; body: string; isInternal?: boolean }) => {
    if (!d?.requestId) throw new Error("requestId مطلوب");
    if (!d?.body?.trim()) throw new Error("نص التعليق مطلوب");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const ctx = context as AuthCtx;
    const internal = Boolean(data.isInternal);
    if (internal && !(await isReviewer(ctx))) throw new Error("reviewer_role_required");
    const { error } = await ctx.supabase.from("sharia_review_comments").insert({
      request_id: data.requestId,
      author_id: ctx.userId,
      body: data.body.trim(),
      is_internal: internal,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** تقديم مسودة للمراجعة، أو سحب الطلب — لصاحب الطلب. */
export const setRequesterStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; action: "submit" | "withdraw" }) => {
    if (!d?.id || !["submit", "withdraw"].includes(d?.action)) throw new Error("مدخل غير صالح");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const ctx = context as AuthCtx;
    const patch =
      data.action === "submit"
        ? { status: "submitted" as const, submitted_at: new Date().toISOString() }
        : { status: "withdrawn" as const };
    const { data: updated, error } = await ctx.supabase
      .from("sharia_review_requests")
      .update(patch)
      .eq("id", data.id)
      .eq("requester_id", ctx.userId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("تعذّر التحديث — الطلب قد يكون قيد القرار النهائي");
    return { ok: true };
  });

/** قرار المراجع الشرعي: بدء المراجعة / طلب تعديل / اعتماد / رفض. */
export const decideReviewRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: ShariaReviewStatus; note?: string }) => {
    if (!d?.id) throw new Error("id مطلوب");
    if (!REVIEWER_STATUSES.includes(d?.status)) throw new Error("حالة غير مسموحة");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const ctx = context as AuthCtx;
    if (!(await isReviewer(ctx))) throw new Error("reviewer_role_required");
    const final = data.status === "approved" || data.status === "rejected";
    const { error } = await ctx.supabase
      .from("sharia_review_requests")
      .update({
        status: data.status,
        reviewer_id: ctx.userId,
        decision_note: data.note?.trim() || null,
        decided_at: final ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
