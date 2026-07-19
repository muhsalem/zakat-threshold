import { Landmark } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CashBankSection } from "@/components/zakat/CashBankSection";
import RibaPurificationCalc from "@/components/zakat/RibaPurificationCalc";

export interface CashBankAccordionSectionProps {
  countryCode: string;
  currencyName: string;
  onCashTotalChange: (v: number) => void;
}

/**
 * قسم زكاة الأوراق النقدية والحسابات والبطاقات والمحافظ البنكية.
 * مستخرج من IndividualTab للحفاظ على نفس السلوك والـ AccordionItem value="cash".
 */
export function CashBankAccordionSection({
  countryCode,
  currencyName,
  onCashTotalChange,
}: CashBankAccordionSectionProps) {
  return (
    <AccordionItem
      id="section-cash"
      value="cash"
      className="border rounded-xl shadow-soft bg-card px-4"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Landmark className="h-5 w-5 text-primary" /> زكاة الأوراق النقدية والحسابات والبطاقات
          والمحافظ البنكية
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <CashBankSection
          countryCode={countryCode}
          currencyName={currencyName}
          onTotalChange={onCashTotalChange}
        />
        <div className="pt-3 border-t border-dashed">
          <div className="mb-2 text-sm font-semibold text-primary">
            حاسبة تطهير الفوائد الربوية (تُلحق بالنقد والبنوك)
          </div>
          <RibaPurificationCalc currencyName={currencyName} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default CashBankAccordionSection;
