// Attachment upload/download helpers with strict validation (PDF + images only),
// safe client-side image downscaling, and download logging.

import type { SupabaseClient } from "@supabase/supabase-js";

export const ATTACHMENT_BUCKET = "approval-attachments";
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_IMAGE_DIM = 2000; // px — longest edge after downscaling
export const IMAGE_QUALITY = 0.85; // JPEG/WebP quality when re-encoding

export const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;

export type AttachmentStatus = "draft" | "pending" | "approved" | "rejected";

export interface AttachmentLink {
  approval_id?: string | null;
  zakat_record_id?: string | null;
  organization_id?: string | null;
}

export interface UploadInput extends AttachmentLink {
  file: { name: string; size: number; type: string };
  uploaded_by: string;
  category?: string;
  label?: string | null;
}

export type ValidationError =
  | "empty_file"
  | "too_large"
  | "bad_mime"
  | "bad_ext"
  | "no_link"
  | "bad_name"
  | "no_user";

export const VALIDATION_MESSAGES: Record<ValidationError, string> = {
  no_user: "يجب تسجيل الدخول قبل رفع المرفق.",
  empty_file: "الملف فارغ أو غير قابل للقراءة.",
  too_large: `حجم الملف يتجاوز الحد الأقصى ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} ميجابايت.`,
  bad_mime: "نوع الملف غير مدعوم. يُسمح فقط بـ PDF أو صور (PNG/JPG/WebP).",
  bad_ext: "امتداد الملف غير مسموح. استخدم .pdf أو .png أو .jpg أو .webp.",
  no_link: "يجب ربط المرفق بإقرار زكاة أو طلب اعتماد.",
  bad_name: "اسم الملف غير صالح — تجنّب الرموز الخاصة والمسارات.",
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

export function validateUpload(input: UploadInput): ValidationError | null {
  if (!input.uploaded_by) return "no_user";
  if (!input.file || input.file.size <= 0) return "empty_file";
  if (input.file.size > MAX_FILE_BYTES) return "too_large";
  if (!ALLOWED_MIME.includes(input.file.type as AllowedMime)) return "bad_mime";
  if (!ALLOWED_EXT.includes(extOf(input.file.name) as (typeof ALLOWED_EXT)[number]))
    return "bad_ext";
  // eslint-disable-next-line no-control-regex -- منع أحرف التحكم في أسماء الملفات (فحص أمني مقصود)
  if (!input.file.name || input.file.name.length > 255 || /[\\/\x00-\x1f]/.test(input.file.name))
    return "bad_name";
  if (!input.approval_id && !input.zakat_record_id) return "no_link";
  return null;
}

export function validationMessage(err: ValidationError | null): string | null {
  return err ? VALIDATION_MESSAGES[err] : null;
}

export function buildStoragePath(userId: string, fileName: string, now = new Date()): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${userId}/${stamp}-${safe}`;
}

/**
 * Downscale an image blob if either dimension exceeds MAX_IMAGE_DIM.
 * Re-encodes to JPEG (or keeps PNG for transparency). Returns the original
 * blob when the image is already within bounds or when running outside the
 * browser (no `document`/`createImageBitmap`).
 */
export async function downscaleImage(
  file: Blob,
  mime: string,
  maxDim = MAX_IMAGE_DIM,
  quality = IMAGE_QUALITY,
): Promise<{ blob: Blob; mime: string; resized: boolean }> {
  if (!mime.startsWith("image/") || mime === "image/gif") {
    return { blob: file, mime, resized: false };
  }
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return { blob: file, mime, resized: false };
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, mime, resized: false };
  const { width, height } = bitmap;
  if (Math.max(width, height) <= maxDim) {
    bitmap.close?.();
    return { blob: file, mime, resized: false };
  }
  const scale = maxDim / Math.max(width, height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return { blob: file, mime, resized: false };
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const outMime = mime === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outMime, quality),
  );
  if (!blob) return { blob: file, mime, resized: false };
  return { blob, mime: outMime, resized: true };
}

export async function uploadAttachment(
  supabase: SupabaseClient,
  input: UploadInput & { fileBody: Blob | ArrayBuffer | Uint8Array },
): Promise<{ id: string; storage_path: string }> {
  const err = validateUpload(input);
  if (err) throw new Error(`validation:${err}:${VALIDATION_MESSAGES[err]}`);

  const storage_path = buildStoragePath(input.uploaded_by, input.file.name);
  const up = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storage_path, input.fileBody as Blob, {
      contentType: input.file.type,
      upsert: false,
    });
  if (up.error) throw up.error;

  const { data, error } = await supabase
    .from("approval_attachments")
    .insert({
      approval_id: input.approval_id ?? null,
      zakat_record_id: input.zakat_record_id ?? null,
      organization_id: input.organization_id ?? null,
      uploaded_by: input.uploaded_by,
      storage_path,
      file_name: input.file.name,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      category: input.category ?? "other",
      label: input.label ?? null,
      status: "draft" as AttachmentStatus,
    })
    .select("id, storage_path")
    .single();

  if (error || !data) {
    await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([storage_path])
      .catch(() => {});
    throw error ?? new Error("insert_failed");
  }
  return data as { id: string; storage_path: string };
}

export async function downloadAttachment(
  supabase: SupabaseClient,
  attachmentId: string,
  storage_path: string,
  userId: string,
  meta: { user_agent?: string; ip?: string } = {},
): Promise<{ url: string }> {
  const signed = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(storage_path, 60);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("sign_failed");

  const { error } = await supabase.from("attachment_download_log").insert({
    attachment_id: attachmentId,
    downloaded_by: userId,
    ip: meta.ip ?? null,
    user_agent: meta.user_agent ?? null,
  });
  if (error) throw error;

  return { url: signed.data.signedUrl };
}
