/**
 * مصدر واحد لرؤوس الأمان — يُستورَد في `__root.tsx` (meta CSP، دفاع إضافي)
 * وفي `server.ts` (رؤوس HTTP حقيقية، المصدر الفعّال). `frame-ancestors` و
 * HSTS لا يعملان عبر `<meta>` بحسب مواصفة المتصفح، لذا رؤوس HTTP هنا هي
 * الحماية الفعلية الوحيدة لهما.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // أُزيل 'unsafe-eval': غير مطلوب لبناء React/Vite للإنتاج، ويوسّع سطح XSS.
  "script-src 'self' 'unsafe-inline' https://cdn.gpteng.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data: https:",
  "connect-src 'self' https: wss: data: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

export const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  // يعمل عبر HTTP حتى في المتصفحات القديمة التي لا تطبّق frame-ancestors من CSP.
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self), usb=()",
  // يُتجاهَل تلقائياً من المتصفح لو الاتصال HTTP (لا يضر بيئة التطوير المحلية).
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};
