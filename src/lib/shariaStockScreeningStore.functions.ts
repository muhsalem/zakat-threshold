/**
 * أرشيف تقارير الفرز الشرعي — دوال خادم لقراءة/حفظ/حذف، تحل محل
 * window.storage (خاص ببيئة Claude Artifacts) بجدول Supabase حقيقي.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ComputedStockAudit } from "./shariaStockScreening";

const idSchema = z.object({ id: z.string().uuid() });

export interface ContractAnswer {
  status: string;
  note: string;
}

export interface ScreeningPayload {
  meta: { id: string; time: string; fileName: string; hash: string; edited?: boolean };
  audit: ComputedStockAudit;
  answers: Record<number, ContractAnswer>;
}

export interface ScreeningListItem {
  id: string;
  created_at: string;
  company_name: string | null;
  file_name: string | null;
  methodology: string;
  score: number | null;
  verdict_tone: string | null;
}

// جدول sharia_stock_screenings غير مُدرج بعد في types.ts المولَّد تلقائياً
// (هجرته حديثة) — from<any> مؤقت يُزال عند إعادة توليد الأنواع بعد مزامنة
// Supabase القادمة (نفس نمط src/lib/analytics.ts).

const ARCHIVE_PAGE_SIZE = 50;

export const listShariaStockScreenings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { offset?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<{ rows: ScreeningListItem[]; hasMore: boolean }> => {
    const offset = data.offset ?? 0;
    const { data: rows, error } = await (
      context.supabase.from("sharia_stock_screenings" as never) as any
    )
      .select("id, created_at, company_name, file_name, methodology, score, verdict_tone")
      .order("created_at", { ascending: false })
      .range(offset, offset + ARCHIVE_PAGE_SIZE - 1);
    if (error) throw new Error((error as { message: string }).message);
    const list = (rows ?? []) as ScreeningListItem[];
    return { rows: list, hasMore: list.length === ARCHIVE_PAGE_SIZE };
  });

export const getShariaStockScreening = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<ScreeningPayload> => {
    const { data: row, error } = await (
      context.supabase.from("sharia_stock_screenings" as never) as any
    )
      .select("payload")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error((error as { message: string })?.message ?? "not_found");
    return row.payload as ScreeningPayload;
  });

export const saveShariaStockScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { methodology: string; payload: ScreeningPayload }) => {
    if (!["aaoifi", "djim", "sp"].includes(d.methodology)) throw new Error("methodology_invalid");
    if (!d.payload?.meta?.id) throw new Error("payload_invalid");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      user_id: context.userId,
      company_name: data.payload.audit.ex.company?.name ?? null,
      file_name: data.payload.meta.fileName ?? null,
      file_hash: data.payload.meta.hash ?? null,
      methodology: data.methodology,
      score: data.payload.audit.score ?? null,
      verdict_tone: data.payload.audit.verdictTone ?? null,
      payload: JSON.parse(JSON.stringify(data.payload)),
    };
    const { data: saved, error } = await (
      context.supabase.from("sharia_stock_screenings" as never) as any
    )
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error((error as { message: string }).message);
    return { id: (saved as { id: string }).id };
  });

export const updateShariaStockScreeningAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; payload: ScreeningPayload }) => {
    if (!z.string().uuid().safeParse(d.id).success) throw new Error("id_invalid");
    if (!d.payload?.meta?.id) throw new Error("payload_invalid");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await (context.supabase.from("sharia_stock_screenings" as never) as any)
      .update({ payload: JSON.parse(JSON.stringify(data.payload)) })
      .eq("id", data.id);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });

export const deleteShariaStockScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await (context.supabase.from("sharia_stock_screenings" as never) as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error((error as { message: string }).message);
    return { ok: true };
  });
