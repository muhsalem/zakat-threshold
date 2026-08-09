/**
 * استعلامات لوحة تحليلات المنتج — للمحاسبين/الإداريين فقط (RLS على
 * product_events تقصر القراءة عليهم). يحسب القمع الوظيفي والمقياس
 * النجم الشمالي: عدد التقارير المعتمدة المطلوبة خلال آخر 30 يوماً.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProductEventName } from "./analytics";

const funnelInputSchema = z.object({
  windowDays: z.number().int().min(1).max(365).default(30),
});

export interface FunnelStats {
  windowDays: number;
  counts: Record<ProductEventName, number>;
  /** المقياس النجم الشمالي: طلبات التقارير المعتمدة خلال النافذة */
  northStar: number;
}

const EVENT_NAMES: ProductEventName[] = [
  "landing_view",
  "calculator_started",
  "calculation_completed",
  "report_exported",
  "certified_report_requested",
  "intake_form_submitted",
];

export const getFunnelStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => funnelInputSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<FunnelStats> => {
    const since = new Date(Date.now() - data.windowDays * 86_400_000).toISOString();
    // جدول product_events غير مُدرج بعد في الأنواع المولَّدة تلقائياً
    // (types.ts) لأن هجرته حديثة — from<any> مؤقت يُزال عند إعادة توليد
    // الأنواع بعد مزامنة Supabase القادمة (نفس ملاحظة src/lib/analytics.ts).
    const { data: rows, error } = await (context.supabase.from("product_events" as never) as any)
      .select("event_name")
      .gte("created_at", since);
    if (error) throw new Error((error as { message: string }).message);

    const counts = Object.fromEntries(EVENT_NAMES.map((n) => [n, 0])) as Record<
      ProductEventName,
      number
    >;
    for (const r of (rows ?? []) as Array<{ event_name: string }>) {
      if (r.event_name in counts) counts[r.event_name as ProductEventName]++;
    }

    return {
      windowDays: data.windowDays,
      counts,
      northStar: counts.certified_report_requested,
    };
  });
