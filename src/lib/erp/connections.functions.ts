/**
 * ERP server functions: list/save/test/delete connections + push zakat record.
 * Uses requireSupabaseAuth so all rows are scoped to auth.uid() via RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildNormalizedJournal, type ZakatCalcInput } from "./journal";
import { testConnection, pushJournal, type Provider, type ErpCreds } from "./providers.server";

export interface ErpConnectionInput {
  id?: string;
  provider: Provider;
  label: string;
  base_url: string;
  db_name?: string;
  username?: string;
  api_key: string;
}

export const listErpConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("erp_connections")
      .select("id, provider, label, base_url, db_name, username, is_active, last_tested_at, last_test_status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveErpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ErpConnectionInput) => {
    if (!d.provider) throw new Error("provider_required");
    if (!d.base_url?.startsWith("http")) throw new Error("base_url_invalid");
    if (!d.api_key) throw new Error("api_key_required");
    if (!d.label) throw new Error("label_required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      provider: data.provider,
      label: data.label,
      base_url: data.base_url.replace(/\/$/, ""),
      db_name: data.db_name ?? null,
      username: data.username ?? null,
      api_key: data.api_key,
    };
    const q = data.id
      ? context.supabase.from("erp_connections").update(row).eq("id", data.id).select().single()
      : context.supabase.from("erp_connections").insert(row).select().single();
    const { data: saved, error } = await q;
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteErpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("erp_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testErpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: c, error } = await context.supabase
      .from("erp_connections")
      .select("*").eq("id", data.id).single();
    if (error || !c) throw new Error(error?.message ?? "not_found");

    const creds: ErpCreds = {
      provider: c.provider as Provider,
      base_url: c.base_url,
      db_name: c.db_name,
      username: c.username,
      api_key: c.api_key,
    };
    const res = await testConnection(creds);
    await context.supabase.from("erp_connections").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: res.ok ? `ok:${res.message}`.slice(0, 200) : `error:${res.message}`.slice(0, 200),
    }).eq("id", data.id);
    return res;
  });

export const listErpSyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("erp_sync_log")
      .select("id, connection_id, zakat_record_id, provider, external_id, status, reference, amount, currency, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const pushZakatRecordToErp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connection_id: string; zakat_record_id: string }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: conn, error: e1 }, { data: rec, error: e2 }] = await Promise.all([
      context.supabase.from("erp_connections").select("*").eq("id", data.connection_id).single(),
      context.supabase.from("zakat_records").select("*").eq("id", data.zakat_record_id).single(),
    ]);
    if (e1 || !conn) throw new Error(e1?.message ?? "connection_not_found");
    if (e2 || !rec) throw new Error(e2?.message ?? "record_not_found");

    const input: ZakatCalcInput = {
      entity_name: rec.record_type === "company" ? "Company Zakat" : "Individual Zakat",
      entity_id: rec.user_id,
      reference: `ZKT-${rec.id.slice(0, 8).toUpperCase()}`,
      currency: rec.currency,
      zakat_due: Number(rec.zakat_due),
      base_amount: Number(rec.zakat_base),
      rate: 0.025,
      period_start: rec.gregorian_date,
      period_end: rec.gregorian_date,
      jurisdiction: (conn.extra as { jurisdiction?: string } | null)?.jurisdiction,
      fatwa_authority: "AAOIFI-35",
      memo: rec.notes ?? undefined,
    };
    const journal = buildNormalizedJournal(input);

    const creds: ErpCreds = {
      provider: conn.provider as Provider,
      base_url: conn.base_url,
      db_name: conn.db_name,
      username: conn.username,
      api_key: conn.api_key,
    };
    const res = await pushJournal(creds, journal);

    await context.supabase.from("erp_sync_log").insert({
      user_id: context.userId,
      connection_id: conn.id,
      zakat_record_id: rec.id,
      provider: conn.provider,
      external_id: res.external_id ?? null,
      status: res.ok ? "success" : "failed",
      reference: journal.reference,
      amount: journal.lines[0]?.debit ?? 0,
      currency: journal.currency,
      request_payload: JSON.parse(JSON.stringify(journal)),
      response_payload: res.raw ? JSON.parse(JSON.stringify(res.raw)) : null,
      error_message: res.error ?? null,
    });

    return { ok: res.ok, external_id: res.external_id, error: res.error };
  });
