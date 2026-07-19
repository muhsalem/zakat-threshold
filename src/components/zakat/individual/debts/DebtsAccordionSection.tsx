import { Info, MinusCircle } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NumField } from "@/components/zakat/individual/shared";

export type DeferredPolicy = "yearly" | "full" | "none";

export interface DebtsAccordionSectionProps {
  currencyName: string;
  debtPersonalLoan: string;
  setDebtPersonalLoan: (v: string) => void;
  debtBankLoan: string;
  setDebtBankLoan: (v: string) => void;
  debtConsumerFinance: string;
  setDebtConsumerFinance: (v: string) => void;
  debtCarInstall: string;
  setDebtCarInstall: (v: string) => void;
  debtTradePayable: string;
  setDebtTradePayable: (v: string) => void;
  debtPurchases: string;
  setDebtPurchases: (v: string) => void;
  debtDeferredPolicy: DeferredPolicy;
  setDebtDeferredPolicy: (v: DeferredPolicy) => void;
  debtMortgage: string;
  setDebtMortgage: (v: string) => void;
  debtMahr: string;
  setDebtMahr: (v: string) => void;
  debtDeferredYearly: string;
  setDebtDeferredYearly: (v: string) => void;
  debtAlimony: string;
  setDebtAlimony: (v: string) => void;
  expenses: string;
  setExpenses: (v: string) => void;
}

export function DebtsAccordionSection({
  currencyName,
  debtPersonalLoan,
  setDebtPersonalLoan,
  debtBankLoan,
  setDebtBankLoan,
  debtConsumerFinance,
  setDebtConsumerFinance,
  debtCarInstall,
  setDebtCarInstall,
  debtTradePayable,
  setDebtTradePayable,
  debtPurchases,
  setDebtPurchases,
  debtDeferredPolicy,
  setDebtDeferredPolicy,
  debtMortgage,
  setDebtMortgage,
  debtMahr,
  setDebtMahr,
  debtDeferredYearly,
  setDebtDeferredYearly,
  debtAlimony,
  setDebtAlimony,
  expenses,
  setExpenses,
}: DebtsAccordionSectionProps) {
  return (
    <AccordionItem
      id="section-debts"
      value="debts"
      className="border rounded-xl shadow-soft bg-card px-4"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-2 text-base font-semibold">
          <MinusCircle className="h-5 w-5 text-destructive" /> الديون والالتزامات (تُخصم)
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pb-4">
        {/* ① الديون الحالة */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="text-sm font-semibold text-destructive flex items-center gap-2">
            <Badge className="bg-destructive text-destructive-foreground">①</Badge>
            الديون الحالة (واجبة السداد الآن) — تُخصم باتفاق الفقهاء
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <NumField
              label="قروض شخصية"
              value={debtPersonalLoan}
              onChange={setDebtPersonalLoan}
              unit={currencyName}
            />
            <NumField
              label="ديون مصرفية"
              value={debtBankLoan}
              onChange={setDebtBankLoan}
              unit={currencyName}
              hint="أصل الدين دون الفوائد الربوية"
            />
            <NumField
              label="تمويل استهلاكي"
              value={debtConsumerFinance}
              onChange={setDebtConsumerFinance}
              unit={currencyName}
              hint="مرابحة / تورق / تقسيط حلال — الأصل المستحق"
            />
            <NumField
              label="أقساط سيارات أو سلع حالَّة"
              value={debtCarInstall}
              onChange={setDebtCarInstall}
              unit={currencyName}
            />
            <NumField
              label="ديون تجارية مستحقة"
              value={debtTradePayable}
              onChange={setDebtTradePayable}
              unit={currencyName}
            />
            <NumField
              label="أثمان مشتريات لم تُسدد"
              value={debtPurchases}
              onChange={setDebtPurchases}
              unit={currencyName}
            />
          </div>
        </div>

        {/* ② الديون المؤجلة */}
        <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
          <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Badge className="bg-amber-500 text-white">②</Badge>
            الديون المؤجلة (طويلة الأجل) — على خلاف بين العلماء
          </div>
          <Alert className="border-amber-500/30 bg-background">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              <b>الجمهور:</b> يُخصم كل الدين حالًّا ومؤجلًا. <b>الأحوط:</b> يُخصم قسط السنة فقط.{" "}
              <b>الشافعية (قول قوي):</b> لا يُخصم الدين المؤجل أصلًا. والعمل المعاصر: إن لم يكن لديك
              مال زائد عن الحاجة فيجوز الخصم، والأحوط خصم قسط السنة فقط.
            </AlertDescription>
          </Alert>
          <div>
            <Label className="mb-2 block text-xs">السياسة المختارة لخصم المؤجل</Label>
            <RadioGroup
              value={debtDeferredPolicy}
              onValueChange={(v) => setDebtDeferredPolicy(v as DeferredPolicy)}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
                <RadioGroupItem value="yearly" id="dp-y" />
                <Label htmlFor="dp-y" className="text-xs cursor-pointer">
                  قسط السنة فقط (الأحوط)
                </Label>
              </div>
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
                <RadioGroupItem value="full" id="dp-f" />
                <Label htmlFor="dp-f" className="text-xs cursor-pointer">
                  خصم كامل الدين (الجمهور)
                </Label>
              </div>
              <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
                <RadioGroupItem value="none" id="dp-n" />
                <Label htmlFor="dp-n" className="text-xs cursor-pointer">
                  لا يُخصم (الشافعية)
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <NumField
              label="أقساط تمويل عقاري (إجمالي متبقي)"
              value={debtMortgage}
              onChange={setDebtMortgage}
              unit={currencyName}
            />
            <NumField
              label="مهر الزوجة المؤجل"
              value={debtMahr}
              onChange={setDebtMahr}
              unit={currencyName}
            />
            <NumField
              label="قسط السنة فقط من الديون المؤجلة"
              value={debtDeferredYearly}
              onChange={setDebtDeferredYearly}
              unit={currencyName}
              hint="يُستخدم مع سياسة «قسط السنة»"
            />
          </div>
        </div>

        {/* ③ النفقة الواجبة */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="text-sm font-semibold text-primary flex items-center gap-2">
            <Badge className="bg-primary">③</Badge>
            النفقة الواجبة إذا صارت دينًا — تُخصم
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            نفقة الزوجة أو الأولاد بحكم قضاء أو اتفاق، ونفقة الأقارب الواجبة شرعاً متى ثبتت في الذمة
            كَدَين.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <NumField
              label="نفقة واجبة مستحقة (زوجة/أولاد/أقارب)"
              value={debtAlimony}
              onChange={setDebtAlimony}
              unit={currencyName}
              hint="بحكم قضاء أو اتفاق"
            />
            <NumField
              label="نفقات ضرورية مستحقة"
              value={expenses}
              onChange={setExpenses}
              unit={currencyName}
              hint="فواتير وإيجارات مستحقة"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default DebtsAccordionSection;
