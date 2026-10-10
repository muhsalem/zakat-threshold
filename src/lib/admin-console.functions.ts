import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COUNTRIES } from "@/lib/countries";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function audit(db: any, actor: string, action: string, entity: string, reason: string, meta: object = {}) {
  await db.from("audit_log").insert({ actor_id: actor, action, entity, reason, meta });
}

/* ---------- Facebook ---------- */

export const getFacebookStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data } = await db.from("app_settings").select("value,updated_at").eq("key", "facebook").maybeSingle();
    const v: any = data?.value ?? {};
    return {
      pageId: (v.page_id as string) ?? "",
      hasToken: Boolean(v.token) || Boolean(process.env["FACEBOOK_PAGE_ACCESS_TOKEN"]),
      enabled: v.enabled !== false,
      lastRun: (v.last_run as string) ?? null,
      lastPosted: Boolean(v.last_posted),
      lastReason: (v.last_reason as string) ?? "",
    };
  });

export const saveFacebookSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      pageId: z.string().trim().regex(/^\d{5,30}$/, "invalid page id"),
      token: z.string().trim().max(1000).optional(),
      enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { data: cur } = await db.from("app_settings").select("value").eq("key", "facebook").maybeSingle();
    const prev = (cur?.value ?? {}) as Record<string, unknown>;
    const value = { ...prev, page_id: data.pageId, enabled: data.enabled, ...(data.token ? { token: data.token } : {}) };
    const { error } = await db.from("app_settings").upsert({ key: "facebook", value, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    await audit(db, context.userId, data.enabled ? "facebook_enabled" : "facebook_disabled", "app_settings", data.token ? "token updated" : "settings updated");
    return { ok: true };
  });

export const testFacebookPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data: last } = await db.from("nisab_history").select("day").order("day", { ascending: false }).limit(1).maybeSingle();
    if (!last) return { posted: false, reason: "no data" };
    const { postDailyToFacebook } = await import("@/lib/daily-broadcast.server");
    return postDailyToFacebook(db, last.day, true);
  });

/* ---------- Users & roles ---------- */

const ROLES = ["admin", "jeweler", "ambassador", "volunteer"] as const;

export const listUsersWithRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context);
    const { data: list, error } = await db.auth.admin.listUsers({ perPage: 500 });
    if (error) throw new Error(error.message);
    const { data: roles } = await db.from("user_roles").select("user_id,role");
    type Row = { id: string; email: string; confirmed: boolean; invited: boolean; lastSignIn: string | null; roles: string[] };
    return list.users.map((u: any): Row => ({
      id: u.id as string,
      email: (u.email as string) ?? "",
      confirmed: Boolean(u.email_confirmed_at),
      invited: Boolean(u.invited_at) && !u.last_sign_in_at,
      lastSignIn: (u.last_sign_in_at as string) ?? null,
      roles: (roles ?? []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role as string),
    }));
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255), role: z.enum(ROLES), redirectTo: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const { data: res, error } = await db.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (error) return { ok: false, reason: error.message };
    const uid = res.user?.id;
    if (uid) {
      const { data: has } = await db.from("user_roles").select("id").eq("user_id", uid).eq("role", data.role).maybeSingle();
      if (!has) await db.from("user_roles").insert({ user_id: uid, role: data.role });
    }
    await audit(db, context.userId, "user_invited", "user_roles", `${data.email} → ${data.role}`);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), role: z.enum(ROLES), grant: z.boolean(), reason: z.string().trim().min(3).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    if (!data.grant && data.role === "admin") {
      if (data.userId === context.userId) return { ok: false, reason: "لا يمكنك سحب صلاحيتك بنفسك" };
      const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) return { ok: false, reason: "يجب بقاء مشرف واحد على الأقل" };
    }
    if (data.grant) {
      const { data: has } = await db.from("user_roles").select("id").eq("user_id", data.userId).eq("role", data.role).maybeSingle();
      if (has) return { ok: true };
    }
    const q = data.grant
      ? db.from("user_roles").insert({ user_id: data.userId, role: data.role })
      : db.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    const { error } = await q;
    if (error && !String(error.message).includes("duplicate")) return { ok: false, reason: error.message };
    await audit(db, context.userId, data.grant ? "role_granted" : "role_revoked", "user_roles", data.reason, { user: data.userId, role: data.role });
    return { ok: true };
  });

