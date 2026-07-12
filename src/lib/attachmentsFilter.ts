export type AttachmentFilterRow = {
  id: string;
  file_name: string;
  label: string | null;
  category: string;
  status: "draft" | "pending" | "approved" | "rejected";
  review_note: string | null;
  zakat_record_id: string | null;
  approval_id: string | null;
  organization_id: string | null;
  created_at: string;
};

export type AttachmentLinkedInfo = { record_type?: string };

export type AttachmentFilterState = {
  q: string;
  status: string; // "all" | status
  category: string; // "all" | category key
  from: string; // yyyy-mm-dd or ""
  to: string; // yyyy-mm-dd or ""
  link: string; // "all" | "zakat" | "approval" | "org"
};

export function filterAttachments<T extends AttachmentFilterRow>(
  rows: T[],
  linked: Record<string, AttachmentLinkedInfo>,
  search: AttachmentFilterState,
): T[] {
  const q = search.q.trim().toLowerCase();
  const fromTs = search.from ? new Date(search.from).getTime() : null;
  const toTs = search.to ? new Date(search.to).getTime() + 24 * 3600 * 1000 - 1 : null;
  return rows.filter((r) => {
    if (search.status !== "all" && r.status !== search.status) return false;
    if (search.category !== "all" && r.category !== search.category) return false;
    if (search.link === "zakat" && !r.zakat_record_id) return false;
    if (search.link === "approval" && !r.approval_id) return false;
    if (search.link === "org" && !r.organization_id) return false;
    const t = new Date(r.created_at).getTime();
    if (fromTs != null && t < fromTs) return false;
    if (toTs != null && t > toTs) return false;
    if (q) {
      const hay = [
        r.file_name,
        r.label ?? "",
        r.category,
        r.review_note ?? "",
        r.zakat_record_id ?? "",
        r.approval_id ?? "",
        linked[r.zakat_record_id ?? ""]?.record_type ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * size;
  return { pageRows: rows.slice(start, start + size), totalPages, currentPage: current, pageStart: start };
}

/** Route target for the "linked" column click. */
export function linkedNavTarget(row: {
  zakat_record_id: string | null;
}): { to: "/zakat-case/$recordId"; params: { recordId: string } } | null {
  if (!row.zakat_record_id) return null;
  return { to: "/zakat-case/$recordId", params: { recordId: row.zakat_record_id } };
}
