import * as XLSX from "xlsx";
import { fmt } from "@/lib/zakat";

export type ExportStats = {
  total: number;
  byStatus: { draft: number; pending: number; approved: number; rejected: number };
  compliance: { ok: number; warn: number; err: number };
  approvalRate: number;
  complianceRate: number;
  avgApprovalH: number;
  topErrors: { code: string; label: string; level: "error" | "warning"; count: number }[];
};

export type ExportRow = {
  id: string;
  record_type: string;
  hijri_year: string | null;
  gregorian_date: string | null;
  currency: string;
  total_assets: number;
  total_liabilities: number;
  zakat_base: number;
  zakat_due: number;
  net_due: number;
  approval_status: string | null;
  level: "ok" | "warn" | "err";
  issues: { code: string; label: string; level: string }[];
};

const LEVEL_LABEL: Record<string, string> = { ok: "سليم", warn: "تحذير", err: "خطأ" };
const STATUS_LABEL: Record<string, string> = {
  approved: "معتمد",
  pending: "قيد المراجعة",
  rejected: "مرفوض",
  draft: "مسودة",
};
const TYPE_LABEL: Record<string, string> = { individual: "فرد", company: "شركة" };

function periodLabelText(p: string): string {
  switch (p) {
    case "30d":
      return "آخر 30 يوماً";
    case "90d":
      return "آخر 90 يوماً";
    case "year":
      return "السنة الحالية";
    default:
      return "كل الفترات";
  }
}

