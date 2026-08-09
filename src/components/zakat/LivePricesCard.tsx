import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, TrendingUp, Globe2, Info, WifiOff } from "lucide-react";
import { getLiveMetalPrices } from "@/lib/metalPrices.functions";

const CACHE_KEY = "nisab:lastMetalPrices";
const STALE_WARN_MS = 24 * 60 * 60 * 1000;

interface CachedPrices {
  goldUsd: number;
  silverUsd: number;
  updatedAt: string;
}

function saveCachedPrices(p: CachedPrices) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(p));
  } catch {
    /* التخزين المحلي غير متاح (وضع خاص مثلاً) — تجاهل بصمت */
  }
}

function loadCachedPrices(): CachedPrices | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPrices;
  } catch {
    return null;
  }
}

/**
 * USD→local conversion factors (approximate, editable). For full accuracy,
 * users can override the rate. These defaults are reasonable mid-2025 averages.
 */
const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.385,
  EGP: 48,
  JOD: 0.71,
  IQD: 1310,
  LBP: 89500,
  SYP: 13000,
  YER: 530,
  MAD: 9.9,
  DZD: 134,
  TND: 3.1,
  LYD: 4.85,
  SDG: 600,
  EUR: 0.92,
  GBP: 0.78,
  TRY: 34,
  MYR: 4.5,
  IDR: 16000,
  PKR: 280,
  BDT: 120,
  INR: 84,
};

interface Props {
  currency: string;
  onApply: (gold24PerGram: number, silverPerGram: number) => void;
}

