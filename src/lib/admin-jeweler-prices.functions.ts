import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminJewelerPriceSchema } from "./admin-jeweler-prices";

export const saveAdminJewelerPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminJewelerPriceSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Forbidden");
    const { data: id, error } = await context.supabase.rpc("save_admin_jeweler_price", {
      _country: data.country, _currency: data.currency, _gold: data.gold, _silver: data.silver,
      _gold_buyback: data.goldBuyback, _silver_buyback: data.silverBuyback, _source: data.source, _reason: data.reason,
    });
    if (error || !id) throw new Error("Could not save price and history");
    return { ok: true, id };
  });

export const getManualJewelerHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Forbidden");
    const { data, error } = await context.supabase.from("audit_log")
      .select("id,actor_id,created_at,reason,meta").eq("action", "manual_jeweler_price")
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error("Could not load history");
    return data ?? [];
  });