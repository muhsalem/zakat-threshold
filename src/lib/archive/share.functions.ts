import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ id: z.string().uuid() });
const createShareSchema = z.object({
  id: z.string().uuid(),
  expiresInDays: z.number().finite().positive().max(3650).nullish(),
});
const tokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(12)
    .max(64)
    .regex(/^[A-Z0-9]+$/),
});

// Base32 (Crockford-ish) 24-char token = ~120 bits entropy
function generateToken(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createShareSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: findErr } = await supabase
      .from("user_report_archive")
      .select("id, share_token, share_expires_at, share_revoked_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!row) throw new Error("Report not found");

    let token = row.share_token as string | null;
    // rotate token if revoked; otherwise reuse existing token
    if (!token || row.share_revoked_at) token = generateToken();

    const expiresAt =
      data.expiresInDays && data.expiresInDays > 0
        ? new Date(Date.now() + data.expiresInDays * 86400_000).toISOString()
        : null;

    const { error: updErr } = await supabase
      .from("user_report_archive")
      .update({
        share_token: token,
        share_expires_at: expiresAt,
        share_revoked_at: null,
      })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (updErr) throw updErr;

    return { token, expiresAt };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_report_archive")
      .update({ share_revoked_at: new Date().toISOString(), share_token: null })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true as const };
  });

export const getSharedReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const token = data.token;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("user_report_archive")
      .select(
        "id, kind, year, currency, payload, created_at, updated_at, share_expires_at, share_revoked_at",
      )
      .eq("share_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("NOT_FOUND");
    if (row.share_revoked_at) throw new Error("REVOKED");
    if (row.share_expires_at && new Date(row.share_expires_at).getTime() < Date.now()) {
      throw new Error("EXPIRED");
    }
    return {
      id: row.id,
      kind: row.kind,
      year: row.year,
      currency: row.currency,
      payload: row.payload,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.share_expires_at,
    };
  });

export const getMyShareInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("user_report_archive")
      .select("share_token, share_expires_at, share_revoked_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return row ?? null;
  });
