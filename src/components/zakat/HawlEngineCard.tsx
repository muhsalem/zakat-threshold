import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarClock, CheckCircle2, Clock, Sparkles } from "lucide-react";
import {
  HAWL_DAYS_HIJRI,
  checkHawl,
  formatHijri,
  generateHawlSchedule,
  gregorianToHijri,
} from "@/lib/zakat";

interface Props {
  startDateISO: string;
  basis?: "hijri" | "gregorian";
  title?: string;
  showSchedule?: boolean;
}

const fmtGreg = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

/**
 * محرك الحول الهجري — يحسب تلقائياً:
 * - تاريخ بلوغ النصاب هجرياً وميلادياً
 * - الأيام المنقضية من الحول الحالي (من أصل 354 هجرياً)
 * - تاريخ اكتمال الحول القادم = سنة التقييم
 * - جدول الدورات السابقة/الحالية/المستقبلية
 */
export function HawlEngineCard({
  startDateISO,
  basis = "hijri",
  title = "محرك الحَوْل الهجري — الحساب التلقائي",
  showSchedule = true,
}: Props) {
  const data = useMemo(() => {
    if (!startDateISO) return null;
    const status = checkHawl(startDateISO);
    if (!status) return null;
    const cycles = generateHawlSchedule(startDateISO, {
      basis,
      pastCycles: 1,
      futureCycles: 1,
    });
    const current = cycles.find((c) => c.status === "current") ?? cycles[0];
    const todayHijri = gregorianToHijri(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate(),
    );
    const assessmentHijri = current ? current.hijriEnd : status.hijriStart;
    return { status, cycles, current, todayHijri, assessmentHijri };
  }, [startDateISO, basis]);

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-xs text-muted-foreground">
          حدّد تاريخ بلوغ النصاب لتفعيل محرك الحول الهجري.
        </CardContent>
      </Card>
    );
  }

  const { status, cycles, current, todayHijri, assessmentHijri } = data;
  const progressPct = Math.min(100, Math.round((status.daysPassed / HAWL_DAYS_HIJRI) * 100));

  return (
    <Card className="border-primary/25 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBox
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            label="بلوغ النصاب"
            hijri={formatHijri(status.hijriStart)}
            greg={fmtGreg(startDateISO)}
          />
          <InfoBox
            icon={<Clock className="h-3.5 w-3.5" />}
            label="اليوم"
            hijri={formatHijri(todayHijri)}
            greg={fmtGreg(new Date().toISOString().slice(0, 10))}
          />
          <InfoBox
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            label="سنة التقييم (نهاية الحول الجاري)"
            hijri={formatHijri(assessmentHijri)}
            greg={current ? fmtGreg(current.endISO) : "—"}
            highlight
          />
          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">مضى من الحول</span>
              <b className="text-foreground">
                {status.daysPassed} / {HAWL_DAYS_HIJRI} يوم
              </b>
            </div>
            <Progress value={progressPct} className="h-1.5" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">المتبقّي</span>
              <Badge variant={status.hawlComplete ? "default" : "secondary"} className="text-[10px]">
                {status.hawlComplete
                  ? "اكتمل الحول — وجبت الزكاة"
                  : `${status.daysRemaining} يوم`}
              </Badge>
            </div>
          </div>
        </div>

        {status.hawlComplete ? (
          <Alert className="border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              اكتمل الحول الهجري (354 يوماً). المدة المحسوبة تلقائياً من{" "}
              <b>{formatHijri(status.hijriStart)}</b> حتى <b>{formatHijri(assessmentHijri)}</b>{" "}
              — وهي سنة التقييم الحالية المعتمدة في هذا التقرير.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-muted">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              أنت داخل الحول الجاري. سنة التقييم المقدَّرة: <b>{formatHijri(assessmentHijri)}</b>.
              يمكن حساب زكاة تقديرية الآن، وتُعتمد رسمياً عند اكتمال الحول.
            </AlertDescription>
          </Alert>
        )}

        {showSchedule && cycles.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground">
              دورات الحول (سابق · جارٍ · قادم)
            </div>
            <div className="grid gap-1.5">
              {cycles.map((c) => (
                <div
                  key={c.index}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-[11px] ${
                    c.status === "current"
                      ? "border-primary/40 bg-primary/5"
                      : c.status === "past"
                        ? "bg-muted/40"
                        : "bg-gold/5"
                  }`}
                >
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-muted-foreground">
                    {formatHijri(c.hijriStart)} → {formatHijri(c.hijriEnd)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.status === "current"
                      ? `${c.progressPct}%`
                      : c.status === "past"
                        ? "مُنقضٍ"
                        : "قادم"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoBox({
  icon,
  label,
  hijri,
  greg,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  hijri: string;
  greg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 space-y-1 ${
        highlight ? "border-primary/40 bg-primary/5" : "bg-muted/20"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold">{hijri}</div>
      <div className="text-[11px] text-muted-foreground">{greg}</div>
    </div>
  );
}

export default HawlEngineCard;
