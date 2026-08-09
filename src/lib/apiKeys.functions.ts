import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALL_SCOPES = ["zakat:calc", "zakat:verify", "rules:read"] as const;

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select(
        "id, name, key_prefix, scopes, rate_limit_per_min, active, last_used_at, request_count, revoked_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        scopes: z.array(z.enum(ALL_SCOPES)).min(1).default(["zakat:calc", "zakat:verify"]),
        rateLimitPerMin: z.number().int().min(1).max(6000).default(60),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { generateApiKey } = await import("@/lib/api/v1-auth.server");
    const { raw, hash, prefix } = await generateApiKey();

    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: data.scopes,
        rate_limit_per_min: data.rateLimitPerMin,
      })
      .select("id, name, key_prefix, scopes, rate_limit_per_min, created_at")
      .single();
    if (error) throw new Error(error.message);

    // القيمة الخام تُعاد مرة واحدة فقط ولا تُخزَّن
    return { key: raw, record: row };
  });

export const setApiKeyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ active: data.active, revoked_at: data.active ? null : new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
