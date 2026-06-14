import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { num, fmt, ZAKAT_RATE } from "@/lib/zakat";
import { TrendingUp } from "lucide-react";

interface Props { currencyName?: string }

export default function StockClassificationAdvanced({ currencyName = "ج.م" }: Props) {
  // أسهم للمتاجرة
  const [tradeMarket, setTradeMarket] = useState("");
  // أسهم اقتناء
  const [holdShare, setHoldShare] = useState("");
  const [holdCount, setHoldCount] = useState("");
  // REIT
  const [reitUnits, setReitUnits] = useState("");
  const [reitNAV, setReitNAV] = useState("");
  const [reitIncome, setReitIncome] = useState("");
  // ETF
  const [etfMarket, setEtfMarket] = useState("");
  const [etfHalalPct, setEtfHalalPct] = useState("100");

  const trade = num(tradeMarket) * ZAKAT_RATE;
  const hold = num(holdShare) * num(holdCount) * ZAKAT_RATE;
  const reit = useMemo(() => {
    // وفق AAOIFI 21: زكاة على عناصر زكوية في الصندوق (تقدير بصافي الأصول الزكوية)
    const navTotal = num(reitUnits) * num(reitNAV);
    const income = num(reitIncome);
    // قاعدة تقريبية: 2.5% على القيمة + التوزيعات
    return (navTotal + income) * ZAKAT_RATE;
  }, [reitUnits, reitNAV, reitIncome]);
  const etf = num(etfMarket) * (Math.min(100, Math.max(0, num(etfHalalPct))) / 100) * ZAKAT_RATE;

  return (
    <Card className="border-primary/40 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          الأوراق المالية المتقدمة (أسهم/REIT/ETF)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trade">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="trade" className="text-xs">للمتاجرة</TabsTrigger>
            <TabsTrigger value="hold" className="text-xs">للاقتناء</TabsTrigger>
            <TabsTrigger value="reit" className="text-xs">REIT</TabsTrigger>
            <TabsTrigger value="etf" className="text-xs">ETF</TabsTrigger>
          </TabsList>

          <TabsContent value="trade" className="space-y-3 pt-3">
            <Label>القيمة السوقية الحالية للمحفظة</Label>
            <Input inputMode="decimal" value={tradeMarket} onChange={(e) => setTradeMarket(e.target.value)} />
            <div className="rounded bg-muted/40 p-3 text-sm">
              الزكاة: <strong className="text-primary">{fmt(trade)} {currencyName}</strong>
              <p className="text-xs text-muted-foreground mt-1">عروض تجارة: 2.5% من القيمة السوقية وفق الجمهور.</p>
            </div>
          </TabsContent>

          <TabsContent value="hold" className="space-y-3 pt-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>الموجودات الزكوية للسهم الواحد</Label>
                <Input inputMode="decimal" value={holdShare} onChange={(e) => setHoldShare(e.target.value)} /></div>
              <div><Label>عدد الأسهم</Label>
                <Input inputMode="decimal" value={holdCount} onChange={(e) => setHoldCount(e.target.value)} /></div>
            </div>
            <div className="rounded bg-muted/40 p-3 text-sm">
              الزكاة: <strong className="text-primary">{fmt(hold)} {currencyName}</strong>
              <p className="text-xs text-muted-foreground mt-1">
                AAOIFI 21: للاقتناء — تُحسب على نصيب السهم من النقود والذمم والبضاعة فقط.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reit" className="space-y-3 pt-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>عدد الوحدات</Label>
                <Input inputMode="decimal" value={reitUnits} onChange={(e) => setReitUnits(e.target.value)} /></div>
              <div><Label>صافي قيمة الوحدة (NAV)</Label>
                <Input inputMode="decimal" value={reitNAV} onChange={(e) => setReitNAV(e.target.value)} /></div>
              <div><Label>التوزيعات السنوية</Label>
                <Input inputMode="decimal" value={reitIncome} onChange={(e) => setReitIncome(e.target.value)} /></div>
            </div>
            <div className="rounded bg-muted/40 p-3 text-sm">
              الزكاة: <strong className="text-primary">{fmt(reit)} {currencyName}</strong>
              <p className="text-xs text-muted-foreground mt-1">
                صناديق REIT (عقارات مدرّة): تُقاس على المستغلات؛ 2.5% على NAV + التوزيعات (الجمهور).
              </p>
            </div>
          </TabsContent>

          <TabsContent value="etf" className="space-y-3 pt-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>القيمة السوقية للصندوق</Label>
                <Input inputMode="decimal" value={etfMarket} onChange={(e) => setEtfMarket(e.target.value)} /></div>
              <div><Label>نسبة المكوّنات الحلال %</Label>
                <Input inputMode="decimal" value={etfHalalPct} onChange={(e) => setEtfHalalPct(e.target.value)} /></div>
            </div>
            <div className="rounded bg-muted/40 p-3 text-sm">
              الزكاة: <strong className="text-primary">{fmt(etf)} {currencyName}</strong>
              <p className="text-xs text-muted-foreground mt-1">
                صناديق المؤشرات: تُزكّى نسبة المكوّنات الحلال فقط؛ المكوّنات المحرّمة تُطهَّر.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
