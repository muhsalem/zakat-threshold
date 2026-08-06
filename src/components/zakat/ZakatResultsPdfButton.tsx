/**
 * زر توليد تقرير PDF قابل للطباعة لنتائج زكاة الأفراد والشركات،
 * موثّق بالمصادر (الأسعار وأسعار الصرف والمنهجية) والاستثناءات (البنود المستبعدة وتعليلها).
 */

import { ProfessionalPdfButton } from "./ProfessionalPdfButton";
import { buildZakatReportPayload, type ZakatPdfInput } from "@/lib/pdf/zakatPayload";

export interface ZakatResultsPdfButtonProps {
  input: ZakatPdfInput;
  zakatRecordId?: string | null;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ZakatResultsPdfButton({
  input,
  zakatRecordId = null,
  label = "تقرير PDF موثّق (المصادر والاستثناءات)",
  variant = "outline",
  size = "sm",
}: ZakatResultsPdfButtonProps) {
  const payload = buildZakatReportPayload(input);
  const title =
    input.entity === "company"
      ? `إقرار زكاة شركة — ${input.name || "منشأة"}`
      : `إقرار زكاة فرد — ${input.name || "مُزكِّي"}`;

  return (
    <ProfessionalPdfButton
      kind="declaration"
      title={title}
      payload={payload}
      zakatRecordId={zakatRecordId}
      label={label}
      variant={variant}
      size={size}
    />
  );
}
