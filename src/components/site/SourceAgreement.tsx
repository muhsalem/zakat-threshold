import { ShieldAlert, ShieldCheck } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { PriceConsensus } from "@/lib/prices.functions";

const COPY = {
  ar: {
    agree: (n: number, pct: string) => `تتفق ${n} مصادر مستقلة على سعر المعدن (فارق ${pct}٪).`,
    warn: (pct: string) => `المصادر متقاربة لكن بفارق ${pct}٪، فقد يختلف السعر قليلًا عن السوق.`,
    diverged: (pct: string) =>
      `المصادر متباعدة (${pct}٪) ولا يمكن تأكيد السعر؛ استخدمه بحذر وراجع سعر الصاغة.`,
    single: "مصدر واحد متاح الآن للسعر؛ لم يُتحقق منه بمصدر ثانٍ.",
  },
  en: {
    agree: (n: number, pct: string) =>
      `${n} independent sources agree on the metal price (gap ${pct}%).`,
    warn: (pct: string) =>
      `Sources are close but differ by ${pct}%, so the price may sit slightly off the market.`,
    diverged: (pct: string) =>
      `Sources disagree (${pct}%) and the price cannot be confirmed; use it with care and check your jeweller.`,
    single: "Only one price source is available right now; it was not cross-checked.",
  },
};

/** Tells visitors whether the metal price was cross-checked between independent sources. */
export function SourceAgreement({ consensus }: { consensus: PriceConsensus | undefined }) {
  const { lang } = useI18n();
  if (!consensus) return null;
  const copy = lang === "ar" ? COPY.ar : COPY.en;
  const pct = consensus.deviationPct.toFixed(1);
  const bad = consensus.status === "diverged" || consensus.status === "warn";
  const Icon = bad ? ShieldAlert : ShieldCheck;
  const text =
    consensus.status === "agree"
      ? copy.agree(consensus.sources.length, pct)
      : consensus.status === "warn"
        ? copy.warn(pct)
        : consensus.status === "diverged"
          ? copy.diverged(pct)
          : copy.single;
  return (
    <p
      role="status"
      className={`mt-2 flex items-start gap-2 text-xs leading-6 ${bad ? "text-negative" : "text-muted-foreground"}`}
    >
      <Icon aria-hidden="true" className="mt-1 size-3.5 shrink-0" />
      {text}
    </p>
  );
}
