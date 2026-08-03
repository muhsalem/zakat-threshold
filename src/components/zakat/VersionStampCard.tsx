import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import {
  createVersionStamp,
  checkReproducibility,
  formatVersionFooter,
  type PriceSnapshot,
  type VersionStamp,
} from "@/lib/zakat/version-freeze";

export interface VersionStampCardProps {
  /** بصمة محفوظة مع التقرير — إن غابت تُنشأ بصمة للبيئة الحالية */
  stamp?: VersionStamp;
  methodologyVersion?: string;
  priceSnapshots?: PriceSnapshot[];
  frozenAt?: string;
}

export function VersionStampCard({
  stamp,
  methodologyVersion = "1.0.0",
  priceSnapshots,
  frozenAt,
}: VersionStampCardProps) {
  const effective = useMemo(
    () => stamp ?? createVersionStamp({ methodologyVersion, priceSnapshots, frozenAt }),
    [stamp, methodologyVersion, priceSnapshots, frozenAt],
  );
  const check = useMemo(() => checkReproducibility(effective), [effective]);

  return (
    <Card className="border-primary/20 shadow-soft" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-primary" />
          تجميد إصدارات الحساب
          <Badge variant={check.reproducible ? "outline" : "destructive"} className="text-[10px]">
            {check.reproducible ? "قابل لإعادة الإنتاج" : "إصدارات سابقة"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <Alert
          className={
            check.reproducible
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }
        >
          <AlertDescription className="leading-relaxed">{check.message}</AlertDescription>
        </Alert>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="كتالوج القواعد" value={effective.rulesVersion} />
          <Field label="محرك الحساب" value={effective.engineVersion} />
          <Field label="محرك التقارير" value={effective.reportEngineVersion} />
          <Field label="المنهجية" value={effective.methodologyVersion} />
          <Field label="لقطة الأسعار" value={effective.priceVersion} />
          <Field
            label="لحظة التجميد"
            value={new Date(effective.frozenAt).toLocaleString("ar-EG")}
          />
        </div>

        {check.drift.length > 0 && (
          <ul className="space-y-1 rounded-md border border-amber-500/30 p-2 text-[11px]">
            {check.drift.map((d) => (
              <li key={d.field} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{d.field}</span>
                <span>
                  {d.archived} → {d.current}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t pt-2 text-[11px] text-muted-foreground">
          {formatVersionFooter(effective)}
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-md border p-2">
      <span className="text-muted-foreground">{label}</span>
      <b className="truncate ps-2 text-end">{value}</b>
    </div>
  );
}

export default VersionStampCard;