export function LivePricesCard({ currency, onApply }: Props) {
  const fetchPrices = useServerFn(getLiveMetalPrices);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CachedPrices | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [usdRate, setUsdRate] = useState(String(DEFAULT_USD_RATES[currency] ?? 1));
  const [localGold, setLocalGold] = useState("");
  const [localSilver, setLocalSilver] = useState("");

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetchPrices();
      if (!r.ok) throw new Error(r.error);
      const fresh: CachedPrices = {
        goldUsd: r.gold24PerGram,
        silverUsd: r.silverPerGram,
        updatedAt: r.updatedAt,
      };
      setData(fresh);
      setUsingCache(false);
      saveCachedPrices(fresh);
    } catch (e) {
      const cached = loadCachedPrices();
      if (cached) {
        setData(cached);
        setUsingCache(true);
        setError(
          `تعذّر الاتصال بالسوق العالمي (${(e as Error).message}) — تُعرض آخر أسعار محفوظة محلياً`,
        );
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  const cacheAgeMs = usingCache && data ? Date.now() - new Date(data.updatedAt).getTime() : 0;
  const cacheVeryStale = usingCache && cacheAgeMs > STALE_WARN_MS;

  function applyGlobal() {
    if (!data) return;
    const rate = Number(usdRate) || 1;
    onApply(data.goldUsd * rate, data.silverUsd * rate);
  }
  function applyLocal() {
    const g = Number(localGold) || 0;
    const s = Number(localSilver) || 0;
    if (g <= 0 && s <= 0) return;
    // Fallback: if one side missing, keep the global-converted value for that metal
    const rate = Number(usdRate) || 1;
    const fallbackG = data ? data.goldUsd * rate : 0;
    const fallbackS = data ? data.silverUsd * rate : 0;
    onApply(g > 0 ? g : fallbackG, s > 0 ? s : fallbackS);
  }

  const globalGoldLocal = data ? data.goldUsd * (Number(usdRate) || 1) : 0;
  const globalSilverLocal = data ? data.silverUsd * (Number(usdRate) || 1) : 0;
  const goldDeviation =
    globalGoldLocal > 0 && Number(localGold) > 0
      ? ((Number(localGold) - globalGoldLocal) / globalGoldLocal) * 100
      : 0;
  const silverDeviation =
    globalSilverLocal > 0 && Number(localSilver) > 0
      ? ((Number(localSilver) - globalSilverLocal) / globalSilverLocal) * 100
      : 0;
  const highDeviation = Math.abs(goldDeviation) > 3 || Math.abs(silverDeviation) > 3;

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

        {error && (
          <Alert variant={usingCache ? "default" : "destructive"} className={usingCache ? "border-warning/40 bg-warning/5" : undefined}>
            {usingCache && <WifiOff className="h-4 w-4 text-warning" />}
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {usingCache && data && (
          <Alert
            className={
              cacheVeryStale
                ? "border-destructive/40 bg-destructive/5"
                : "border-warning/40 bg-warning/5"
            }
          >
            <WifiOff className={`h-4 w-4 ${cacheVeryStale ? "text-destructive" : "text-warning"}`} />
            <AlertDescription className="text-xs leading-relaxed">
              أسعار مخزَّنة محلياً من آخر اتصال ناجح بتاريخ{" "}
              <b>{new Date(data.updatedAt).toLocaleString("ar-EG")}</b> — ليست لحظية.
              {cacheVeryStale && (
                <>
                  {" "}
                  <b className="text-destructive">
                    مضى عليها أكثر من 24 ساعة؛ لا تُعتمد لتحديد بلوغ النصاب دون تحديث فعلي عند توفر
                    الشبكة.
                  </b>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

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
              <Label className="text-xs flex items-center gap-1">
                <Globe2 className="h-3 w-3" /> سعر صرف 1 USD = ؟ {currency}
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                dir="ltr"
                style={{ textAlign: "right" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-primary/5 border border-primary/20 p-2 space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1">
                  <Globe2 className="h-3 w-3" /> السعر العالمي (سبوت)
                </div>
                <div>
                  الذهب/غ:{" "}
                  <b>
                    {globalGoldLocal.toFixed(2)} {currency}
                  </b>
                </div>
                <div>
                  الفضة/غ:{" "}
                  <b>
                    {globalSilverLocal.toFixed(3)} {currency}
                  </b>
                </div>
                <div className="border-t border-primary/20 pt-1 mt-1 space-y-0.5">
                  <div>
                    نصاب الذهب (85غ): <b>{(globalGoldLocal * 85).toFixed(0)}</b>
                  </div>
                  <div>
                    نصاب الفضة (595غ): <b>{(globalSilverLocal * 595).toFixed(0)}</b>
                  </div>
                </div>
                <Button onClick={applyGlobal} size="sm" className="w-full mt-1 h-7 text-[11px]">
                  اعتماد العالمي
                </Button>
              </div>
              <div className="rounded-md bg-muted/40 border border-dashed border-primary/30 p-2 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> سعر البيع المحلي
                </div>
                <div>
                  <Label className="text-[10px]">الذهب/غ</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localGold}
                    onChange={(e) => setLocalGold(e.target.value)}
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">الفضة/غ</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={localSilver}
                    onChange={(e) => setLocalSilver(e.target.value)}
                    dir="ltr"
                    style={{ textAlign: "right" }}
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                </div>
                {(Number(localGold) > 0 || Number(localSilver) > 0) && (
                  <div className="border-t border-primary/20 pt-1 mt-1 space-y-0.5">
                    {Number(localGold) > 0 && (
                      <div>
                        نصاب الذهب: <b>{(Number(localGold) * 85).toFixed(0)}</b>
                      </div>
                    )}
                    {Number(localSilver) > 0 && (
                      <div>
                        نصاب الفضة: <b>{(Number(localSilver) * 595).toFixed(0)}</b>
                      </div>
                    )}
                    {Number(localGold) > 0 && (
                      <div>
                        فرق الذهب:{" "}
                        <b
                          className={
                            Math.abs(goldDeviation) > 3 ? "text-destructive" : "text-primary"
                          }
                        >
                          {goldDeviation.toFixed(2)}%
                        </b>
                      </div>
                    )}
                    {Number(localSilver) > 0 && (
                      <div>
                        فرق الفضة:{" "}
                        <b
                          className={
                            Math.abs(silverDeviation) > 3 ? "text-destructive" : "text-primary"
                          }
                        >
                          {silverDeviation.toFixed(2)}%
                        </b>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  onClick={applyLocal}
                  size="sm"
                  variant="secondary"
                  className="w-full mt-1 h-7 text-[11px]"
                  disabled={!(Number(localGold) > 0 || Number(localSilver) > 0)}
                >
                  اعتماد المحلي
                </Button>
              </div>
            </div>
            {highDeviation && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-[11px]">
                  تنبيه: فرق السعر المحلي مقابل العالمي يتجاوز 3% — الأفضل شرعاً اعتماد سعر البيع
                  المحلي يوم وجوب الزكاة (الأنفع للفقراء).
                </AlertDescription>
              </Alert>
            )}
            <div className="text-[10px] text-muted-foreground text-center">
              آخر تحديث: {new Date(data.updatedAt).toLocaleString("ar")}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
