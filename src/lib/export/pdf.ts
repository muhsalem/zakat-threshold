/**
 * يهرب نصاً حراً يدخله المستخدم قبل إدراجه داخل قالب HTML مبني بـ template
 * literal (اسم/ملاحظة مستفيد وما شابه) — القالب يُمرَّر لاحقاً لـ innerHTML
 * ولفتح نافذة طباعة كاملة، فأي وسم/سكربت غير مُهرَّب يُنفَّذ فعلياً هناك.
 */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * تصدير PDF من HTML جاهز (يدعم العربية RTL عبر html2canvas raster).
 * dynamic import لتقليل حجم الحزمة الأساسية.
 */
export async function exportHtmlToPdf(html: string, filename: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px"; // ~ A4 @ 96dpi
  container.setAttribute("dir", "rtl");
  document.body.appendChild(container);
  try {
    const mod = (await import("html2pdf.js")) as any;
    const html2pdf = mod.default ?? mod;
    await html2pdf()
      .from(container)
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .save();
  } finally {
    container.remove();
  }
}

export function pdfWrap(title: string, bodyHtml: string) {
  const now = new Date().toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" });
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif; color:#111; padding:16px" dir="rtl">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0d766e;padding-bottom:8px;margin-bottom:16px">
      <div>
        <div style="font-size:20px;font-weight:700;color:#0d766e">${title}</div>
        <div style="font-size:11px;color:#666">نِصاب — منصة الزكاة</div>
      </div>
      <div style="font-size:11px;color:#666">${now}</div>
    </div>
    ${bodyHtml}
    <div style="margin-top:24px;border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#888;text-align:center">
      صدر عبر منصة نِصاب — النتائج تقديرية استرشادية.
    </div>
  </div>`;
}
