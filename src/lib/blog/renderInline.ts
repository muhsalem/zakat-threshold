/**
 * تحويل تنسيق سطري مبسّط (عريض + روابط) إلى HTML.
 *
 * كانت النسخة السابقة تهرّب &<> فقط ثم تحقن الرابط خاماً:
 *   .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" ...>$1</a>')
 * فعلامة الاقتباس غير مهرَّبة تسمح بالخروج من السمة:
 *   [x](a" onmouseover="alert(1))  →  <a href="a" onmouseover="alert(1)" ...>
 * ولا فحص للمخطّط، فـ[x](javascript:alert(1)) ينتج رابطاً منفِّذاً.
 *
 * لم يكن ذلك مستغَلاً: المحتوى يأتي من BLOG_POSTS، مصفوفة ثابتة في
 * المستودع. استغلاله كان يتطلب صلاحية الكتابة في الكود أصلاً.
 * حُصّن لأن ربط المدوّنة بمصدر خارجي لاحقاً خطوة طبيعية، وعندها يصير
 * العيب ثغرة حيّة دون أن ينتبه أحد.
 */

/** مخطّطات تنفّذ سكربتاً أو تحمل حمولة مضمَّنة. */
const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file)\s*:/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** يُبقي الروابط الآمنة فقط؛ ما عداها يسقط إلى # فيبقى النص ظاهراً بلا تنفيذ. */
export function safeHref(raw: string): string {
  const url = raw.trim();
  if (DANGEROUS_SCHEME.test(url)) return "#";
  // نسبي أو مرساة أو http(s) أو بريد — وما سواه مرفوض احتياطاً
  if (/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(url)) return url;
  if (/^[\w.-]+(\.[a-z]{2,})(\/|$)/i.test(url)) return url; // نطاق مجرّد
  return "#";
}

export function renderInline(s: string): string {
  // التهريب أولاً: أي وسم في المصدر يصير نصاً، ثم نُدخل وسومنا وحدها.
  const escaped = escapeHtml(s);

  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
      // href مهرَّب أصلاً، لذا &quot; هنا نصّ لا مَخرَج من السمة.
      // نفكّه قبل فحص المخطّط كي لا يمرّ javascript&#58; ونحوه.
      const decoded = href.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      const safe = escapeHtml(safeHref(decoded));
      return `<a href="${safe}" class="text-primary underline">${text}</a>`;
    });
}
