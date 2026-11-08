import { safeSourceUrl, type ZakatSource } from "./zakat-questions";

export type VerifiedSource = {
  id: string;
  authority: string;
  country: string;
  url: string;
  source_kind: string;
  verified_excerpt: string | null;
  verified_at: string | null;
  published_on: string | null;
};
export function verifiedZakatSources(rows: VerifiedSource[]): ZakatSource[] {
  return rows
    .filter((row) => row.verified_at && row.verified_excerpt?.trim() && safeSourceUrl(row.url))
    .map((row) => ({
      id: `official-${row.id}`,
      kind: "official",
      title: `${row.authority}${row.published_on ? ` · ${row.published_on}` : ""}`,
      url: row.url,
      sourceKind:
        row.source_kind === "fatwa"
          ? "fatwa"
          : row.source_kind === "guide"
            ? "official-guide"
            : "announcement",
      publishedOn: row.published_on,
      verifiedAt: row.verified_at,
      excerpt: row.verified_excerpt?.trim() ?? "",
      text: `البلد: ${row.country}. نوع المصدر: ${row.source_kind === "fatwa" ? "فتوى" : row.source_kind === "guide" ? "دليل رسمي للخدمة، ليس فتوى" : "إعلان"}. تاريخ النشر: ${row.published_on ?? "غير محدد باليوم"}؛ تاريخ التحقق: ${row.verified_at}. المقتطف الموثق: ${row.verified_excerpt?.slice(0, 3000)}. ليس قيمة نقدية لنصاب اليوم.`,
    }));
}
