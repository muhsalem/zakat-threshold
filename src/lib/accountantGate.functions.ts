import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * تحقق من كلمة المرور الرئيسية للمحاسب ومنح دور 'accountant' للمستخدم الحالي.
 * كلمة المرور محفوظة كسر ACCOUNTANT_MASTER_PASSWORD على الخادم.
 */
function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export const grantAccountantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ masterPassword: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const expected = process.env.ACCOUNTANT_MASTER_PASSWORD;
    if (!expected) {
      return {
        ok: false as const,
        reason: "لم يُهيَّأ السر ACCOUNTANT_MASTER_PASSWORD على الخادم",
      };
    }
    if (!passwordMatches(data.masterPassword, expected)) {
      // نوم قصير عشوائي لكبح المحاولات الآلية
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
      return { ok: false as const, reason: "كلمة المرور غير صحيحة" };
    }
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "accountant" as const }, { onConflict: "user_id,role" });
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });
