// Lightweight iXBRL / XBRL exporter for Zakat reports (AAOIFI-style taxonomy stub).
// Produces an inline-XBRL HTML document or a pure XBRL XML instance.

export interface XbrlEntity {
  scheme?: string; // e.g. "https://www.sa.gov.sa/cr"
  identifier: string; // commercial registration number
  name: string;
}

export interface XbrlPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface XbrlFact {
  concept: string; // e.g. "zk:ZakatBase"
  value: number;
  unit?: string; // currency code, default SAR
  decimals?: number;
}

export interface XbrlReport {
  entity: XbrlEntity;
  period: XbrlPeriod;
  currency: string;
  facts: XbrlFact[];
  title?: string;
}

const NS = {
  xbrli: "http://www.xbrl.org/2003/instance",
  link: "http://www.xbrl.org/2003/linkbase",
  xlink: "http://www.w3.org/1999/xlink",
  iso4217: "http://www.xbrl.org/2003/iso4217",
  ix: "http://www.xbrl.org/2013/inlineXBRL",
  zk: "https://nisab.app/taxonomy/zakat/2026",
};

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}

function num(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

/** Pure XBRL XML instance document. */
export function toXbrlInstance(r: XbrlReport): string {
  const ctxId = "c1";
  const unitId = `U_${r.currency}`;
  const facts = r.facts
    .map(
      (f) =>
        `  <${f.concept} contextRef="${ctxId}" unitRef="${unitId}" decimals="${f.decimals ?? 2}">${num(f.value)}</${f.concept}>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="${NS.xbrli}"
  xmlns:link="${NS.link}"
  xmlns:xlink="${NS.xlink}"
  xmlns:iso4217="${NS.iso4217}"
  xmlns:zk="${NS.zk}">
  <xbrli:context id="${ctxId}">
    <xbrli:entity>
      <xbrli:identifier scheme="${esc(r.entity.scheme ?? "https://nisab.app/entity")}">${esc(r.entity.identifier)}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period>
      <xbrli:startDate>${r.period.startDate}</xbrli:startDate>
      <xbrli:endDate>${r.period.endDate}</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  <xbrli:unit id="${unitId}">
    <xbrli:measure>iso4217:${r.currency}</xbrli:measure>
  </xbrli:unit>
${facts}
</xbrli:xbrl>`;
}

/** Inline XBRL (iXBRL) — human-readable HTML embedding the tagged facts. */
export function toInlineXbrlHtml(r: XbrlReport): string {
  const ctxId = "c1";
  const unitId = `U_${r.currency}`;
  const rows = r.facts
    .map(
      (f) => `      <tr>
        <td>${esc(f.concept)}</td>
        <td style="text-align:end">
          <ix:nonFraction name="${f.concept}" contextRef="${ctxId}" unitRef="${unitId}" decimals="${f.decimals ?? 2}" format="ixt:numdotdecimal">${num(f.value)}</ix:nonFraction>
          ${esc(r.currency)}
        </td>
      </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" xmlns:ix="${NS.ix}" xmlns:xbrli="${NS.xbrli}" xmlns:link="${NS.link}" xmlns:xlink="${NS.xlink}" xmlns:iso4217="${NS.iso4217}" xmlns:zk="${NS.zk}">
<head>
  <meta charset="utf-8"/>
  <title>${esc(r.title ?? "تقرير الزكاة — iXBRL")}</title>
  <style>body{font-family:system-ui,Tahoma,Arial;padding:24px;max-width:860px;margin:auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}th{background:#f5f5f5;text-align:start}h1{font-size:18px}</style>
</head>
<body>
  <div style="display:none">
    <ix:header>
      <ix:references>
        <link:schemaRef xlink:type="simple" xlink:href="${NS.zk}/zakat-taxonomy.xsd"/>
      </ix:references>
      <ix:resources>
        <xbrli:context id="${ctxId}">
          <xbrli:entity><xbrli:identifier scheme="${esc(r.entity.scheme ?? "https://nisab.app/entity")}">${esc(r.entity.identifier)}</xbrli:identifier></xbrli:entity>
          <xbrli:period><xbrli:startDate>${r.period.startDate}</xbrli:startDate><xbrli:endDate>${r.period.endDate}</xbrli:endDate></xbrli:period>
        </xbrli:context>
        <xbrli:unit id="${unitId}"><xbrli:measure>iso4217:${r.currency}</xbrli:measure></xbrli:unit>
      </ix:resources>
    </ix:header>
  </div>
  <h1>${esc(r.title ?? "تقرير الزكاة — iXBRL")}</h1>
  <p><strong>المنشأة:</strong> ${esc(r.entity.name)} (${esc(r.entity.identifier)})</p>
  <p><strong>الفترة:</strong> ${r.period.startDate} → ${r.period.endDate}</p>
  <table>
    <thead><tr><th>المفهوم</th><th style="text-align:end">القيمة</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>`;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
