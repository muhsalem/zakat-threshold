import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck2, Info } from "lucide-react";

/**
 * حقل تاريخ موحّد يعرض الميلادي + ما يقابله بالهجري (تقويم أم القرى)
 * مع تأكيد مصدر التحويل (Intl ICU CLDR — Umm al-Qura calendar).
 *
 * يُستخدم لتوحيد عرض التواريخ في:
 * - تاريخ بدء النشاط
 * - تاريخ الاقتناء
 * - تاريخ فتح الحساب/الوديعة
 * - أي تاريخ تجاري/زكوي يتعلق بالحول.
 */
export function toHijri(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** ملاحظة شرعية أو محاسبية اختيارية تُعرض أسفل الحقل */
  hint?: string;
  /** عرض مختصر (سطر واحد) بدل الشبكة */
  compact?: boolean;
  id?: string;
}

export default function HijriDateField({ label, value, onChange, hint, compact, id }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hijri = toHijri(value);

  if (compact) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId} className="text-xs flex items-center gap-1.5">
          <CalendarCheck2 className="h-3.5 w-3.5 text-primary" />
          {label}
        </Label>
        <Input id={fieldId} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="text-[10px] text-muted-foreground flex items-center justify-between gap-2">
          <span>
            هجري: <b className="text-primary">{hijri || "—"}</b>
          </span>
          {hijri && (
            <Badge variant="outline" className="text-[9px]">
              أم القرى
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
      <Label className="block text-sm font-medium flex items-center gap-1.5">
        <CalendarCheck2 className="h-4 w-4 text-primary" />
        {label}
      </Label>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={fieldId} className="text-[11px] text-muted-foreground">
            ميلادي
          </Label>
          <Input
            id={fieldId}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">ما يقابله بالهجري</Label>
          <div className="h-9 flex items-center justify-between rounded-md border bg-background px-3 text-sm font-semibold text-primary">
            <span>{hijri || "—"}</span>
            {hijri && (
              <Badge variant="secondary" className="text-[9px]">
                تقويم أم القرى
              </Badge>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          {hint ? <>{hint} · </> : null}
          مصدر التحويل: <b>Intl ICU CLDR — تقويم أم القرى المعتمد</b>. العبرة شرعاً بالحول الهجري؛
          ويُؤكَّد التحويل تلقائياً عند إدخال التاريخ الميلادي.
        </span>
      </p>
    </div>
  );
}
