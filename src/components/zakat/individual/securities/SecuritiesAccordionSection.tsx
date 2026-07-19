import type { ComponentProps } from "react";
import { TrendingUp } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SecuritiesSection } from "@/components/zakat/SecuritiesSection";
import { EsopZakatSection } from "@/components/zakat/EsopZakatSection";

type EsopOnChange = NonNullable<ComponentProps<typeof EsopZakatSection>["onChange"]>;

export interface SecuritiesAccordionSectionProps {
  currencyName: string;
  onSecuritiesTotalChange: (v: number) => void;
  onEsopChange: EsopOnChange;
}

/**
 * قسم زكاة الأوراق المالية والاستثمارات (يشمل ESOP/RSU).
 * مستخرج من IndividualTab بدون تغيير سلوكي — نفس value="securities".
 */
export function SecuritiesAccordionSection({
  currencyName,
  onSecuritiesTotalChange,
  onEsopChange,
}: SecuritiesAccordionSectionProps) {
  return (
    <AccordionItem
      id="section-securities"
      value="securities"
      className="border rounded-xl shadow-soft bg-card px-4"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-5 w-5 text-primary" /> زكاة الأوراق المالية ووثائق التأمين
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <SecuritiesSection currencyName={currencyName} onTotalChange={onSecuritiesTotalChange} />
        <EsopZakatSection currencyName={currencyName} onChange={onEsopChange} />
      </AccordionContent>
    </AccordionItem>
  );
}

export default SecuritiesAccordionSection;
