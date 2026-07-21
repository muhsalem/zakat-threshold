/**
 * SSRF Guard — يمنع اتصالات ERP (Odoo/SAP بعنوان يُدخله المستخدم) من الوصول
 * لموارد الشبكة الداخلية للاستضافة (IPs خاصة/محجوزة، localhost، البروتوكولات
 * غير HTTP(S)). ثغرة SSRF مؤكدة في تدقيق أمني سابق: الخادم كان يستدعي
 * base_url المُدخل يدوياً بلا أي تحقق.
 *
 * الدفاع بطبقتين: (1) فحص بنية العنوان قبل أي DNS، (2) فحص العناوين الفعلية
 * التي يُحلّها DNS إليها — يمنع إعادة التوجيه الملتفة (DNS rebinding) عبر
 * دومين عام يُحلّ إلى IP داخلي.
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "metadata.google.internal"]);

/** يحوّل IPv4 منقّط إلى رقم 32-بت للمقارنة الحسابية بالنطاقات */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "هذه الشبكة"
  ["10.0.0.0", 8], // خاصة RFC1918
  ["100.64.0.0", 10], // مساحة CGNAT — تُستخدم لبيانات وصفية سحابية
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — بيانات وصفية AWS/GCP/Azure الحساسة
  ["172.16.0.0", 12], // خاصة RFC1918
  ["192.0.0.0", 24], // IANA خاصة
  ["192.168.0.0", 16], // خاصة RFC1918
  ["198.18.0.0", 15], // اختبار قياس أداء
];

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const baseN = ipv4ToInt(base);
    if (baseN === null) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (baseN & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  // hostname الخاص بـURL يحيط عناوين IPv6 بأقواس مربعة — "[::1]"
  const low = ip.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    low === "::1" || // loopback
    low.startsWith("fe80:") || // link-local
    low.startsWith("fc") ||
    low.startsWith("fd") || // unique local
    low.startsWith("::ffff:127.") || // IPv4-mapped loopback
    low.startsWith("::ffff:10.") ||
    low.startsWith("::ffff:169.254.") ||
    low.startsWith("::ffff:192.168.")
  );
}

export interface SsrfCheckResult {
  ok: boolean;
  reason?: string;
}

/** فحص بنيوي سريع (بلا DNS) — يرفض فوراً العناوين المشبوهة شكلياً */
export function checkUrlStructure(rawUrl: string): SsrfCheckResult {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "رابط غير صالح" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, reason: "يُسمح فقط بروابط http/https" };
  }
  const hostname = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "لا يُسمح بالاتصال بمضيف محلي" };
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { ok: false, reason: "لا يُسمح بنطاقات الشبكة الداخلية" };
  }
  // عنوان IP صريح في الرابط: افحصه مباشرة بلا انتظار DNS
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && isPrivateIPv4(hostname)) {
    return { ok: false, reason: "لا يُسمح بالاتصال بعناوين IP خاصة/داخلية" };
  }
  if (hostname.includes(":") && isPrivateIPv6(hostname)) {
    return { ok: false, reason: "لا يُسمح بالاتصال بعناوين IP خاصة/داخلية" };
  }
  return { ok: true };
}

/**
 * فحص كامل: يحلّ الدومين فعلياً عبر DNS-over-HTTPS (Cloudflare) ويتحقق أن
 * كل عنوان محلول ليس خاصاً — يمنع DNS rebinding (دومين عام يُحلّ لاحقاً
 * إلى 127.0.0.1 أو شبكة داخلية بعد اجتياز الفحص البنيوي).
 */
export async function checkUrlSafe(rawUrl: string): Promise<SsrfCheckResult> {
  const structural = checkUrlStructure(rawUrl);
  if (!structural.ok) return structural;

  const hostname = new URL(rawUrl).hostname.toLowerCase();
  // عنوان IP صريح بالفعل — الفحص البنيوي كافٍ، لا حاجة لـDNS
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return { ok: true };
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      { headers: { Accept: "application/dns-json" }, signal: ctrl.signal },
    ).finally(() => clearTimeout(t));
    if (!res.ok) return { ok: true }; // تعذّر التحقق — لا نحجب اتصالاً مشروعاً بسبب فشل DoH
    const data = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
    const ips = (data.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
    for (const ip of ips) {
      if (isPrivateIPv4(ip)) {
        return { ok: false, reason: `الدومين يُحلّ إلى عنوان داخلي (${ip})` };
      }
    }
    return { ok: true };
  } catch {
    // تعذّر الوصول لخدمة DNS-over-HTTPS نفسها — لا نمنع الاتصال المشروع
    return { ok: true };
  }
}

/** يرمي خطأً واضحاً إن كان الرابط غير آمن — للاستخدام المباشر قبل أي fetch لعنوان ERP */
export async function assertUrlSafe(rawUrl: string): Promise<void> {
  const r = await checkUrlSafe(rawUrl);
  if (!r.ok) throw new Error(`رابط ERP مرفوض: ${r.reason}`);
}
