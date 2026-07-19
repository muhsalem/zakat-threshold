import { Info, Landmark, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NumField } from "@/components/zakat/individual/shared";

export interface TradeGoodsSubsectionProps {
  currencyName: string;
  inventory: string;
  setInventory: (v: string) => void;
  receivablesGood: string;
  setReceivablesGood: (v: string) => void;
  receivablesBad: string;
  setReceivablesBad: (v: string) => void;
  tradeIsShareholder: boolean;
  setTradeIsShareholder: (v: boolean) => void;
  tradeShareCompany: string;
  setTradeShareCompany: (v: string) => void;
  tradeSharePct: string;
  setTradeSharePct: (v: string) => void;
  tradeShareCompanyBase: string;
  setTradeShareCompanyBase: (v: string) => void;
  num: (v: string) => number;
  cur: (v: number) => string;
}

/**
 * القسم الفرعي «أولاً: عروض التجارة والديون» ضمن AccordionItem
 * value="income-trade-usufruct". مستخرج من IndividualTab بدون تغيير سلوكي.
 */
export function TradeGoodsSubsection({
  currencyName,
  inventory,
  setInventory,
  receivablesGood,
  setReceivablesGood,
  receivablesBad,
  setReceivablesBad,
  tradeIsShareholder,
  setTradeIsShareholder,
  tradeShareCompany,
  setTradeShareCompany,
  tradeSharePct,
  setTradeSharePct,
  tradeShareCompanyBase,
  setTradeShareCompanyBase,
  num,
  cur,
}: TradeGoodsSubsectionProps) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Package className="h-4 w-4" /> أولاً: عروض التجارة والديون
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <NumField
          label="قيمة البضاعة بسعر السوق"
          value={inventory}
          onChange={setInventory}
          unit={currencyName}
          hint="تُقوَّم بسعر بيع الجملة يوم وجوب الزكاة"
        />
        <NumField
          label="ديون مرجوّة لك على الغير"
          value={receivablesGood}
          onChange={setReceivablesGood}
          unit={currencyName}
          hint="على مَليء مُقرّ بها"
        />
        <NumField
          label="ديون متعذّرة (على معسر أو جاحد)"
          value={receivablesBad}
          onChange={setReceivablesBad}
          unit={currencyName}
          hint="لا تُزكَّى حتى تُقبض، ثم زكاة سنة واحدة فقط — لا تُحتسب الآن"
        />
      </div>

      {/* هل أنت مساهم في شركة */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">هل أنت مساهم / شريك في شركة قائمة؟</Label>
          <Switch checked={tradeIsShareholder} onCheckedChange={setTradeIsShareholder} />
        </div>
        {tradeIsShareholder && (
          <>
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                إن كانت الشركة تُخرج زكاتها كاملةً عن وعائها فلا تُكرّر الحساب — اتركها صفراً. وإلا
                أدخل الوعاء الزكوي للشركة (من تبويب «زكاة الشركات») ونسبة حصتك.
              </AlertDescription>
            </Alert>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">اسم الشركة</Label>
                <Input
                  value={tradeShareCompany}
                  onChange={(e) => setTradeShareCompany(e.target.value)}
                  placeholder="…"
                />
              </div>
              <NumField
                label="نسبة حصتك %"
                value={tradeSharePct}
                onChange={setTradeSharePct}
                unit="%"
              />
              <NumField
                label="وعاء الشركة الزكوي"
                value={tradeShareCompanyBase}
                onChange={setTradeShareCompanyBase}
                unit={currencyName}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted-foreground">
                نصيبك المُحتسب:{" "}
                <b className="text-primary">
                  {cur(num(tradeShareCompanyBase) * (num(tradeSharePct) / 100))}
                </b>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = document.getElementById("tab-company") as HTMLElement | null;
                  el?.click();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Landmark className="h-3.5 w-3.5 ms-1" />
                فتح تبويب «زكاة الشركات» لحساب الوعاء
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TradeGoodsSubsection;
