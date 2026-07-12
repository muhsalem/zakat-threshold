import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Role = "admin" | "moderator" | "user";
type AuthCtx = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(ctx: AuthCtx) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("AUTHZ_CHECK_FAILED");
  if (!data) throw new Error("FORBIDDEN_ADMIN_ONLY");
}

/** يعرض كل المستخدمين مع أدوارهم (للمدراء فقط). */
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error: e1 } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (e1) throw new Error(e1.message);
    const { data: roles, error: e2 } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (e2) throw new Error(e2.message);
    const map = new Map<string, Role[]>();
    for (const r of roles ?? []) {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      map.set(r.user_id, arr);
    }
    return (users?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: map.get(u.id) ?? [],
    }));
  });

/** يمنح دورًا لمستخدم. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: Role }) => {
    if (!d?.userId || !["admin", "moderator", "user"].includes(d?.role)) {
      throw new Error("invalid input");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("sharia_audit_log").insert({
      user_id: (context as any).userId,
      action: "role_granted",
      fingerprint: `${data.userId}:${data.role}`,
      sharia_refs: ["RBAC: grant role"],
    });
    return { ok: true };
  });

/** يسحب دورًا من مستخدم. */
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: Role }) => {
    if (!d?.userId || !["admin", "moderator", "user"].includes(d?.role)) {
      throw new Error("invalid input");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    // امنع إلغاء آخر مدير في النظام
    if (data.role === "admin") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("لا يمكن إلغاء دور آخر مدير في النظام");
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin_log(context as any, data);
    return { ok: true };
  });

async function supabaseAdmin_log(
  context: { userId: string },
  data: { userId: string; role: Role },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("sharia_audit_log").insert({
    user_id: context.userId,
    action: "role_revoked",
    fingerprint: `${data.userId}:${data.role}`,
    sharia_refs: ["RBAC: revoke role"],
  });
}

/** قائمة طلبات اعتماد الزكاة المعلّقة (للمدقّقين والمدراء). */
export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    // المدقّق في أي منظّمة OR مدير عام
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    const { data, error } = await ctx.supabase
      .from("zakat_approvals")
      .select(
        "id, title, status, fingerprint, submitted_at, organization_id, maker_id, checker_note",
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: data ?? [], isAdmin: !!isAdmin };
  });

/** اعتماد أو رفض طلب. */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; decision: "approved" | "rejected"; note?: string }) => {
    if (!d?.id || !["approved", "rejected"].includes(d?.decision)) throw new Error("invalid input");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { error } = await ctx.supabase
      .from("zakat_approvals")
      .update({
        status: data.decision,
        checker_id: ctx.userId,
        checker_note: data.note ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await ctx.supabase.from("sharia_audit_log").insert({
      action: `approval_${data.decision}`,
      fingerprint: data.id,
      sharia_refs: ["Governance: AAOIFI GS-1 audit & oversight"],
    });
    return { ok: true };
  });
