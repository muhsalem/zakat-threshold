/**
 * محرك توليد PDF — pdfmake + خط Cairo عربي مضمّن عبر CDN.
 *
 * التصميم:
 * - lazy-load لـ pdfmake لتقليل bundle الرئيسي.
 * - يبني `docDefinition` من `TemplateConfig` + `ReportPayload`.
 * - يدعم ترويسة/تذييل ديناميكي مع "الصفحة X من Y".
 * - يدعم ختمًا موضوعًا في أي زاوية + QR للتحقق.
 */

import type { ReportPayload, TemplateConfig } from "./types";

type PdfMakeModule = {
  createPdf: (docDefinition: unknown) => {
    getBlob: (cb: (b: Blob) => void) => void;
    getBuffer: (cb: (b: Uint8Array) => void) => void;
    download: (filename?: string) => void;
  };
  vfs?: Record<string, string>;
  fonts?: Record<string, unknown>;
};

let pdfMakeCache: PdfMakeModule | null = null;

/**
 * يُحمّل pdfmake ويسجّل خط Cairo (Regular + Bold) عبر jsdelivr كـ base64.
 * التحميل يحصل مرة واحدة ثم يُخزَّن في الذاكرة.
 */
async function loadPdfMake(): Promise<PdfMakeModule> {
  if (pdfMakeCache) return pdfMakeCache;

  const mod = (await import("pdfmake/build/pdfmake")) as unknown as {
    default: PdfMakeModule;
  };
  const pdfMake = mod.default ?? (mod as unknown as PdfMakeModule);

  // تحميل خط Cairo كـ base64 (يحصل مرة واحدة)
  const [reg, bold] = await Promise.all([
    fetchFontBase64("https://cdn.jsdelivr.net/npm/@fontsource/cairo@5.0.16/files/cairo-arabic-400-normal.woff"),
    fetchFontBase64("https://cdn.jsdelivr.net/npm/@fontsource/cairo@5.0.16/files/cairo-arabic-700-normal.woff"),
  ]).catch(() => [null, null]);

  pdfMake.vfs = pdfMake.vfs ?? {};
  if (reg) pdfMake.vfs["Cairo-Regular.ttf"] = reg;
  if (bold) pdfMake.vfs["Cairo-Bold.ttf"] = bold;

  pdfMake.fonts = {
    Cairo: {
      normal: reg ? "Cairo-Regular.ttf" : "Roboto-Regular.ttf",
      bold: bold ? "Cairo-Bold.ttf" : "Roboto-Medium.ttf",
      italics: reg ? "Cairo-Regular.ttf" : "Roboto-Italic.ttf",
      bolditalics: bold ? "Cairo-Bold.ttf" : "Roboto-MediumItalic.ttf",
    },
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };

  pdfMakeCache = pdfMake;
  return pdfMake;
}

async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch {
    return null;
  }
}

