import { Wheat } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { CROPS_NISAB_KG } from "@/lib/zakat";
import { NumField } from "@/components/zakat/individual/shared";
import { RikazSection } from "@/components/zakat/RikazSection";

export interface CropsAccordionSectionProps {
  currencyName: string;
  ownsFarmland: boolean;
  setOwnsFarmland: (v: boolean) => void;
  cropsKg: string;
  setCropsKg: (v: string) => void;
  cropsValuePerKg: string;
  setCropsValuePerKg: (v: string) => void;
  cropsIrrigation: "rain" | "irrigated" | "mixed";
  setCropsIrrigation: (v: "rain" | "irrigated" | "mixed") => void;
  cropsCalc: { cropsEligible: boolean; cropsValue: number; cropsRate: number };
  setAgriTradeBase: (v: number) => void;
  cur: (v: number) => string;
}

export function CropsAccordionSection({
  currencyName,
  ownsFarmland,
  setOwnsFarmland,
  cropsKg,
  setCropsKg,
  cropsValuePerKg,
  setCropsValuePerKg,
  cropsIrrigation,
  setCropsIrrigation,
  cropsCalc,
  setAgriTradeBase,
  cur,
}: CropsAccordionSectionProps) {
  return (
    <AccordionItem
      id="section-crops"
      value="crops"
      className="border rounded-xl shadow-soft bg-card px-4"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Wheat className="h-5 w-5 text-gold" /> زكاة الزروع والثمار
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <Label className="text-sm font-semibold">هل تملك أرضاً زراعية؟</Label>
          <Switch checked={ownsFarmland} onCheckedChange={setOwnsFarmland} />
        </div>
        {ownsFarmland && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <NumField
                label="كمية المحصول"
                value={cropsKg}
                onChange={setCropsKg}
                unit="كجم"
                hint={`النصاب: ${CROPS_NISAB_KG} كجم (5 أوسق)`}
              />
              <NumField
                label="سعر الكيلوجرام"
                value={cropsValuePerKg}
                onChange={setCropsValuePerKg}
                unit={currencyName}
              />
            </div>
            <div>
              <Label className="mb-2 block">طريقة الري</Label>
              <RadioGroup
                value={cropsIrrigation}
                onValueChange={(v) => setCropsIrrigation(v as "rain" | "irrigated" | "mixed")}
                className="flex flex-col md:flex-row gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="rain" id="rain" />
                  <Label htmlFor="rain">سُقي بلا كلفة (مطر/أنهار) — 10%</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="irrigated" id="irr" />
                  <Label htmlFor="irr">سُقي بكلفة (آلات/شراء) — 5%</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mixed" id="mixed" />
                  <Label htmlFor="mixed">ري مشترك (نصف/نصف) — 7.5%</Label>
                </div>
              </RadioGroup>
            </div>
            {cropsCalc.cropsEligible && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                قيمة المحصول: <b>{cur(cropsCalc.cropsValue)}</b> — النسبة:{" "}
                <b>{(cropsCalc.cropsRate * 100).toFixed(0)}%</b>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              ملاحظة: الزروع لا تشترط حولًا، وإنما تجب يوم الحصاد.
            </p>
          </>
        )}

        {/* تبويب فرعي: العسل + الثروة السمكية + مزارع الدواجن (تُلحق بالزروع والثمار) */}
        <div className="pt-4 border-t border-dashed">
          <div className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
            <Wheat className="h-4 w-4" /> أنشطة زراعية وحيوانية ملحقة (العسل / الثروة السمكية /
            الدواجن)
          </div>
          <RikazSection
            mode="agri-extras"
            currency={currencyName}
            onTradeBaseChange={setAgriTradeBase}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default CropsAccordionSection;
