import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, CheckCircle2, XCircle } from "lucide-react";
import { useMadhab, type Madhab } from "@/lib/madhabContext";

const OPTIONS: { value: Madhab; label: string; hint: string }[] = [
  {
    value: "aaoifi",
    label: "معيار AAOIFI 35 (الافتراضي)",
    hint: "رأي الجمهور مع ضوابط معايير المحاسبة والمراجعة الإسلامية",
  },
  {
    value: "hanafi",
    label: "المذهب الحنفي",
    hint: "حلي المرأة المستعمل تجب فيه الزكاة، ولا نصاب في الزروع",
  },
  {
    value: "maliki",
    label: "المذهب المالكي",
    hint: "الدَّين المرجوّ يُزكّى عن سنة واحدة عند القبض",
  },
  { value: "shafii", label: "المذهب الشافعي", hint: "لا زكاة في الحلي المعدّ للاستعمال المباح" },
  {
    value: "hanbali",
    label: "المذهب الحنبلي",
    hint: "قريب من الشافعية في أغلب مسائل زكاة الأموال",
  },
];

interface Props {
  compact?: boolean;
}

export default function GlobalMadhabSelector({ compact = false }: Props) {
  const { madhab, setMadhab, rules } = useMadhab();

  const Row = ({ ok, text }: { ok: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{text}</span>
    </div>
  );

  return (
    <Card className="border-primary/30">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="w-5 h-5 text-primary" />
          المرجعية الفقهية للحساب
          <Badge variant="secondary" className="me-auto">
            {rules.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={madhab} onValueChange={(v) => setMadhab(v as Madhab)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!compact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
            <Row ok={rules.jewelryWornZakatable} text="زكاة الحلي المستعمَل" />
            <Row ok={!rules.cropsRequireNisab} text="لا نصاب في الزروع" />
            <Row ok={rules.livestockKhultahAllowed} text="خلط الأنعام يُغيّر النصاب" />
            <Row ok={rules.strongDebtAnnual} text="الدَّين المرجوّ يُزكّى سنوياً" />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          يؤثّر اختيار المرجعية على تصنيف الحلي المستعمَل، نصاب الزروع، الخلط في الأنعام، وحساب
          الديون — دون تغيير النسبة الأساسية 2.5%.
        </p>
      </CardContent>
    </Card>
  );
}
