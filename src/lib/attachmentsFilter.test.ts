import { describe, it, expect } from "vitest";
import {
  filterAttachments,
  paginate,
  linkedNavTarget,
  type AttachmentFilterRow,
  type AttachmentFilterState,
} from "./attachmentsFilter";

const baseState: AttachmentFilterState = {
  q: "",
  status: "all",
  category: "all",
  from: "",
  to: "",
  link: "all",
};

const mk = (o: Partial<AttachmentFilterRow> & { id: string }): AttachmentFilterRow => ({
  file_name: "file.pdf",
  label: null,
  category: "other",
  status: "draft",
  review_note: null,
  zakat_record_id: null,
  approval_id: null,
  organization_id: null,
  created_at: "2026-01-15T10:00:00Z",
  ...o,
});

const rows: AttachmentFilterRow[] = [
  mk({ id: "a", file_name: "قرار-مجمع.pdf", category: "council_decision", status: "approved", zakat_record_id: "rec1", created_at: "2026-01-10T00:00:00Z" }),
  mk({ id: "b", file_name: "قوائم-مالية.pdf", category: "financial_statement", status: "pending", approval_id: "app1", created_at: "2026-02-05T00:00:00Z" }),
  mk({ id: "c", file_name: "فتوى.pdf", category: "fatwa", status: "rejected", organization_id: "org1", created_at: "2026-03-20T00:00:00Z", review_note: "مرفوض لسبب" }),
  mk({ id: "d", file_name: "audit.pdf", category: "audit", status: "draft", zakat_record_id: "rec2", created_at: "2026-04-01T00:00:00Z" }),
];

const linked = { rec1: { record_type: "company" }, rec2: { record_type: "trade" } };

describe("filterAttachments", () => {
  it("returns all rows with default state", () => {
    expect(filterAttachments(rows, linked, baseState).map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("filters by status", () => {
    const out = filterAttachments(rows, linked, { ...baseState, status: "approved" });
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("filters by category", () => {
    const out = filterAttachments(rows, linked, { ...baseState, category: "fatwa" });
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });

  it("filters by upload date range (inclusive)", () => {
    const out = filterAttachments(rows, linked, {
      ...baseState,
      from: "2026-02-01",
      to: "2026-03-31",
    });
    expect(out.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("filters by link type: zakat", () => {
    const out = filterAttachments(rows, linked, { ...baseState, link: "zakat" });
    expect(out.map((r) => r.id)).toEqual(["a", "d"]);
  });

  it("filters by link type: approval", () => {
    const out = filterAttachments(rows, linked, { ...baseState, link: "approval" });
    expect(out.map((r) => r.id)).toEqual(["b"]);
  });

  it("filters by link type: organization", () => {
    const out = filterAttachments(rows, linked, { ...baseState, link: "org" });
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });

  it("searches within file name (Arabic)", () => {
    const out = filterAttachments(rows, linked, { ...baseState, q: "قرار" });
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("searches within review note", () => {
    const out = filterAttachments(rows, linked, { ...baseState, q: "مرفوض لسبب" });
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });

  it("searches by linked record_type via join map", () => {
    const out = filterAttachments(rows, linked, { ...baseState, q: "trade" });
    expect(out.map((r) => r.id)).toEqual(["d"]);
  });

  it("combines multiple filters (AND)", () => {
    const out = filterAttachments(rows, linked, {
      ...baseState,
      status: "draft",
      link: "zakat",
      from: "2026-03-15",
    });
    expect(out.map((r) => r.id)).toEqual(["d"]);
  });

  it("returns empty when no rows match", () => {
    const out = filterAttachments(rows, linked, { ...baseState, q: "لا-يوجد" });
    expect(out).toEqual([]);
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 23 }, (_, i) => ({ id: `r${i}` }));
  it("slices first page", () => {
    const { pageRows, totalPages, currentPage } = paginate(list, 1, 10);
    expect(pageRows.length).toBe(10);
    expect(totalPages).toBe(3);
    expect(currentPage).toBe(1);
  });
  it("returns last partial page", () => {
    const { pageRows, currentPage } = paginate(list, 3, 10);
    expect(pageRows.length).toBe(3);
    expect(currentPage).toBe(3);
  });
  it("clamps out-of-range page", () => {
    const { currentPage } = paginate(list, 99, 10);
    expect(currentPage).toBe(3);
  });
  it("handles empty list", () => {
    const { pageRows, totalPages, currentPage } = paginate([], 1, 10);
    expect(pageRows).toEqual([]);
    expect(totalPages).toBe(1);
    expect(currentPage).toBe(1);
  });
});

describe("linkedNavTarget", () => {
  it("returns typed zakat-case route when zakat_record_id present", () => {
    expect(linkedNavTarget({ zakat_record_id: "rec-42" })).toEqual({
      to: "/zakat-case/$recordId",
      params: { recordId: "rec-42" },
    });
  });
  it("returns null when no linked zakat record", () => {
    expect(linkedNavTarget({ zakat_record_id: null })).toBeNull();
  });
});
