/**
 * ShariaComplianceReport — عرض نتيجة المراجعة الشرعية الشاملة
 * (الشرعية · الامتثال للمعايير · الحوكمة) بدرجة امتثال ونتائج مرجعية.
 */
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Scale,
  BookOpenCheck,
  Landmark,
} from "lucide-react";
import type {
  ShariaReviewResult,
  ShariaFinding,
  FindingDimension,
  FindingSeverity,
} from "@/lib/shariaAudit";

const DIMENSION_META: Record<FindingDimension, { label: string; icon: typeof Scale }> = {
  sharia: { label: "المراجعة الشرعية", icon: Scale },
  compliance: { label: "الامتثال للمعايير", icon: BookOpenCheck },
  governance: { label: "الحوكمة وسلامة البيانات", icon: Landmark },
};

const SEVERITY_META: Record<
  FindingSeverity,
  { label: string; icon: typeof CheckCircle2; cls: string }
> = {
  pass: { label: "مطابق", icon: CheckCircle2, cls: "text-success" },
  info: { label: "ملاحظة", icon: Info, cls: "text-sky-600" },
  warning: { label: "تنبيه", icon: AlertTriangle, cls: "text-warning" },
  violation: { label: "مخالفة", icon: XCircle, cls: "text-destructive" },
};

function FindingRow({ f }: { f: ShariaFinding }) {
  const sev = SEVERITY_META[f.severity];
  const Icon = sev.icon;
  return (
    <div className="rounded border p-2 text-[11px] leading-relaxed">
      <div className="flex items-center gap-1.5 font-semibold">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${sev.cls}`} />
        <span>{f.title}</span>
        <Badge variant="outline" className={`mr-auto text-[9px] ${sev.cls}`}>
          {sev.label}
        </Badge>
      </div>
      <p className="mt-1 text-muted-foreground">{f.detail}</p>
      {f.accounts && f.accounts.length > 0 && (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          الحسابات: {f.accounts.join(" · ")}
        </p>
      )}
      <p className="mt-1 text-[10px] text-primary/80">📖 {f.reference}</p>
    </div>
  );
}

export function ShariaComplianceReport({ review }: { review: ShariaReviewResult }) {
  const ok = review.counts.violation === 0;
  const ShieldIcon = ok ? ShieldCheck : ShieldAlert;
  const dims = Object.keys(DIMENSION_META) as FindingDimension[];

  return (
    <div className="space-y-3" dir="rtl">
      <div
        className={`flex items-center gap-3 rounded-lg border p-3 ${ok ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}
      >
        <ShieldIcon className={`h-8 w-8 ${ok ? "text-success" : "text-destructive"}`} />
        <div className="flex-1">
          <div className="text-sm font-bold">المراجعة الشرعية الشاملة — {review.grade}</div>
          <div className="text-[11px] text-muted-foreground">
            وفق {review.standard} · {review.counts.pass} مطابق · {review.counts.warning} تنبيه ·{" "}
            {review.counts.violation} مخالفة
          </div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-black tabular-nums ${ok ? "text-success" : "text-destructive"}`}
          >
            {review.score}
          </div>
          <div className="text-[9px] text-muted-foreground">درجة الامتثال</div>
        </div>
      </div>

      {dims.map((d) => {
        const items = review.findings.filter((f) => f.dimension === d);
        if (!items.length) return null;
        const meta = DIMENSION_META[d];
        const DimIcon = meta.icon;
        return (
          <div key={d} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <DimIcon className="h-3.5 w-3.5" />
              {meta.label}
            </div>
            {items.map((f) => (
              <FindingRow key={f.id} f={f} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default ShariaComplianceReport;
