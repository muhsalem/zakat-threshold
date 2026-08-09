// مصادقة مفاتيح API لواجهة v1.
// المفتاح لا يُخزَّن أبداً في قاعدة البيانات — تُخزَّن بصمة SHA-256 فقط،
// ويُعرض المفتاح الخام مرة واحدة لحظة الإنشاء.

export const API_KEY_PREFIX = "nsb_live_";

export type V1Scope = "zakat:calc" | "zakat:verify" | "rules:read";

export interface ApiKeyPrincipal {
  keyId: string;
  userId: string;
  name: string;
  scopes: string[];
  rateLimitPerMin: number;
}

export type ApiKeyAuthResult =
  | { ok: true; principal: ApiKeyPrincipal }
  | { ok: false; reason: "missing" | "invalid" | "revoked" | "scope"; message: string };

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** يولّد مفتاحاً جديداً: القيمة الخام + بصمتها + بادئتها الظاهرة */
export async function generateApiKey(): Promise<{
  raw: string;
  hash: string;
  prefix: string;
}> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const raw = `${API_KEY_PREFIX}${body}`;
  return { raw, hash: await sha256Hex(raw), prefix: raw.slice(0, API_KEY_PREFIX.length + 6) };
}

function extractKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m?.[1]) return m[1].trim();
  }
  const header = request.headers.get("x-api-key");
  return header ? header.trim() : null;
}

/**
 * يتحقّق من المفتاح المرسل ويعيد هوية صاحبه.
 * يستخدم عميل الخدمة (يتجاوز RLS) لأن المستدعي غير مسجَّل بجلسة.
 */
export async function authenticateApiKey(
  request: Request,
  requiredScope: V1Scope,
): Promise<ApiKeyAuthResult> {
  const raw = extractKey(request);
  if (!raw) {
    return {
      ok: false,
      reason: "missing",
      message: "أرسل مفتاح الوصول في ترويسة Authorization: Bearer <key> أو X-API-Key.",
    };
  }
  if (!raw.startsWith(API_KEY_PREFIX)) {
    return {
      ok: false,
      reason: "invalid",
      message: `صيغة المفتاح غير صحيحة — يجب أن يبدأ بـ ${API_KEY_PREFIX}`,
    };
  }

  const hash = await sha256Hex(raw);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, name, scopes, rate_limit_per_min, active, revoked_at, request_count")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "invalid", message: "المفتاح غير معروف أو تم حذفه." };
  }
  if (!data.active || data.revoked_at) {
    return { ok: false, reason: "revoked", message: "هذا المفتاح موقوف أو ملغى." };
  }
  const scopes = data.scopes ?? [];
  if (!scopes.includes(requiredScope)) {
    return {
      ok: false,
      reason: "scope",
      message: `المفتاح لا يملك الصلاحية المطلوبة (${requiredScope}). الصلاحيات الحالية: ${scopes.join(", ") || "لا شيء"}.`,
    };
  }

  // تحديث آخر استخدام — أفضل جهد، لا يفشل الطلب إن تعذّر
  void supabaseAdmin
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      request_count: (data.request_count ?? 0) + 1,
    })
    .eq("id", data.id)
    .then(
      () => undefined,
      () => undefined,
    );

  return {
    ok: true,
    principal: {
      keyId: data.id,
      userId: data.user_id,
      name: data.name,
      scopes,
      rateLimitPerMin: data.rate_limit_per_min ?? 60,
    },
  };
}