/** يحوّل صورة رابط إلى dataURL (لاستخدامها في pdfmake). */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** يبني QR للتحقق ويعيده كـ dataURL PNG. */
async function buildVerifyQr(reportUid: string): Promise<string | null> {
  try {
    const QR = (await import("qrcode")) as unknown as {
      toDataURL: (text: string, opts?: unknown) => Promise<string>;
    };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/verify/${reportUid}`;
    return await QR.toDataURL(url, { margin: 0, width: 140 });
  } catch {
    return null;
  }
}

function stampPositionCoords(
  position: TemplateConfig["stamp"]["position"],
): { x: number; y: number } {
  // الصفحة A4 = 595 x 842 pt
  const pad = 40;
  const stampW = 120;
  switch (position) {
    case "tl":
      return { x: pad, y: 60 };
    case "tr":
      return { x: 595 - stampW - pad, y: 60 };
    case "bl":
      return { x: pad, y: 842 - stampW - 60 };
    case "center":
      return { x: (595 - stampW) / 2, y: (842 - stampW) / 2 };
    case "br":
    default:
      return { x: 595 - stampW - pad, y: 842 - stampW - 60 };
  }
}

/**
 * يبني ملف PDF ويُرجعه كـ Blob.
 */
export async function generateReportBlob(
  data: ReportPayload,
  config: TemplateConfig,
): Promise<Blob> {
  const pdfMake = await loadPdfMake();

  const [logoData, stampData, qrData] = await Promise.all([
    config.brand.logo_url ? urlToDataUrl(config.brand.logo_url) : Promise.resolve(null),
    config.stamp.enabled && config.stamp.image_url
      ? urlToDataUrl(config.stamp.image_url)
      : Promise.resolve(null),
    config.sections.verify_qr ? buildVerifyQr(data.report_uid) : Promise.resolve(null),
  ]);

  const primary = config.brand.primary_color;
  const accent = config.brand.accent_color;
  const headingSize = config.brand.heading_size;

  const section = (title: string, body: unknown) => [
    {
      text: title,
      style: "h2",
      color: primary,
      margin: [0, 12, 0, 6],
    },
    body,
  ];

  const kv = (rows: Array<{ label: string; value: string }>) => ({
    table: {
      widths: ["*", "auto"],
      body: rows.map((r) => [
        { text: r.label, alignment: "right", fontSize: 10 },
        { text: r.value, alignment: "left", fontSize: 10, bold: true },
      ]),
    },
    layout: {
      hLineColor: () => "#e5e7eb",
      vLineColor: () => "#e5e7eb",
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
  });

  const content: unknown[] = [];

  // Owner info
  if (config.sections.owner_info) {
    content.push(
      ...section(
        "بيانات صاحب الإقرار",
        kv([
          { label: "الاسم", value: data.owner.name || "—" },
          { label: "المهنة", value: data.owner.profession || "—" },
          { label: "الدولة", value: data.owner.country || "—" },
          { label: "العملة", value: data.meta.currency },
          { label: "السنة الهجرية", value: data.meta.hijri_year || "—" },
          { label: "تاريخ التقييم", value: data.meta.gregorian_date || "—" },
        ]),
      ),
    );
  }

  if (config.sections.inputs && data.inputs.length) {
    content.push(...section("المدخلات الأساسية", kv(data.inputs)));
  }
  if (config.sections.assets && data.assets.length) {
    content.push(...section("تفاصيل الأصول والحسابات", kv(data.assets)));
  }
  if (config.sections.calc_steps && data.calc_steps.length) {
    content.push(...section("خطوات الحساب التفصيلية", kv(data.calc_steps)));
  }

  if (config.sections.deductions && data.deductions.length) {
    content.push(
      ...section("الخصومات والاستبعادات", {
        table: {
          widths: ["*", "auto", 60],
          body: [
            [
              { text: "البند", style: "th", alignment: "right" },
              { text: "القيمة", style: "th", alignment: "left" },
              { text: "الحالة", style: "th", alignment: "center" },
            ],
            ...data.deductions.map((d) => [
              { text: d.label, fontSize: 10, alignment: "right" },
              { text: d.value, fontSize: 10, alignment: "left", bold: true },
              {
                text: d.included ? "مُخصم" : "مستبعد",
                fontSize: 9,
                alignment: "center",
                color: d.included ? "#059669" : "#dc2626",
              },
            ]),
          ],
        },
        layout: { hLineColor: () => "#e5e7eb", vLineColor: () => "#e5e7eb" },
      }),
    );
  }

  if (config.sections.results && data.results.length) {
    content.push(
      { text: "النتائج النهائية", style: "h2", color: primary, margin: [0, 14, 0, 6] },
      {
        table: {
          widths: ["*", "auto"],
          body: data.results.map((r) => [
            {
              text: r.label,
              alignment: "right",
              fontSize: r.emphasize ? 12 : 10,
              bold: r.emphasize,
            },
            {
              text: r.value,
              alignment: "left",
              fontSize: r.emphasize ? 14 : 11,
              bold: true,
              color: r.emphasize ? accent : "#111827",
            },
          ]),
        },
        layout: { hLineColor: () => "#d1d5db", vLineColor: () => "#d1d5db" },
      },
    );
  }

  if (config.sections.notes && config.notes_text) {
    content.push(
      ...section("ملاحظات وتوصيات", {
        text: config.notes_text,
        fontSize: 10,
        alignment: "right",
        lineHeight: 1.4,
      }),
    );
  }

  if (config.sections.sharia_refs && data.sharia_refs.length) {
    content.push(
      ...section("المراجع الشرعية والأدلة المستخدمة", {
        ul: data.sharia_refs.map((r) => ({
          text: r.note ? `${r.ref} — ${r.note}` : r.ref,
          fontSize: 9,
          alignment: "right",
        })),
      }),
    );
  }

  if (config.sections.legal_notice && config.legal_notice_text) {
    content.push({
      text: config.legal_notice_text,
      fontSize: 8,
      color: "#6b7280",
      italics: true,
      alignment: "right",
      margin: [0, 16, 0, 0],
    });
  }

  // بلوك التوقيع/الختم النصي
  if (config.stamp.enabled && (config.stamp.signer_name || config.stamp.signer_license)) {
    content.push({
      margin: [0, 20, 0, 0],
      columns: [
        { width: "*", text: "" },
        {
          width: 220,
          stack: [
            { text: "المُعتمِد", style: "h3", color: primary, alignment: "center" },
            {
              text: config.stamp.signer_name || "—",
              alignment: "center",
              bold: true,
              fontSize: 11,
            },
            config.stamp.signer_license
              ? {
                  text: `رقم الترخيص: ${config.stamp.signer_license}`,
                  alignment: "center",
                  fontSize: 9,
                  color: "#6b7280",
                }
              : { text: "" },
          ],
        },
      ],
    });
  }

  // QR للتحقق
  if (config.sections.verify_qr && qrData) {
    content.push({
      margin: [0, 24, 0, 0],
      columns: [
        {
          width: 100,
          image: qrData,
          fit: [100, 100],
        },
        {
          width: "*",
          stack: [
            {
              text: "تحقق من أصالة التقرير",
              fontSize: 10,
              bold: true,
              color: primary,
              alignment: "right",
            },
            {
              text: `رقم التقرير: ${data.report_uid}`,
              fontSize: 9,
              alignment: "right",
              margin: [0, 4, 0, 0],
            },
            {
              text: `بصمة المحتوى (SHA-256): ${data.content_hash.slice(0, 32)}…`,
              fontSize: 7,
              color: "#6b7280",
              alignment: "right",
            },
            {
              text: `النسخة: ${data.version}`,
              fontSize: 8,
              color: "#6b7280",
              alignment: "right",
            },
          ],
        },
      ],
    });
  }

  const stampCoords = stampPositionCoords(config.stamp.position);
  const stampBackground =
    config.stamp.enabled && stampData
      ? [
          {
            image: stampData,
            width: 120,
            opacity: config.stamp.opacity,
            absolutePosition: stampCoords,
          },
        ]
      : undefined;

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 90, 40, 70],
    defaultStyle: {
      font: "Cairo",
      alignment: "right" as const,
    },
    background: stampBackground,
    header: (currentPage: number, pageCount: number) => {
      const cols: unknown[] = [];
      if (config.header.show_logo && logoData) {
        cols.push({ image: logoData, width: 42, margin: [40, 20, 0, 0] });
      } else {
        cols.push({ text: "", width: 42, margin: [40, 20, 0, 0] });
      }
      cols.push({
        width: "*",
        stack: [
          config.header.show_org
            ? {
                text: config.brand.org_name,
                bold: true,
                fontSize: 12,
                color: primary,
                alignment: "center",
              }
            : { text: "" },
          config.header.show_report_no
            ? {
                text: `${data.title} · رقم ${data.report_uid}`,
                fontSize: 9,
                color: "#6b7280",
                alignment: "center",
              }
            : { text: "" },
          config.header.custom_text
            ? {
                text: config.header.custom_text,
                fontSize: 8,
                color: "#6b7280",
                alignment: "center",
              }
            : { text: "" },
        ],
        margin: [0, 20, 0, 0],
      });
      cols.push({ text: "", width: 42 });
      void currentPage;
      void pageCount;
      return { columns: cols };
    },
    footer: (currentPage: number, pageCount: number) => {
      const parts: unknown[] = [];
      if (config.footer.show_page_numbers) {
        parts.push({
          text: `الصفحة ${currentPage} من ${pageCount}`,
          fontSize: 8,
          alignment: "center",
          color: "#6b7280",
        });
      }
      const issuerLine: string[] = [];
      if (config.footer.show_issuer) {
        issuerLine.push(data.issuer_name || config.brand.org_name);
        issuerLine.push(new Date(data.issued_at).toLocaleString("ar-EG"));
      }
      if (issuerLine.length) {
        parts.push({
          text: issuerLine.join(" — "),
          fontSize: 7,
          alignment: "center",
          color: "#9ca3af",
        });
      }
      if (config.footer.custom_text) {
        parts.push({
          text: config.footer.custom_text,
          fontSize: 7,
          alignment: "center",
          color: "#9ca3af",
        });
      }
      return { stack: parts, margin: [40, 10, 40, 0] };
    },
    content,
    styles: {
      h1: { fontSize: headingSize + 4, bold: true, color: primary },
      h2: { fontSize: headingSize, bold: true },
      h3: { fontSize: headingSize - 4, bold: true },
      th: { bold: true, fontSize: 10, fillColor: "#f3f4f6" },
    },
  };

  return await new Promise<Blob>((resolve) => {
    pdfMake.createPdf(docDefinition).getBlob((blob) => resolve(blob));
  });
}

/** يحسب SHA-256 لـsnapshot ويُرجعه hex. */
export async function computeContentHash(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  const enc = new TextEncoder().encode(json);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
