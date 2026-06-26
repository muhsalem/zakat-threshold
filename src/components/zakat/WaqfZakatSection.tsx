import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Landmark, Info } from "lucide-react";
import { ZAKAT_RATE } from "@/lib/zakat";

type Props = { currencyName?: string };

export function WaqfZakatSection({ currencyName = "" }: Props) {
  const [tradeAssets, setTradeAssets] = useState("");
  const [rentIncome, setRentIncome] = useState("");
  const [exemptCore, setExemptCore] = useState("");

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const zakatable = useMemo(
    () => Math.max(0, num(tradeAssets) + num(rentIncome) - num(exemptCore)),
    [tradeAssets, rentIncome, exemptCore]
  );
  const zakat = zakatable * ZAKAT_RATE;

  return (
    <Card className="shadow-soft border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-primary" />
          زكاة الأوقاف والمؤسسات الوقفية
          <Badge variant="outline" className="text-[10px] mr-auto">AAOIFI 35 / مجمع الفقه 140</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed space-y-1">
            <p><b>القاعدة:</b> أصل الوقف لا تجب فيه الزكاة لخروجه عن الملك (قرار مجمع الفقه الإسلامي 140/15/4 و معيار AAOIFI 35).</p>
            <p><b>الاستثناءات:</b> 1) عروض التجارة المملوكة للوقف للاسترباح. 2) غلّة الوقف المخصّصة للموقوف عليهم المعيّنين إذا بلغت النصاب وحال الحول وكانوا أغنياء.</p>
            <p><b>المعفى:</b> الأصول الوقفية المحبّسة على جهات بر عامة (مساجد، فقراء، طلاب علم) لا زكاة فيها أصلاً ولا في غلّتها المصروفة لهم.</p>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">عروض تجارة مملوكة للوقف</Label>
            <Input inputMode="decimal" value={tradeAssets} onChange={(e) => setTradeAssets(e.target.value)} placeholder="0" />
            <p className="text-[10px] text-muted-foreground">بضاعة/استثمارات للاسترباح</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">غلّة موزّعة على موقوف عليهم معيّنين</Label>
            <Input inputMode="decimal" value={rentIncome} onChange={(e) => setRentIncome(e.target.value)} placeholder="0" />
            <p className="text-[10px] text-muted-foreground">إن بلغت النصاب وحال الحول</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الأصول الوقفية الخيرية (معفاة)</Label>
            <Input inputMode="decimal" value={exemptCore} onChange={(e) => setExemptCore(e.target.value)} placeholder="0" />
            <p className="text-[10px] text-muted-foreground">للخصم التوضيحي فقط</p>
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm flex items-center justify-between">
          <span>الوعاء الزكوي للوقف</span>
          <span className="font-bold text-primary">
            {zakatable.toLocaleString()} {currencyName} → الزكاة {zakat.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyName}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
