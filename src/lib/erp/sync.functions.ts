/**
 * ERP → Zakat sync server functions
 * ---------------------------------
 * المسار الوارد الكامل: سحب ميزان المراجعة من الـ ERP ← تصنيف زكوي حسب المزوّد
 * ← تجاوزات المستخدم المحفوظة ← حساب الوعاء والزكاة ← حفظ سجل زكاة قابل
 * للترحيل كقيد إلى نفس الـ ERP عبر pushZakatRecordToErp.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ErpCreds, Provider } from "./providers.server";
import { fetchTrialBalance } from "./trialBalance.server";
import {
  classifyTrialBalance,
  computeZakatFromTrialBalance,
  ZAKAT_CATEGORIES,
  type MappingOverrides,
  type MappingProvider,
  type ZakatCategory,
} from "./zakatMapping";

const toMappingProvider = (p: string): MappingProvider =>
  p.startsWith("odoo") ? "odoo" : p.startsWith("sap") ? "sap" : "generic";

const isValidCategory = (c: unknown): c is ZakatCategory =>
  typeof c === "string" && c in ZAKAT_CATEGORIES;

async function loadConnection(
  supabase: { from: (t: string) => any },
  id: string,
): Promise<{ conn: any; creds: ErpCreds; overrides: MappingOverrides }> {
  const { data: conn, error } = await supabase
    .from("erp_connections")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !conn) throw new Error(error?.message ?? "connection_not_found");
  const creds: ErpCreds = {
    provider: conn.provider as Provider,
    base_url: conn.base_url,
    db_name: conn.db_name,
    username: conn.username,
    api_key: conn.api_key,
  };
  const rawOverrides = (conn.extra as { zakat_mapping?: Record<string, unknown> } | null)
    ?.zakat_mapping;
  const overrides: MappingOverrides = {};
  for (const [code, cat] of Object.entries(rawOverrides ?? {})) {
    if (isValidCategory(cat)) overrides[code] = cat;
  }
  return { conn, creds, overrides };
}

/** سحب ميزان المراجعة وتصنيفه زكوياً (بدون حفظ) */
export const pullErpTrialBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connection_id: string; date_to?: string }) => {
    if (!d?.connection_id) throw new Error("connection_id_required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { conn, creds, overrides } = await loadConnection(context.supabase, data.connection_id);
    const dateTo = data.date_to ?? new Date().toISOString().slice(0, 10);

    const tb = await fetchTrialBalance(creds, dateTo);
    if (!tb.ok) return { ok: false as const, error: tb.error ?? "fetch_failed" };

    const classified = classifyTrialBalance(tb.rows, toMappingProvider(conn.provider), overrides);
    return {
      ok: true as const,
      provider: conn.provider as string,
      source: tb.source,
      as_of: tb.as_of,
      rows: classified,
      overrides,
    };
  });

/** حفظ تجاوزات التصنيف اليدوية لهذا الاتصال (تُدمج في erp_connections.extra) */
export const saveErpZakatMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connection_id: string; overrides: Record<string, string> }) => {
    if (!d?.connection_id) throw new Error("connection_id_required");
    const clean: MappingOverrides = {};
    for (const [code, cat] of Object.entries(d.overrides ?? {})) {
      if (!isValidCategory(cat)) throw new Error(`invalid_category:${cat}`);
      clean[String(code).slice(0, 40)] = cat;
    }
    return { connection_id: d.connection_id, overrides: clean };
  })
  .handler(async ({ data, context }) => {
    const { conn } = await loadConnection(context.supabase, data.connection_id);
    const extra = { ...((conn.extra as object) ?? {}), zakat_mapping: data.overrides };
    const { error } = await context.supabase
      .from("erp_connections")
      .update({ extra })
      .eq("id", data.connection_id);
    if (error) throw new Error(error.message);
    return { ok: true as const, saved: Object.keys(data.overrides).length };
  });

/**
 * الحساب الكامل: سحب ← تصنيف (+تجاوزات مرسلة أو محفوظة) ← وعاء وزكاة
 * ← إنشاء سجل في zakat_records جاهز للترحيل كقيد إلى الـ ERP.
 */
export const calculateZakatFromErp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      connection_id: string;
      date_to?: string;
      nisab?: number;
      calendar?: "hijri" | "gregorian";
      currency?: string;
      overrides?: Record<string, string>;
      save_record?: boolean;
    }) => {
      if (!d?.connection_id) throw new Error("connection_id_required");
      if (d.calendar && !["hijri", "gregorian"].includes(d.calendar))
        throw new Error("calendar_invalid");
      if (d.nisab != null && !(Number.isFinite(d.nisab) && d.nisab >= 0))
        throw new Error("nisab_invalid");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const {
      conn,
      creds,
      overrides: saved,
    } = await loadConnection(context.supabase, data.connection_id);
    const dateTo = data.date_to ?? new Date().toISOString().slice(0, 10);

    const tb = await fetchTrialBalance(creds, dateTo);
    if (!tb.ok) return { ok: false as const, error: tb.error ?? "fetch_failed" };

    // التجاوزات المرسلة من الواجهة تتقدم على المحفوظة
    const overrides: MappingOverrides = { ...saved };
    for (const [code, cat] of Object.entries(data.overrides ?? {})) {
      if (isValidCategory(cat)) overrides[code] = cat;
    }

    const classified = classifyTrialBalance(tb.rows, toMappingProvider(conn.provider), overrides);
    const calc = computeZakatFromTrialBalance(classified, {
      nisab: data.nisab ?? 0,
      calendar: data.calendar ?? "hijri",
    });

    let record_id: string | null = null;
    if (data.save_record !== false) {
      const { data: rec, error } = await context.supabase
        .from("zakat_records")
        .insert({
          user_id: context.userId,
          record_type: "company",
          gregorian_date: dateTo,
          currency: (data.currency ?? "SAR").slice(0, 8),
          total_assets: calc.zakatableAssets,
          total_liabilities: calc.deductibleLiabilities,
          zakat_base: calc.zakatBase,
          zakat_due: calc.zakatDue,
          net_due: calc.zakatDue,
          notes: `محسوبة من ${conn.label} (${conn.provider}) — ميزان مراجعة حتى ${dateTo}${tb.source === "sandbox_demo" ? " [بيانات تجريبية]" : ""}`,
          snapshot: JSON.parse(
            JSON.stringify({
              source: "erp_trial_balance",
              provider: conn.provider,
              connection_id: conn.id,
              as_of: dateTo,
              data_source: tb.source,
              computation: calc,
              rows: classified.slice(0, 200),
            }),
          ),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      record_id = rec?.id ?? null;
    }

    return {
      ok: true as const,
      provider: conn.provider as string,
      source: tb.source,
      as_of: dateTo,
      computation: calc,
      rows: classified,
      record_id,
    };
  });
