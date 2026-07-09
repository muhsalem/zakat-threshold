import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "node:crypto";

type Input = {
  zakatRecordId?: string;
  title: string;
  attestorName: string;
  attestorLicense?: string;
  opinion: string;
  shariaRefs: string[];
  payload: Record<string, unknown>; // المدخلات/المخرجات التي يُحسَب عليها الـhash
};

/** ينشئ شهادة اعتماد شرعي ببصمة محتوى SHA-256 قابلة للتحقق. */
export const createAttestation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (!d?.title || !d?.attestorName || !d?.opinion) throw new Error("بيانات الشهادة ناقصة");
    if (!Array.isArray(d?.shariaRefs)) throw new Error("المراجع الشرعية مطلوبة");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const canonical = JSON.stringify({
      t: data.title,
      a: data.attestorName,
      l: data.attestorLicense ?? null,
      o: data.opinion,
      r: data.shariaRefs,
      p: data.payload,
    });
    const hash = createHash("sha256").update(canonical).digest("hex");

    const { data: row, error } = await ctx.supabase
      .from("sharia_attestations")
      .insert({
        user_id: ctx.userId,
        zakat_record_id: data.zakatRecordId ?? null,
        title: data.title,
        attestor_name: data.attestorName,
        attestor_license: data.attestorLicense ?? null,
        opinion: data.opinion,
        sharia_refs: data.shariaRefs,
        content_hash: hash,
      })
      .select("id, content_hash, issued_at")
      .single();
    if (error) throw new Error(error.message);

    await ctx.supabase.from("sharia_audit_log").insert({
      user_id: ctx.userId,
      action: "attestation_created",
      fingerprint: hash,
      sharia_refs: data.shariaRefs,
    });
    return row as { id: string; content_hash: string; issued_at: string };
  });

/** يجلب شهادة برقمها (لصاحبها أو لمدير/مدقّق). */
export const getAttestation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("invalid id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { data: row, error } = await ctx.supabase
      .from("sharia_attestations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** يجلب شهادات المستخدم الحالي. */
export const listMyAttestations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as any;
    const { data, error } = await ctx.supabase
      .from("sharia_attestations")
      .select("id, title, attestor_name, content_hash, issued_at")
      .order("issued_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
