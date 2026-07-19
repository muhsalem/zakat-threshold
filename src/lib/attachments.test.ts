import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateUpload,
  buildStoragePath,
  uploadAttachment,
  downloadAttachment,
  ATTACHMENT_BUCKET,
  MAX_FILE_BYTES,
} from "./attachments";

const USER = "11111111-1111-1111-1111-111111111111";
const REC = "22222222-2222-2222-2222-222222222222";

function file(overrides: Partial<{ name: string; size: number; type: string }> = {}) {
  return { name: "report.pdf", size: 1024, type: "application/pdf", ...overrides };
}

describe("validateUpload", () => {
  it("يقبل مرفقاً صحيحاً مربوطاً بإقرار زكاة", () => {
    expect(validateUpload({ file: file(), uploaded_by: USER, zakat_record_id: REC })).toBeNull();
  });

  it("يرفض بدون مستخدم", () => {
    expect(validateUpload({ file: file(), uploaded_by: "", zakat_record_id: REC })).toBe("no_user");
  });

  it("يرفض ملفاً فارغاً", () => {
    expect(
      validateUpload({ file: file({ size: 0 }), uploaded_by: USER, zakat_record_id: REC }),
    ).toBe("empty_file");
  });

  it("يرفض تجاوز الحجم الأقصى", () => {
    expect(
      validateUpload({
        file: file({ size: MAX_FILE_BYTES + 1 }),
        uploaded_by: USER,
        zakat_record_id: REC,
      }),
    ).toBe("too_large");
  });

  it("يرفض نوع MIME غير مسموح (exe)", () => {
    expect(
      validateUpload({
        file: file({ type: "application/x-msdownload", name: "x.exe" }),
        uploaded_by: USER,
        zakat_record_id: REC,
      }),
    ).toBe("bad_mime");
  });

  it("يرفض مستندات Office (DOCX/XLSX)", () => {
    expect(
      validateUpload({
        file: file({
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          name: "a.docx",
        }),
        uploaded_by: USER,
        zakat_record_id: REC,
      }),
    ).toBe("bad_mime");
  });

  it("يرفض عدم تطابق الامتداد مع النوع", () => {
    expect(
      validateUpload({
        file: file({ type: "application/pdf", name: "report.txt" }),
        uploaded_by: USER,
        zakat_record_id: REC,
      }),
    ).toBe("bad_ext");
  });

  it("يقبل صور PNG وJPEG وWebP", () => {
    for (const [t, n] of [
      ["image/png", "a.png"],
      ["image/jpeg", "a.jpg"],
      ["image/webp", "a.webp"],
    ] as const) {
      expect(
        validateUpload({
          file: file({ type: t, name: n }),
          uploaded_by: USER,
          zakat_record_id: REC,
        }),
      ).toBeNull();
    }
  });

  it("يرفض اسم ملف يحوي مسارات", () => {
    expect(
      validateUpload({
        file: file({ name: "../report.pdf" }),
        uploaded_by: USER,
        zakat_record_id: REC,
      }),
    ).toBe("bad_name");
  });

  it("يشترط ربط المرفق بـ approval_id أو zakat_record_id", () => {
    expect(validateUpload({ file: file(), uploaded_by: USER })).toBe("no_link");
  });

  it("رسائل الخطأ العربية واضحة", async () => {
    const { validationMessage } = await import("./attachments");
    expect(validationMessage("too_large")).toMatch(/ميجابايت/);
    expect(validationMessage("bad_mime")).toMatch(/PDF|صور/);
    expect(validationMessage(null)).toBeNull();
  });
});

describe("downscaleImage", () => {
  it("يُبقي الملف كما هو خارج المتصفح (بيئة الاختبار)", async () => {
    const { downscaleImage } = await import("./attachments");
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const out = await downscaleImage(blob, "image/png");
    expect(out.resized).toBe(false);
    expect(out.mime).toBe("image/png");
    expect(out.blob).toBe(blob);
  });

  it("يتجاوز الملفات غير الصورية", async () => {
    const { downscaleImage } = await import("./attachments");
    const blob = new Blob([new Uint8Array([1])], { type: "application/pdf" });
    const out = await downscaleImage(blob, "application/pdf");
    expect(out.resized).toBe(false);
    expect(out.blob).toBe(blob);
  });
});

describe("buildStoragePath", () => {
  it("يضع الملف داخل مجلد المستخدم مع تنظيف الاسم", () => {
    const p = buildStoragePath(USER, "تقرير مالي.pdf", new Date("2025-01-01T00:00:00Z"));
    expect(p.startsWith(`${USER}/`)).toBe(true);
    expect(p).toMatch(/\.pdf$/);
    expect(p).not.toMatch(/\s/);
  });
});

