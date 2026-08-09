/**
 * Server functions — قوالب وسجل التقارير.
 * كل الاستدعاءات محمية بجلسة المستخدم عبر requireSupabaseAuth، وتحترم RLS.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_CONFIG, type TemplateConfig, type TemplateKind } from "./types";

const uuid = z.string().uuid();
const templateKind = z.enum(["declaration", "compliance", "certified"]);
const reportStatusEnum = z.enum(["generated", "downloaded", "sent", "approved", "canceled"]);
/** يُصدَّر لتفادي اشتقاق النوع من توقيع server function داخلياً بملفات الاستدعاء. */
export type ReportStatus = z.infer<typeof reportStatusEnum>;

const brandConfigSchema = z.object({
  logo_url: z.string().url().nullable(),
  org_name: z.string().max(200),
  primary_color: z.string().max(20),
  accent_color: z.string().max(20),
  font_family: z.enum(["Cairo", "Amiri", "Tajawal"]),
  heading_size: z.number().min(10).max(40),
});
const headerConfigSchema = z.object({
  show_logo: z.boolean(),
  show_org: z.boolean(),
  show_report_no: z.boolean(),
  custom_text: z.string().max(500),
});
const footerConfigSchema = z.object({
  show_page_numbers: z.boolean(),
  show_issuer: z.boolean(),
  custom_text: z.string().max(500),
});
const stampConfigSchema = z.object({
  enabled: z.boolean(),
  image_url: z.string().url().nullable(),
  position: z.enum(["tl", "tr", "bl", "br", "center"]),
  opacity: z.number().min(0.1).max(1),
  signer_name: z.string().max(200),
  signer_license: z.string().max(200),
});
const sectionsConfigSchema = z.object({
  owner_info: z.boolean(),
  inputs: z.boolean(),
  assets: z.boolean(),
  calc_steps: z.boolean(),
  deductions: z.boolean(),
  results: z.boolean(),
  notes: z.boolean(),
  sharia_refs: z.boolean(),
  sources: z.boolean(),
  exceptions: z.boolean(),
  audit_trail: z.boolean(),
  legal_notice: z.boolean(),
  verify_qr: z.boolean(),
});
const templateConfigSchema = z.object({
  layout: z.enum(["classic", "modern", "minimal"]),
  brand: brandConfigSchema,
  header: headerConfigSchema,
  footer: footerConfigSchema,
  stamp: stampConfigSchema,
  sections: sectionsConfigSchema,
  legal_notice_text: z.string().max(5000),
  notes_text: z.string().max(5000),
});

/** يهرب رموز PostgREST الخاصة (,()) قبل إدراج بحث حر داخل .or() — كانت
 * تُمرَّر خاماً، فيقدر المستخدم يُدرج شروط .or() إضافية على سجلاته هو
 * (RLS يمنع الوصول لسجلات غيره، لكن يبقى تلاعباً بمنطق الفلترة المقصود). */
function escapePostgrestPattern(s: string): string {
  return s.replace(/[,()]/g, "");
}

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
  .inputValidator((data: unknown) => z.object({ kind: templateKind }).parse(data))
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
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().min(1).max(200),
        kind: templateKind,
        is_default: z.boolean(),
        config: templateConfigSchema,
        organization_id: uuid.nullish(),
      })
      .parse(data),
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
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
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
  .inputValidator((data: unknown) =>
    z
      .object({
        status: reportStatusEnum.optional(),
        kind: templateKind.optional(),
        // حقول <input type="date"> تبعث "YYYY-MM-DD"، لا ISO كامل
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional(),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional(),
        search: z.string().max(200).optional(),
        limit: z.number().int().positive().max(500).optional(),
      })
      .parse(data ?? {}),
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
    if (data.search) {
      const s = escapePostgrestPattern(data.search);
      q = q.or(`title.ilike.%${s}%,report_uid.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPdfReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        zakat_record_id: uuid.nullish(),
        template_id: uuid.nullish(),
        kind: templateKind,
        title: z.string().min(1).max(300),
        snapshot: z.record(z.string(), z.unknown()),
        content_hash: z.string().min(1).max(200),
        storage_path: z.string().max(500).nullish(),
        organization_id: uuid.nullish(),
      })
      .parse(data),
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
        snapshot: data.snapshot as never,
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
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        status: reportStatusEnum,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "downloaded") {
      patch.last_downloaded_at = new Date().toISOString();
      patch.last_downloaded_by = context.userId;
    }
    const { error } = await context.supabase
      .from("pdf_reports")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePdfReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
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
  .inputValidator((data: unknown) => z.object({ report_id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("pdf_report_audit")
      .select("*")
      .eq("report_id", data.report_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/**
 * يُرجع الرقم المرجعي لسجل التدقيق وتاريخ الاعتماد/الرفض لإقرار معيّن،
 * ليُطبع داخل تقرير PDF.
 */
export const getRecordAuditRef = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ zakat_record_id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: approval } = await context.supabase
      .from("zakat_approvals")
      .select("id, status, decided_at, submitted_at, checker_note")
      .eq("zakat_record_id", data.zakat_record_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: logRow } = await context.supabase
      .from("org_audit_log")
      .select("id, created_at")
      .eq("entity_id", data.zakat_record_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const seed =
      (logRow?.id as string | undefined) ??
      (approval?.id as string | undefined) ??
      data.zakat_record_id;
    const ref_no = `AUD-${seed.replace(/-/g, "").slice(0, 10).toUpperCase()}`;

    const status = approval?.status as string | undefined;
    return {
      ref_no,
      decision: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
      decided_at: (approval?.decided_at as string | null | undefined) ?? null,
      submitted_at: (approval?.submitted_at as string | null | undefined) ?? null,
      note: (approval?.checker_note as string | null | undefined) ?? null,
    } as const;
  });

// ============ Public verify (unauthenticated) ============

export const verifyPdfReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: uuid }).parse(data))
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
    // verify_token غير مُدرج بعد في الأنواع المولَّدة (هجرة حديثة) — from<any> مؤقت
    const { data: row } = await (supabaseAdmin.from("pdf_reports") as any)
      .select(
        "report_uid, kind, title, content_hash, status, version, created_at, issuer_display:created_by",
      )
      .eq("verify_token", data.token)
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
