/**
 * زر توليد تقرير PDF احترافي — يستخدم القالب الافتراضي للنوع المطلوب،
 * يولّد Blob في المتصفح، ينزّله، ويسجّل التقرير في `pdf_reports`.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  createPdfReport,
  getDefaultTemplate,
  makeDefaultConfig,
} from "@/lib/pdf/reports.functions";
import { generateReportBlob, computeContentHash } from "@/lib/pdf/engine";
import type { ReportPayload, TemplateKind } from "@/lib/pdf/types";

export interface ProfessionalPdfButtonProps {
  zakatRecordId?: string | null;
  kind: TemplateKind;
  title: string;
  payload: Omit<ReportPayload, "content_hash" | "version" | "report_uid" | "verify_token" | "kind" | "title" | "issued_at" | "issuer_name">;
  issuerName?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function ProfessionalPdfButton({
  zakatRecordId,
  kind,
  title,
  payload,
  issuerName = "نِصاب — منصة الزكاة",
  label = "تقرير PDF احترافي",
  variant = "default",
  size = "sm",
}: ProfessionalPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const getDefault = useServerFn(getDefaultTemplate);
  const createReport = useServerFn(createPdfReport);

  async function handleClick() {
    setLoading(true);
    try {
      const tpl = await getDefault({ data: { kind } });
      const config = makeDefaultConfig(
        tpl ? ((tpl as { config: unknown }).config as Record<string, unknown>) : {},
      );

      // 1) create DB row first to obtain report_uid + version
      const snapshotForHash = { title, kind, payload, issuedAt: new Date().toISOString() };
      const contentHash = await computeContentHash(snapshotForHash);
      const inserted = await createReport({
        data: {
          zakat_record_id: zakatRecordId ?? null,
          template_id: tpl ? (tpl as { id: string }).id : null,
          kind,
          title,
          snapshot: snapshotForHash as unknown as Record<string, unknown>,
          content_hash: contentHash,
        },
      });
      const reportUid = (inserted as { report_uid: string }).report_uid;
      const verifyToken = (inserted as unknown as { verify_token: string }).verify_token;
      const version = (inserted as { version: number }).version;

      // 2) generate PDF
      const fullPayload: ReportPayload = {
        report_uid: reportUid,
        verify_token: verifyToken,
        kind,
        title,
        issued_at: new Date().toISOString(),
        issuer_name: issuerName,
        content_hash: contentHash,
        version,
        ...payload,
      };
      const blob = await generateReportBlob(fullPayload, config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportUid}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`تم إنشاء التقرير ${reportUid}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`فشل التوليد: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant={variant} size={size}>
      {loading ? (
        <Loader2 className="w-4 h-4 ms-1 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4 ms-1" />
      )}
      {label}
    </Button>
  );
}
