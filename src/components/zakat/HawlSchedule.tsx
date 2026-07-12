import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { generateHawlSchedule, formatHijri, type HawlCycle } from "@/lib/zakat";

interface Props {
  startDateISO: string;
  basis?: "hijri" | "gregorian";
  defaultPast?: number;
  defaultFuture?: number;
}

const fmtGreg = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const statusStyle: Record<HawlCycle["status"], string> = {
  past: "bg-muted text-muted-foreground border-border",
  current: "bg-primary/10 text-primary border-primary/40 ring-1 ring-primary/30",
  future: "bg-gold/5 text-foreground border-gold/30",
};

const statusLabel: Record<HawlCycle["status"], string> = {
  past: "مُنقضٍ",
  current: "الحول الجاري",
  future: "قادم",
};

export function HawlSchedule({
  startDateISO,
  basis = "hijri",
  defaultPast = 2,
  defaultFuture = 3,
}: Props) {
  const [past, setPast] = useState(defaultPast);
  const [future, setFuture] = useState(defaultFuture);

  const cycles = useMemo(
    () => generateHawlSchedule(startDateISO, { pastCycles: past, futureCycles: future, basis }),
    [startDateISO, past, future, basis],
  );

  if (!startDateISO) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          حدّد تاريخ بلوغ النصاب أولاً لعرض جدول دورات الحَوْل التنازلي.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            جدول الحَوْل التنازلي — دورات سابقة ولاحقة
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">تقويم:</span>
            <Badge variant="outline">
              {basis === "hijri" ? "هجري (354 يوماً)" : "ميلادي (365 يوماً)"}
            </Badge>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">دورات سابقة:</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPast((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="w-4 text-center font-semibold">{past}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPast((p) => Math.min(10, p + 1))}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">دورات مستقبلية:</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFuture((f) => Math.max(0, f - 1))}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="w-4 text-center font-semibold">{future}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFuture((f) => Math.min(10, f + 1))}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {cycles.map((c) => (
          <div
            key={c.index}
            className={`rounded-lg border p-3 transition ${statusStyle[c.status]}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={c.status === "current" ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {statusLabel[c.status]}
                </Badge>
                <span className="text-sm font-semibold">{c.label}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                رقم الدورة: <b className="text-foreground">{c.index}</b>
              </div>
            </div>

            <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">البداية:</span>{" "}
                <b>{fmtGreg(c.startISO)}</b>{" "}
                <span className="text-muted-foreground">({formatHijri(c.hijriStart)})</span>
              </div>
              <div>
                <span className="text-muted-foreground">النهاية / وجوب الأداء:</span>{" "}
                <b>{fmtGreg(c.endISO)}</b>{" "}
                <span className="text-muted-foreground">({formatHijri(c.hijriEnd)})</span>
              </div>
            </div>

            {c.status === "current" && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${c.progressPct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    مضى: <b className="text-foreground">{c.daysPassed}</b> يوماً ({c.progressPct}%)
                  </span>
                  <span>
                    متبقٍ: <b className="text-foreground">{c.daysRemaining}</b> يوماً
                  </span>
                </div>
              </div>
            )}

            {c.status === "future" && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                تُحتسب الزكاة عن وعاء هذا الحول عند بلوغ تاريخ النهاية إذا استمرّ النصاب.
              </div>
            )}
            {c.status === "past" && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                إن لم تُؤدَّ زكاته سابقاً فهو دَين في الذمّة يجب قضاؤه بأثر رجعي بأسعار وقته.
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default HawlSchedule;
