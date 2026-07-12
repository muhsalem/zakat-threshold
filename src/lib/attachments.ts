// Attachment upload/download helpers with validation, RLS-aware linkage,
// and download logging. Pure/testable logic separated from React.

import type { SupabaseClient } from "@supabase/supabase-js";

export const ATTACHMENT_BUCKET = "approval-attachments";
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
export const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
] as const;

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
  | "no_link"
  | "bad_name"
  | "no_user";

export function validateUpload(input: UploadInput): ValidationError | null {
  if (!input.uploaded_by) return "no_user";
  if (!input.file || input.file.size <= 0) return "empty_file";
  if (input.file.size > MAX_FILE_BYTES) return "too_large";
  if (!ALLOWED_MIME.includes(input.file.type as (typeof ALLOWED_MIME)[number]))
    return "bad_mime";
  if (!input.file.name || input.file.name.length > 255 || /[\\/]/.test(input.file.name))
    return "bad_name";
  if (!input.approval_id && !input.zakat_record_id) return "no_link";
  return null;
}

export function buildStoragePath(userId: string, fileName: string, now = new Date()): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_");
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${userId}/${stamp}-${safe}`;
}

export async function uploadAttachment(
  supabase: SupabaseClient,
  input: UploadInput & { fileBody: Blob | ArrayBuffer | Uint8Array },
): Promise<{ id: string; storage_path: string }> {
  const err = validateUpload(input);
  if (err) throw new Error(`validation:${err}`);

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
    // best-effort cleanup on RLS/insert failure
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storage_path]).catch(() => {});
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
  const signed = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(storage_path, 60);
  if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("sign_failed");

  // Log the download (RLS enforces the user can reach this attachment)
  const { error } = await supabase.from("attachment_download_log").insert({
    attachment_id: attachmentId,
    downloaded_by: userId,
    ip: meta.ip ?? null,
    user_agent: meta.user_agent ?? null,
  });
  if (error) throw error;

  return { url: signed.data.signedUrl };
}