// ---------- Mock supabase client ----------
type Row = Record<string, unknown>;
function makeSupabase(
  opts: {
    insertError?: { message: string } | null;
    uploadError?: { message: string } | null;
    signError?: { message: string } | null;
    captured?: { table?: string; row?: Row; uploads?: string[]; removes?: string[] };
  } = {},
) {
  const captured = opts.captured ?? {};
  captured.uploads = [];
  captured.removes = [];

  const supabase = {
    from(table: string) {
      return {
        insert(row: Row) {
          captured.table = table;
          captured.row = row;
          const err = opts.insertError ?? null;
          return {
            select() {
              return {
                single: async () =>
                  err
                    ? { data: null, error: err }
                    : {
                        data: { id: "att-1", storage_path: (row as Row).storage_path },
                        error: null,
                      },
              };
            },
            // used by download log (no .select().single())
            then: (resolve: (v: { error: unknown }) => void) => resolve({ error: err }),
          };
        },
      };
    },
    storage: {
      from(_bucket: string) {
        return {
          async upload(path: string, _body: unknown) {
            captured.uploads!.push(path);
            return { error: opts.uploadError ?? null, data: opts.uploadError ? null : { path } };
          },
          async remove(paths: string[]) {
            captured.removes!.push(...paths);
            return { error: null, data: null };
          },
          async createSignedUrl(path: string, _sec: number) {
            return opts.signError
              ? { data: null, error: opts.signError }
              : { data: { signedUrl: `https://x/${path}?sig=abc` }, error: null };
          },
        };
      },
    },
  };
  return {
    supabase: supabase as unknown as import("@supabase/supabase-js").SupabaseClient,
    captured,
  };
}

describe("uploadAttachment", () => {
  it("يرفع الملف ثم ينشئ صفّاً في approval_attachments مربوطاً بالإقرار", async () => {
    const { supabase, captured } = makeSupabase();
    const res = await uploadAttachment(supabase, {
      file: file(),
      fileBody: new Uint8Array([1, 2, 3]),
      uploaded_by: USER,
      zakat_record_id: REC,
    });
    expect(res.id).toBe("att-1");
    expect(captured.table).toBe("approval_attachments");
    expect(captured.row).toMatchObject({
      uploaded_by: USER,
      zakat_record_id: REC,
      file_name: "report.pdf",
      status: "draft",
      category: "other",
    });
    expect(captured.uploads).toHaveLength(1);
  });

  it("يحذف الملف من التخزين إذا فشل الإدراج بسبب RLS", async () => {
    const { supabase, captured } = makeSupabase({
      insertError: { message: "new row violates row-level security policy" },
    });
    await expect(
      uploadAttachment(supabase, {
        file: file(),
        fileBody: new Uint8Array([1]),
        uploaded_by: USER,
        zakat_record_id: REC,
      }),
    ).rejects.toBeTruthy();
    expect(captured.removes).toHaveLength(1);
  });

  it("يرفض قبل الرفع إذا لم يُحدَّد رابط", async () => {
    const { supabase, captured } = makeSupabase();
    await expect(
      uploadAttachment(supabase, {
        file: file(),
        fileBody: new Uint8Array([1]),
        uploaded_by: USER,
      }),
    ).rejects.toThrow(/no_link/);
    expect(captured.uploads).toHaveLength(0);
  });
});

describe("downloadAttachment", () => {
  it("يعيد رابطاً موقّتاً ويسجّل التنزيل في attachment_download_log", async () => {
    const { supabase, captured } = makeSupabase();
    const res = await downloadAttachment(supabase, "att-1", `${USER}/a.pdf`, USER, {
      user_agent: "vitest",
      ip: "127.0.0.1",
    });
    expect(res.url).toContain("sig=abc");
    expect(captured.table).toBe("attachment_download_log");
    expect(captured.row).toMatchObject({
      attachment_id: "att-1",
      downloaded_by: USER,
      user_agent: "vitest",
      ip: "127.0.0.1",
    });
  });

  it("يفشل إذا رفض التخزين توقيع الرابط (لا وصول)", async () => {
    const { supabase } = makeSupabase({ signError: { message: "not authorized" } });
    await expect(downloadAttachment(supabase, "att-1", "x/y.pdf", USER)).rejects.toBeTruthy();
  });

  it("يفشل إذا رفضت RLS إدراج سجل التنزيل", async () => {
    const { supabase } = makeSupabase({
      insertError: { message: "new row violates row-level security policy" },
    });
    await expect(downloadAttachment(supabase, "att-1", "x/y.pdf", USER)).rejects.toBeTruthy();
  });
});

describe("ثوابت التكامل", () => {
  it("اسم المخزن يطابق المخزن المُنشأ", () => {
    expect(ATTACHMENT_BUCKET).toBe("approval-attachments");
  });
});
