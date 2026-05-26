import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, TrendingUp, Globe2, Info } from "lucide-react";
import { getLiveMetalPrices } from "@/lib/metalPrices.functions";

/**
 * USD→local conversion factors (approximate, editable). For full accuracy,
 * users can override the rate. These defaults are reasonable mid-2025 averages.
 */
const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1, SAR: 3.75, AED: 3.67, KWD: 0.31, QAR: 3.64, BHD: 0.376, OMR: 0.385,
  EGP: 48, JOD: 0.71, IQD: 1310, LBP: 89500, SYP: 13000, YER: 530, MAD: 9.9,
  DZD: 134, TND: 3.1, LYD: 4.85, SDG: 600, EUR: 0.92, GBP: 0.78, TRY: 34,
  MYR: 4.5, IDR: 16000, PKR: 280, BDT: 120, INR: 84,
};

interface Props {
  currency: string;
  onApply: (gold24PerGram: number, silverPerGram: number) => void;
}

export function LivePricesCard({ currency, onApply }: Props) {
  const fetchPrices = useServerFn(getLiveMetalPrices);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ goldUsd: number; silverUsd: number; updatedAt: string } | null>(null);
  const [usdRate, setUsdRate] = useState(String(DEFAULT_USD_RATES[currency] ?? 1));

  async function refresh() {
    setBusy(true); setError(null);
    try {
      const r = await fetchPrices();
      if (!r.ok) throw new Error(r.error);
      setData({ goldUsd: r.gold24PerGram, silverUsd: r.silverPerGram, updatedAt: r.updatedAt });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!data) return;
    const rate = Number(usdRate) || 1;
    onApply(data.goldUsd * rate, data.silverUsd * rate);
  }

  return (
    <Card className="shadow-soft print:hidden border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> أسعار السوق العالمية اللحظية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            تُجلب الأسعار من السوق العالمي بالدولار للأونصة، وتُحوَّل إلى {currency} وفق سعر الصرف.
            عدّل سعر الصرف يدوياً لمزيد من الدقة قبل التطبيق على الحاسبة.
          </AlertDescription>
        </Alert>

        <Button onClick={refresh} disabled={busy} className="w-full gap-1.5" variant="outline">
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          {busy ? "جاري الجلب..." : data ? "تحديث الأسعار" : "جلب الأسعار اللحظية"}
        </Button>

        {error && <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">الذهب 24 / غرام</div>
                <div className="font-bold">${data.goldUsd.toFixed(2)}</div>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">الفضة / غرام</div>
                <div className="font-bold">${data.silverUsd.toFixed(3)}</div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Globe2 className="h-3 w-3" /> سعر صرف 1 USD = ؟ {currency}</Label>
              <Input type="number" step="0.0001" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} dir="ltr" style={{ textAlign: "right" }} />
            </div>
            <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-xs space-y-0.5">
              <div>الذهب بـ{currency}/غرام: <b>{(data.goldUsd * (Number(usdRate) || 1)).toFixed(2)}</b></div>
              <div>الفضة بـ{currency}/غرام: <b>{(data.silverUsd * (Number(usdRate) || 1)).toFixed(3)}</b></div>
            </div>
            <Button onClick={apply} className="w-full">تطبيق على الحاسبة</Button>
            <div className="text-[10px] text-muted-foreground text-center">آخر تحديث: {new Date(data.updatedAt).toLocaleString("ar")}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