export function exportKpiExcel(opts: {
  stats: ExportStats;
  rows: ExportRow[];
  attention: ExportRow[];
  period: string;
}) {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString("ar-EG");

  // Summary sheet
  const summary = [
    ["تقرير مؤشرات الامتثال (KPIs)"],
    ["الفترة", periodLabelText(opts.period)],
    ["تاريخ التصدير", now],
    [],
    ["المؤشر", "القيمة"],
    ["إجمالي الإقرارات", opts.stats.total],
    ["نسبة الامتثال %", opts.stats.complianceRate],
    ["نسبة الاعتماد %", opts.stats.approvalRate],
    ["متوسط زمن الاعتماد (ساعة)", opts.stats.avgApprovalH],
    [],
    ["توزيع الحالات", "العدد"],
    ["معتمد", opts.stats.byStatus.approved],
    ["قيد المراجعة", opts.stats.byStatus.pending],
    ["مرفوض", opts.stats.byStatus.rejected],
    ["مسودة", opts.stats.byStatus.draft],
    [],
    ["مستوى الامتثال", "العدد"],
    ["سليم", opts.stats.compliance.ok],
    ["تحذير", opts.stats.compliance.warn],
    ["خطأ", opts.stats.compliance.err],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "الملخّص");

  // Top errors
  const errors = [
    ["الخطأ", "المستوى", "العدد", "النسبة %"],
    ...opts.stats.topErrors.map((e) => [
      e.label,
      e.level === "error" ? "خطأ" : "تحذير",
      e.count,
      opts.stats.total ? Math.round((e.count / opts.stats.total) * 100) : 0,
    ]),
  ];
  const wsErrors = XLSX.utils.aoa_to_sheet(errors);
  wsErrors["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsErrors, "الأخطاء الشائعة");

  // Attention rows
  const attn = [
    [
      "التاريخ",
      "النوع",
      "السنة الهجرية",
      "الحالة",
      "الامتثال",
      "الأصول",
      "الخصوم",
      "الوعاء",
      "الزكاة",
      "الصافي",
      "العملة",
      "الملاحظات",
    ],
    ...opts.attention.map((r) => [
      r.gregorian_date ? new Date(r.gregorian_date).toLocaleDateString("ar-EG") : "—",
      TYPE_LABEL[r.record_type] ?? r.record_type,
      r.hijri_year || "—",
      STATUS_LABEL[r.approval_status ?? "draft"] ?? "—",
      LEVEL_LABEL[r.level],
      r.total_assets,
      r.total_liabilities,
      r.zakat_base,
      r.zakat_due,
      r.net_due,
      r.currency,
      r.issues.map((i) => i.label).join(" • "),
    ]),
  ];
  const wsAttn = XLSX.utils.aoa_to_sheet(attn);
  wsAttn["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAttn, "حالات تحتاج انتباه");

  // All records
  const all = [
    [
      "التاريخ",
      "النوع",
      "السنة الهجرية",
      "الحالة",
      "الامتثال",
      "الأصول",
      "الخصوم",
      "الوعاء",
      "الزكاة",
      "الصافي",
      "العملة",
    ],
    ...opts.rows.map((r) => [
      r.gregorian_date ? new Date(r.gregorian_date).toLocaleDateString("ar-EG") : "—",
      TYPE_LABEL[r.record_type] ?? r.record_type,
      r.hijri_year || "—",
      STATUS_LABEL[r.approval_status ?? "draft"] ?? "—",
      LEVEL_LABEL[r.level],
      r.total_assets,
      r.total_liabilities,
      r.zakat_base,
      r.zakat_due,
      r.net_due,
      r.currency,
    ]),
  ];
  const wsAll = XLSX.utils.aoa_to_sheet(all);
  XLSX.utils.book_append_sheet(wb, wsAll, "كل الإقرارات");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `kpi-report-${stamp}.xlsx`);
}

export function exportKpiPdf(opts: {
  stats: ExportStats;
  attention: ExportRow[];
  period: string;
}) {
  const now = new Date().toLocaleString("ar-EG");
  const rowsHtml = opts.attention
    .slice(0, 30)
    .map(
      (r) => `
      <tr>
        <td>${r.gregorian_date ? new Date(r.gregorian_date).toLocaleDateString("ar-EG") : "—"}</td>
        <td>${TYPE_LABEL[r.record_type] ?? r.record_type}</td>
        <td>${r.hijri_year || "—"}</td>
        <td>${STATUS_LABEL[r.approval_status ?? "draft"] ?? "—"}</td>
        <td class="lvl-${r.level}">${LEVEL_LABEL[r.level]}</td>
        <td dir="ltr">${fmt(r.zakat_due)} ${r.currency}</td>
        <td class="notes">${r.issues.map((i) => i.label).join(" • ")}</td>
      </tr>`,
    )
    .join("");

  const errorsHtml = opts.stats.topErrors
    .map((e) => {
      const pct = opts.stats.total ? Math.round((e.count / opts.stats.total) * 100) : 0;
      return `
      <tr>
        <td>${e.label}</td>
        <td>${e.level === "error" ? "خطأ" : "تحذير"}</td>
        <td dir="ltr">${e.count}</td>
        <td dir="ltr">${pct}%</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>تقرير مؤشرات الامتثال</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
  .kpi .lbl { font-size: 11px; color: #666; }
  .kpi .val { font-size: 20px; font-weight: 700; direction: ltr; }
  h2 { font-size: 14px; margin: 18px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #e5e7eb; padding: 5px 6px; text-align: right; }
  th { background: #f8fafc; }
  .lvl-err { color: #b91c1c; font-weight: 600; }
  .lvl-warn { color: #b45309; font-weight: 600; }
  .lvl-ok { color: #047857; font-weight: 600; }
  .notes { color: #444; }
  .status-bar { display: flex; height: 10px; border-radius: 6px; overflow: hidden; margin-top: 6px; background: #eee; }
  .sb-approved { background: #10b981; }
  .sb-pending { background: #f59e0b; }
  .sb-rejected { background: #ef4444; }
  .sb-draft { background: #94a3b8; }
  .legend { font-size: 11px; color: #555; margin-top: 6px; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
  <h1>تقرير مؤشرات الامتثال (KPIs)</h1>
  <div class="muted">الفترة: ${periodLabelText(opts.period)} · تاريخ التصدير: ${now}</div>

  <div class="kpis">
    <div class="kpi"><div class="lbl">إجمالي الإقرارات</div><div class="val">${opts.stats.total}</div></div>
    <div class="kpi"><div class="lbl">نسبة الامتثال</div><div class="val">${opts.stats.complianceRate}%</div></div>
    <div class="kpi"><div class="lbl">نسبة الاعتماد</div><div class="val">${opts.stats.approvalRate}%</div></div>
    <div class="kpi"><div class="lbl">متوسط زمن الاعتماد</div><div class="val">${opts.stats.avgApprovalH > 0 ? opts.stats.avgApprovalH + "h" : "—"}</div></div>
  </div>

  <h2>توزيع الحالات</h2>
  ${(() => {
    const t = opts.stats.total || 1;
    const p = (n: number) => (n / t) * 100;
    const s = opts.stats.byStatus;
    return `
    <div class="status-bar">
      <div class="sb-approved" style="width:${p(s.approved)}%"></div>
      <div class="sb-pending" style="width:${p(s.pending)}%"></div>
      <div class="sb-rejected" style="width:${p(s.rejected)}%"></div>
      <div class="sb-draft" style="width:${p(s.draft)}%"></div>
    </div>
    <div class="legend">
      معتمد: ${s.approved} · قيد المراجعة: ${s.pending} · مرفوض: ${s.rejected} · مسودة: ${s.draft}
    </div>`;
  })()}

  <h2>الأخطاء الشائعة</h2>
  ${
    opts.stats.topErrors.length === 0
      ? '<p class="muted">لا توجد أخطاء متكررة.</p>'
      : `<table><thead><tr><th>الخطأ</th><th>المستوى</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${errorsHtml}</tbody></table>`
  }

  <h2>حالات تحتاج انتباه (أعلى 30)</h2>
  ${
    opts.attention.length === 0
      ? '<p class="muted">لا توجد حالات تحتاج انتباه.</p>'
      : `<table><thead><tr><th>التاريخ</th><th>النوع</th><th>السنة</th><th>الحالة</th><th>الامتثال</th><th>الزكاة</th><th>الملاحظات</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
  }

  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 250));
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
