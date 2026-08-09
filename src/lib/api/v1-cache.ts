// أدوات التخزين المؤقت لواجهة v1.
//
// المبدأ: لا نُخزّن أي شيء يؤثّر على صحّة التحقق.
//  - /v1/rules       → قابل للتخزين العام (كتالوج ثابت لكل إصدار) + ETag.
//  - /v1/zakat-calc  → private + ETag = بصمة المحتوى؛ ذاكرة قصيرة (60ث) لإعادة
//                      إصدار نفس الشهادة لنفس المدخلات الحرفية فقط.
//  - /v1/verify      → no-store دائماً؛ التحقق يُعاد حسابه من الصفر في كل مرة.

export const NO_STORE = "no-store, no-cache, must-revalidate";

/** ETag ضعيف من نص (بصمة موجودة أو تجزئة سريعة) */
export function etagOf(value: string): string {
  return `W/"${value}"`;
}

/** تجزئة FNV-1a سريعة — للمفاتيح والـETag غير الأمني فقط */
export function fastHash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + value.length.toString(16);
}

export function ifNoneMatch(request: Request, etag: string): boolean {
  const header = request.headers.get("if-none-match");
  if (!header) return false;
  return header
    .split(",")
    .map((v) => v.trim())
    .some((v) => v === etag || v === "*" || v.replace(/^W\//, "") === etag.replace(/^W\//, ""));
}

export function notModified(etag: string, headers: Record<string, string>): Response {
  const { "Content-Type": _ct, ...rest } = headers as Record<string, string>;
  void _ct;
  return new Response(null, { status: 304, headers: { ...rest, ETag: etag } });
}

/** ذاكرة صغيرة داخل العملية (TTL) — تراجع آمن: الفقدان يعني إعادة حساب فقط */
interface Entry<T> {
  value: T;
  expiresAt: number;
}
const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

export function memoGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function memoSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function __clearV1Cache(): void {
  store.clear();
}
