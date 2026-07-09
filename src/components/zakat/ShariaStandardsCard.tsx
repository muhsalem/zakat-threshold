import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, ShieldAlert, CheckCircle2, FileText, Info } from "lucide-react";
import { SHARIA_STANDARDS, type SectorId } from "@/lib/shariaStandards";

interface Props {
  defaultSector?: SectorId;
}

export function ShariaStandardsCard({ defaultSector = "general" }: Props) {
  const [sectorId, setSectorId] = useState<SectorId>(defaultSector);
  const std = SHARIA_STANDARDS.find((s) => s.id === sectorId)!;

  // group by chapter for selector
  const chapters = Array.from(new Set(SHARIA_STANDARDS.map((s) => s.chapter)));

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          المعايير الشرعية حسب النشاط / القطاع
        </CardTitle>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          مرجع تأصيلي مستمد من المذاهب الأربعة وقرارات المجامع الفقهية ومعايير AAOIFI — للاسترشاد
          ولا يُغني عن هيئة رقابة شرعية مؤهَّلة.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">اختر النشاط / القطاع</label>
          <Select value={sectorId} onValueChange={(v) => setSectorId(v as SectorId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((ch) => (
                <SelectGroup key={ch}>
                  <SelectLabel className="text-[11px] text-muted-foreground">{ch}</SelectLabel>
                  {SHARIA_STANDARDS.filter((s) => s.chapter === ch).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.number}. {s.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground">{std.chapter}</div>
              <div className="text-lg font-bold text-primary">
                المعيار ({std.number}) — {std.title}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              مرجع تأصيلي
            </Badge>
          </div>

          <div className="rounded-md bg-background border p-3 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> النطاق
            </div>
            <p className="text-xs leading-relaxed">{std.scope}</p>
          </div>

          <Accordion type="multiple" defaultValue={["rules", "prohibitions"]} className="space-y-2">
            <AccordionItem value="rules" className="border rounded-md bg-background px-3">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  الأحكام والضوابط ({std.rules.length})
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1.5 text-xs leading-relaxed pr-3">
                  {std.rules.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prohibitions" className="border rounded-md bg-background px-3">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  المحظورات ({std.prohibitions.length})
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1.5 text-xs leading-relaxed pr-3">
                  {std.prohibitions.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-destructive font-bold">✗</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ref" className="border rounded-md bg-background px-3">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  المستند الشرعي
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs leading-relaxed text-muted-foreground">{std.reference}</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {std.note && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span>
                <b>تنبيه — موضع اجتهاد/خلاف:</b> {std.note}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