/* ---------- Import from old project ---------- */

const num = z.union([z.number(), z.string(), z.null()]).optional().transform((v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : NaN;
});

const rowSchema = z.object({
  country: z.string(),
  currency: z.string(),
  day: z.string(),
  gold_gram: num,
  silver_gram: num,
  buyback_gram: num,
  silver_buyback_gram: num,
  gold_nisab: num,
  silver_nisab: num,
  source: z.string().optional(),
  source_url: z.string().optional(),
}).passthrough();

export const importHistoricalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ target: z.enum(["nisab_history", "jeweler_feed"]), rows: z.array(z.record(z.any())).max(20000), commit: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context);
    const codes = new Map(COUNTRIES.map((c) => [c.code, c.currency]));
    const today = new Date().toISOString().slice(0, 10);
    const valid: any[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    data.rows.forEach((raw, i) => {
      const p = rowSchema.safeParse(raw);
      if (!p.success) return void errors.push(`#${i + 1}: حقول ناقصة`);
      const r = p.data;
      const country = r.country.trim().toUpperCase();
      const day = r.day.trim().slice(0, 10);
      if (!codes.has(country)) return void errors.push(`#${i + 1}: دولة غير معروفة ${country}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || day > today || day < "1900-01-01")
        return void errors.push(`#${i + 1}: تاريخ غير صالح ${r.day}`);
      const nums = [r.gold_gram, r.silver_gram, r.buyback_gram, r.silver_buyback_gram, r.gold_nisab, r.silver_nisab];
      if (nums.some((n) => Number.isNaN(n))) return void errors.push(`#${i + 1}: رقم غير صالح`);
      // nisab columns are generated from gram prices; derive grams if only nisab given
      if (r.gold_gram == null && r.gold_nisab != null) r.gold_gram = r.gold_nisab / 85;
      if (r.silver_gram == null && r.silver_nisab != null) r.silver_gram = r.silver_nisab / 595;
      if (r.gold_gram == null && r.silver_gram == null) return void errors.push(`#${i + 1}: لا يوجد سعر ذهب أو فضة`);
      const key = `${country}|${day}|${r.source ?? ""}`;
      if (seen.has(key)) return void errors.push(`#${i + 1}: مكرر داخل الملف`);
      seen.add(key);
      const base = { country, currency: r.currency.trim().toUpperCase(), day, gold_gram: r.gold_gram, silver_gram: r.silver_gram, source: r.source ?? "import", source_url: r.source_url ?? "" };
      valid.push(
        data.target === "nisab_history"
          ? base
          : { ...base, buyback_gram: r.buyback_gram, silver_buyback_gram: r.silver_buyback_gram },
      );
    });

    // Remove rows that already exist (same country + day [+ source])
    let duplicates = 0;
    let fresh = valid;
    if (valid.length) {
      const days = [...new Set(valid.map((v) => v.day as string))].sort();
      const { data: existing } = await db.from(data.target).select("country,day,source").gte("day", days[0]).lte("day", days[days.length - 1]).limit(50000);
      const ex = new Set((existing ?? []).map((e: any) => data.target === "nisab_history" ? `${e.country}|${e.day}` : `${e.country}|${e.day}|${e.source}`));
      fresh = valid.filter((v) => !ex.has(data.target === "nisab_history" ? `${v.country}|${v.day}` : `${v.country}|${v.day}|${v.source}`));
      duplicates = valid.length - fresh.length;
    }

    let inserted = 0;
    if (data.commit && fresh.length) {
      for (let i = 0; i < fresh.length; i += 500) {
        const { error } = await db.from(data.target).insert(fresh.slice(i, i + 500));
        if (error) throw new Error(error.message);
        inserted += Math.min(500, fresh.length - i);
      }
      await audit(db, context.userId, "data_import", data.target, `${inserted} rows imported`, { rejected: errors.length, duplicates });
    }
    return { total: data.rows.length, valid: valid.length, duplicates, toInsert: fresh.length, inserted, errors: errors.slice(0, 50), errorCount: errors.length };
  });
