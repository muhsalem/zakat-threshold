/**
 * Server functions — قوالب وسجل التقارير.
 * كل الاستدعاءات محمية بجلسة المستخدم عبر requireSupabaseAuth، وتحترم RLS.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_CONFIG, type TemplateConfig, type TemplateKind } from "./types";

// ============ Templates ============

export const listPdfTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pdf_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDefaultTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: TemplateKind }) => data)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("pdf_templates")
      .select("*")
      .eq("user_id", context.userId)
      .eq("kind", data.kind)
      .eq("is_default", true)
      .maybeSingle();
    return rows;
  });

export const savePdfTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      kind: TemplateKind;
      is_default: boolean;
      config: TemplateConfig;
      organization_id?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    // إن كان الافتراضي → أزل الافتراضي عن غيره لنفس النوع
    if (data.is_default) {
      await context.supabase
        .from("pdf_templates")
        .update({ is_default: false })
        .eq("user_id", context.userId)
        .eq("kind", data.kind);
    }
    const row = {
      user_id: context.userId,
      organization_id: data.organization_id ?? null,
      name: data.name,
      kind: data.kind,
      is_default: data.is_default,
      config: data.config as never,
    };
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("pdf_templates")
        .update(row as never)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await context.supabase
      .from("pdf_templates")
      .insert(row as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deletePdfTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pdf_templates")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Reports ============

export const listPdfReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      status?: string;
      kind?: TemplateKind;
      from?: string;
      to?: string;
      search?: string;
      limit?: number;
    }) => data ?? {},
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("pdf_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.status) q = q.eq("status", data.status);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) q = q.or(`title.ilike.%${data.search}%,report_uid.ilike.%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPdfReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      zakat_record_id?: string | null;
      template_id?: string | null;
      kind: TemplateKind;
      title: string;
      snapshot: Record<string, unknown>;
      content_hash: string;
      storage_path?: string | null;
      organization_id?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    // نسخة تلقائية إذا كان لنفس الإقرار سجل سابق
    let version = 1;
    if (data.zakat_record_id) {
      const { data: prev } = await context.supabase
        .from("pdf_reports")
        .select("version")
        .eq("zakat_record_id", data.zakat_record_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prev?.version) version = (prev.version as number) + 1;
    }
    const { data: inserted, error } = await context.supabase
      .from("pdf_reports")
      .insert({
        user_id: context.userId,
        created_by: context.userId,
        zakat_record_id: data.zakat_record_id ?? null,
        template_id: data.template_id ?? null,
        organization_id: data.organization_id ?? null,
        kind: data.kind,
        title: data.title,
        snapshot: data.snapshot,
        content_hash: data.content_hash,
        storage_path: data.storage_path ?? null,
        version,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      status: "generated" | "downloaded" | "sent" | "approved" | "canceled";
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "downloaded") {
      patch.last_downloaded_at = new Date().toISOString();
      patch.last_downloaded_by = context.userId;
    }
    const { error } = await context.supabase
      .from("pdf_reports")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePdfReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pdf_reports")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReportAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { report_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("pdf_report_audit")
      .select("*")
      .eq("report_id", data.report_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ Public verify (unauthenticated) ============

export const verifyPdfReport = createServerFn({ method: "GET" })
  .inputValidator((data: { report_uid: string }) => data)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    // read via service role since RLS restricts pdf_reports to owner
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("pdf_reports")
      .select("report_uid, kind, title, content_hash, status, version, created_at, issuer_display:created_by")
      .eq("report_uid", data.report_uid)
      .maybeSingle();
    void client;
    if (!row) return { found: false as const };
    return {
      found: true as const,
      report_uid: row.report_uid,
      title: row.title,
      kind: row.kind,
      status: row.status,
      version: row.version,
      content_hash: row.content_hash,
      created_at: row.created_at,
    };
  });

// ============ Fallback default helper ============
export function makeDefaultConfig(overrides?: Partial<TemplateConfig>): TemplateConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(overrides ?? {}),
    brand: { ...DEFAULT_CONFIG.brand, ...(overrides?.brand ?? {}) },
    header: { ...DEFAULT_CONFIG.header, ...(overrides?.header ?? {}) },
    footer: { ...DEFAULT_CONFIG.footer, ...(overrides?.footer ?? {}) },
    stamp: { ...DEFAULT_CONFIG.stamp, ...(overrides?.stamp ?? {}) },
    sections: { ...DEFAULT_CONFIG.sections, ...(overrides?.sections ?? {}) },
  };
}
