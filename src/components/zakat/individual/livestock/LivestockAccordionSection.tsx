import { HelpCircle, Info, Sprout } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { camelZakat, cowZakat, sheepZakat } from "@/lib/zakat";
import { NumField } from "@/components/zakat/individual/shared";

export interface LivestockAccordionSectionProps {
  currencyName: string;
  ownsLivestock: boolean;
  setOwnsLivestock: (v: boolean) => void;
  livestockForTrade: boolean;
  setLivestockForTrade: (v: boolean) => void;
  livestockTradeValue: string;
  setLivestockTradeValue: (v: string) => void;
  camels: string;
  setCamels: (v: string) => void;
  cows: string;
  setCows: (v: string) => void;
  sheep: string;
  setSheep: (v: string) => void;
  livestockCalc: { camelsN: number; cowsN: number; sheepN: number };
}

export function LivestockAccordionSection({
  currencyName,
  ownsLivestock,
  setOwnsLivestock,
  livestockForTrade,
  setLivestockForTrade,
  livestockTradeValue,
  setLivestockTradeValue,
  camels,
  setCamels,
  cows,
  setCows,
  sheep,
  setSheep,
  livestockCalc,
}: LivestockAccordionSectionProps) {
  return (
    <AccordionItem
      id="section-livestock"
      value="livestock"
      className="border rounded-xl shadow-soft bg-card px-4"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Sprout className="h-5 w-5 text-primary" /> زكاة الأنعام (الإبل والبقر والغنم)
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <Label className="text-sm font-semibold">هل تملك مواشي / أنعام سائمة؟</Label>
          <Switch checked={ownsLivestock} onCheckedChange={setOwnsLivestock} />
        </div>
        {ownsLivestock && (
          <>
            <div className="flex items-center justify-between rounded-lg border bg-gold/5 border-gold/30 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">
                    هل هذه الأنعام مُعدّة للتجارة (للبيع)؟
                  </Label>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="متى تُعدّ الأنعام للتجارة؟"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs text-end leading-relaxed bg-card text-card-foreground border shadow-lg"
                      >
                        <div className="space-y-1.5 text-xs">
                          <p>
                            <b>متى تُعدّ الأنعام للتجارة؟</b>
                          </p>
                          <p>
                            إذا اقتنيتها بنية <b>البيع والربح</b> (تربية تجارية، مزارع
                            تسمين، تجارة مواشي) — لا للنسل واللبن والاستهلاك.
                          </p>
                          <p>
                            <b>كيف تُحسب؟</b> تُقوَّم القطيع كاملاً بسعر السوق يوم وجوب
                            الزكاة، ثم 2.5% × القيمة السوقية الإجمالية، وتُضمّ النتيجة
                            لقاعدة عروض التجارة في الإجمالي.
                          </p>
                          <p className="text-muted-foreground">
                            المرجع: AAOIFI رقم 35 / قرار المجمع الفقهي رقم 28.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  إن نعم، تُعامل معاملة <b>عروض التجارة</b> (2.5% من القيمة السوقية)
                  وتُضمّ تلقائياً لقاعدة عروض التجارة — ولا تُحسب عيناً منعاً للازدواج.
                </p>
              </div>
              <Switch checked={livestockForTrade} onCheckedChange={setLivestockForTrade} />
            </div>

            {livestockForTrade ? (
              <>
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    أدخل القيمة السوقية الإجمالية للقطيع (للبيع) — تُحسب 2.5% وتُضمّ
                    لقاعدة عروض التجارة في الإجمالي.
                  </AlertDescription>
                </Alert>
                <NumField
                  label="القيمة السوقية الإجمالية للأنعام (للتجارة)"
                  value={livestockTradeValue}
                  onChange={setLivestockTradeValue}
                  unit={currencyName}
                  hint="بسعر السوق يوم وجوب الزكاة"
                />
              </>
            ) : (
              <>
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    الأنعام السائمة (للنسل واللبن لا للتجارة) تُزكَّى عيناً (لا قيمتها)،
                    ويُشترط بلوغ النصاب وحولان الحول وسومُها (رعيها) أكثر السنة.
                  </AlertDescription>
                </Alert>
                <div className="grid md:grid-cols-3 gap-4">
                  <NumField
                    label="عدد الإبل"
                    value={camels}
                    onChange={setCamels}
                    hint="النصاب: 5"
                  />
                  <NumField
                    label="عدد البقر/الجاموس"
                    value={cows}
                    onChange={setCows}
                    hint="النصاب: 30"
                  />
                  <NumField
                    label="عدد الغنم/المعز"
                    value={sheep}
                    onChange={setSheep}
                    hint="النصاب: 40"
                  />
                </div>
                <div className="space-y-2 text-sm">
                  {livestockCalc.camelsN > 0 && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <b>الإبل ({livestockCalc.camelsN}):</b> {camelZakat(livestockCalc.camelsN)}
                    </div>
                  )}
                  {livestockCalc.cowsN > 0 && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <b>البقر ({livestockCalc.cowsN}):</b> {cowZakat(livestockCalc.cowsN)}
                    </div>
                  )}
                  {livestockCalc.sheepN > 0 && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <b>الغنم ({livestockCalc.sheepN}):</b> {sheepZakat(livestockCalc.sheepN)}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default LivestockAccordionSection;
