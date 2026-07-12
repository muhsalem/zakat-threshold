import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Info } from "lucide-react";
import { num, fmt, ZAKAT_RATE } from "@/lib/zakat";

interface Props {
  currencyName: string;
  onZakatChange?: (zakat: number) => void;
}

/**
 * زكاة شركات التأمين التكافلي
 * المرجع: AAOIFI FAS 26 + معيار شرعي رقم 26 (التأمين الإسلامي)
 * — يُفصل بين أموال المساهمين (الشركة) وأموال المشتركين (حساب التكافل).
 * — أموال المساهمين تُزكَّى كشركة عادية (صافي الموجودات × 2.5%).
 * — فائض المشتركين لا زكاة على الشركة فيه، بل يُوزَّع على المشتركين أو يُحوَّل للقادم.
 * — الاحتياطي الفني (الأقساط غير المكتسبة + المطالبات) لا يُزكَّى لأنه التزام تجاه المشتركين.
 */
export function TakafulSection({ currencyName, onZakatChange }: Props) {
  const [shareholderFunds, setShareholderFunds] = useState("");
  const [participantFundSurplus, setParticipantFundSurplus] = useState("");
  const [technicalReserve, setTechnicalReserve] = useState("");
  const [investmentReturns, setInvestmentReturns] = useState("");
  const [wakalaFee, setWakalaFee] = useState("");

  const calc = useMemo(() => {
    const sh = num(shareholderFunds);
    const wak = num(wakalaFee);
    const inv = num(investmentReturns);
    // وعاء الشركة (المساهمين فقط) — لا يدخل فيه الاحتياطي الفني ولا فائض المشتركين
    const base = sh + wak + inv;
    const zakat = base * ZAKAT_RATE;
    return { base, zakat };
  }, [shareholderFunds, wakalaFee, investmentReturns]);

  useEffect(() => {
    onZakatChange?.(calc.zakat);
  }, [calc.zakat, onZakatChange]);

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          زكاة شركات التأمين التكافلي
          <Badge variant="outline" className="text-[10px] me-auto">
            AAOIFI FAS 26
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            <b>الفصل الشرعي:</b> أموال المساهمين منفصلة عن أموال المشتركين. تُزكِّي الشركةُ{" "}
            <b>حساب المساهمين</b> فقط (رأس المال + رسوم الوكالة + عوائد استثمار حصة المساهمين). أما{" "}
            <b>الاحتياطي الفني</b> و<b>فائض المشتركين</b> فهي التزامات تجاه حملة الوثائق ولا زكاة
            على الشركة فيها، بل يُزكِّيها كلُّ مشترك في ماله الخاص إن بلغ النصاب.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">حقوق المساهمين (رأس المال + الاحتياطيات)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={shareholderFunds}
              onChange={(e) => setShareholderFunds(e.target.value)}
              dir="ltr"
              style={{ textAlign: "right" }}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">رسوم الوكالة المحقّقة</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={wakalaFee}
              onChange={(e) => setWakalaFee(e.target.value)}
              dir="ltr"
              style={{ textAlign: "right" }}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">عوائد استثمار حصة المساهمين</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={investmentReturns}
              onChange={(e) => setInvestmentReturns(e.target.value)}
              dir="ltr"
              style={{ textAlign: "right" }}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              الاحتياطي الفني (للعرض فقط — لا يُزكَّى)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={technicalReserve}
              onChange={(e) => setTechnicalReserve(e.target.value)}
              dir="ltr"
              style={{ textAlign: "right" }}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm text-muted-foreground">
              فائض المشتركين (يُوزَّع — لا تُزكِّيه الشركة)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={participantFundSurplus}
              onChange={(e) => setParticipantFundSurplus(e.target.value)}
              dir="ltr"
              style={{ textAlign: "right" }}
              placeholder="0"
            />
          </div>
        </div>

        <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>وعاء زكاة المساهمين:</span>
            <b>
              {fmt(calc.base)} {currencyName}
            </b>
          </div>
          <div className="flex justify-between text-primary">
            <span>الزكاة المستحقة (2.5%):</span>
            <b className="text-base">
              {fmt(calc.zakat)} {currencyName}
            </b>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
