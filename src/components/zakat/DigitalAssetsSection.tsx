import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Info, Bitcoin, TrendingUp, Plus, Trash2 } from "lucide-react";
import { num, fmt } from "@/lib/zakat";

interface Props {
  currencyName: string;
  onTotalChange: (total: number) => void;
}

interface CryptoRow { id: string; name: string; qty: string; price: string; }
interface StockRow  { id: string; name: string; marketValue: string; }
interface FundRow   { id: string; name: string; marketValue: string; zakatableRatio: string; }

const rid = () => Math.random().toString(36).slice(2, 9);

export function DigitalAssetsSection({ currencyName, onTotalChange }: Props) {
  // العملات الرقمية
  const [cryptos, setCryptos] = useState<CryptoRow[]>([
    { id: rid(), name: "BTC", qty: "", price: "" },
  ]);
  const [cryptoPurpose, setCryptoPurpose] = useState<"investment" | "trade">("investment");

  // محفظة الأسهم — AAOIFI: 25.7% من القيمة السوقية للأسهم الاستثمارية
  const [stocksTrade, setStocksTrade] = useState<StockRow[]>([
    { id: rid(), name: "", marketValue: "" },
  ]);
  const [stocksInvest, setStocksInvest] = useState<StockRow[]>([
    { id: rid(), name: "", marketValue: "" },
  ]);
  const AAOIFI_INVEST_RATIO = 0.257; // 25.7% طبقًا لمعيار AAOIFI رقم 35

  // الصكوك
  const [sukuk, setSukuk] = useState("");

  // أرباح Staking / Mining / Yield Farming (تُزكَّى مع رأس المال)
  const [stakingYield, setStakingYield] = useState("");
  const [miningYield, setMiningYield] = useState("");
  const [defiYield, setDefiYield] = useState("");

  // الصناديق الاستثمارية المشتركة والـREITs (نسبة التطهير الشرعي حسب التقرير السنوي للصندوق)
  const [funds, setFunds] = useState<FundRow[]>([
    { id: rid(), name: "", marketValue: "", zakatableRatio: "25.7" },
  ]);
  const [reits, setReits] = useState<FundRow[]>([
    { id: rid(), name: "", marketValue: "", zakatableRatio: "10" },
  ]);

  const cryptoTotal = useMemo(
    () => cryptos.reduce((s, r) => s + num(r.qty) * num(r.price), 0),
    [cryptos],
  );
  const cryptoYieldTotal = num(stakingYield) + num(miningYield) + num(defiYield);
  const stocksTradeTotal = useMemo(
    () => stocksTrade.reduce((s, r) => s + num(r.marketValue), 0),
    [stocksTrade],
  );
  const stocksInvestRaw = useMemo(
    () => stocksInvest.reduce((s, r) => s + num(r.marketValue), 0),
    [stocksInvest],
  );
  const stocksInvestZakatable = stocksInvestRaw * AAOIFI_INVEST_RATIO;
  const sukukTotal = num(sukuk);
  const fundsZakatable = useMemo(
    () => funds.reduce((s, r) => s + num(r.marketValue) * (num(r.zakatableRatio) / 100), 0),
    [funds],
  );
  const reitsZakatable = useMemo(
    () => reits.reduce((s, r) => s + num(r.marketValue) * (num(r.zakatableRatio) / 100), 0),
    [reits],
  );

  const total = cryptoTotal + cryptoYieldTotal + stocksTradeTotal + stocksInvestZakatable + sukukTotal + fundsZakatable + reitsZakatable;

  useEffect(() => { onTotalChange(total); }, [total, onTotalChange]);

  const updateCrypto = (id: string, patch: Partial<CryptoRow>) =>
    setCryptos((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const updateStock = (kind: "trade" | "invest", id: string, patch: Partial<StockRow>) => {
    const setter = kind === "trade" ? setStocksTrade : setStocksInvest;
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <b>المرجع الشرعي:</b> AAOIFI رقم (35) بند (4/2/3) + قرار مجمع الفقه الإسلامي الدولي رقم 28
          (3/4) + ندوة البركة 38. أسهم المتاجرة تُزكَّى بكامل القيمة السوقية، وأسهم الاستثمار طويل الأجل
          تُزكَّى بنسبة <b>25.7%</b> من قيمتها السوقية تقديرًا للموجودات الزكوية في الشركة. والعملات
          الرقمية تأخذ حكم النقود إن اتُّخذت للادخار أو الاستثمار.
        </AlertDescription>
      </Alert>

      {/* العملات الرقمية */}
      <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Bitcoin className="h-4 w-4" /> أولاً: العملات الرقمية (Crypto)
          </div>
          <Badge variant="outline" className="text-[10px]">2.5% — حكم النقود</Badge>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Label>غرض الاقتناء:</Label>
          <div className="flex gap-2">
            <Button
              type="button" size="sm"
              variant={cryptoPurpose === "investment" ? "default" : "outline"}
              onClick={() => setCryptoPurpose("investment")}
            >ادخار/استثمار</Button>
            <Button
              type="button" size="sm"
              variant={cryptoPurpose === "trade" ? "default" : "outline"}
              onClick={() => setCryptoPurpose("trade")}
            >متاجرة يومية</Button>
          </div>
        </div>

        <div className="space-y-2">
          {cryptos.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Label className="text-xs">العملة (الرمز)</Label>
                <Input value={r.name} onChange={(e) => updateCrypto(r.id, { name: e.target.value })}
                  placeholder="BTC / ETH / USDT" />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">الكمية</Label>
                <Input type="number" inputMode="decimal" dir="ltr" style={{ textAlign: "right" }}
                  value={r.qty} onChange={(e) => updateCrypto(r.id, { qty: e.target.value })} />
              </div>
              <div className="col-span-4">
                <Label className="text-xs">سعر الوحدة ({currencyName})</Label>
                <Input type="number" inputMode="decimal" dir="ltr" style={{ textAlign: "right" }}
                  value={r.price} onChange={(e) => updateCrypto(r.id, { price: e.target.value })} />
              </div>
              <div className="col-span-2 flex gap-1">
                <Button type="button" variant="ghost" size="icon"
                  onClick={() => setCryptos((rows) => rows.filter((x) => x.id !== r.id))}
                  disabled={cryptos.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => setCryptos((rows) => [...rows, { id: rid(), name: "", qty: "", price: "" }])}>
            <Plus className="h-3 w-3 ml-1" /> إضافة عملة
          </Button>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          إجمالي العملات الرقمية: <b className="text-primary">{fmt(cryptoTotal)} {currencyName}</b>
        </div>
      </div>

      {/* محفظة الأسهم — متاجرة */}
      <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <TrendingUp className="h-4 w-4" /> ثانياً: أسهم المتاجرة (للبيع والشراء قصير الأجل)
          </div>
          <Badge variant="outline" className="text-[10px]">100% × 2.5%</Badge>
        </div>
        <div className="space-y-2">
          {stocksTrade.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label className="text-xs">السهم</Label>
                <Input value={r.name} onChange={(e) => updateStock("trade", r.id, { name: e.target.value })}
                  placeholder="مثال: أرامكو" />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">القيمة السوقية ({currencyName})</Label>
                <Input type="number" inputMode="decimal" dir="ltr" style={{ textAlign: "right" }}
                  value={r.marketValue}
                  onChange={(e) => updateStock("trade", r.id, { marketValue: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Button type="button" variant="ghost" size="icon"
                  onClick={() => setStocksTrade((rows) => rows.filter((x) => x.id !== r.id))}
                  disabled={stocksTrade.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => setStocksTrade((rows) => [...rows, { id: rid(), name: "", marketValue: "" }])}>
            <Plus className="h-3 w-3 ml-1" /> إضافة سهم
          </Button>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2">
          الوعاء الزكوي للمتاجرة: <b className="text-primary">{fmt(stocksTradeTotal)} {currencyName}</b>
        </div>
      </div>

      {/* محفظة الأسهم — استثمار طويل */}
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gold-dark">
            <TrendingUp className="h-4 w-4" /> ثالثاً: أسهم الاستثمار طويل الأجل
          </div>
          <Badge variant="outline" className="text-[10px]">25.7% × 2.5% (AAOIFI)</Badge>
        </div>
        <div className="space-y-2">
          {stocksInvest.map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label className="text-xs">السهم</Label>
                <Input value={r.name} onChange={(e) => updateStock("invest", r.id, { name: e.target.value })}
                  placeholder="مثال: الراجحي" />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">القيمة السوقية ({currencyName})</Label>
                <Input type="number" inputMode="decimal" dir="ltr" style={{ textAlign: "right" }}
                  value={r.marketValue}
                  onChange={(e) => updateStock("invest", r.id, { marketValue: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Button type="button" variant="ghost" size="icon"
                  onClick={() => setStocksInvest((rows) => rows.filter((x) => x.id !== r.id))}
                  disabled={stocksInvest.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => setStocksInvest((rows) => [...rows, { id: rid(), name: "", marketValue: "" }])}>
            <Plus className="h-3 w-3 ml-1" /> إضافة سهم
          </Button>
        </div>
        <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
          <div>إجمالي القيمة السوقية: <b>{fmt(stocksInvestRaw)} {currencyName}</b></div>
          <div>الوعاء الزكوي (25.7%): <b className="text-primary">{fmt(stocksInvestZakatable)} {currencyName}</b></div>
        </div>
      </div>

      {/* الصكوك */}
      <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
        <Label className="text-sm font-semibold text-primary">رابعاً: الصكوك الإسلامية (قيمة اسمية + ربح محقق)</Label>
        <Input type="number" inputMode="decimal" dir="ltr" style={{ textAlign: "right" }}
          value={sukuk} onChange={(e) => setSukuk(e.target.value)} placeholder="0" />
        <p className="text-[11px] text-muted-foreground">
          صكوك المضاربة والمشاركة تُزكَّى زكاة عروض التجارة (القيمة السوقية + الأرباح المحققة).
        </p>
      </div>

      {/* الإجمالي */}
      <div className="rounded-lg border-2 border-primary/40 bg-primary/10 p-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary">إجمالي الأصول الرقمية والاستثمارية الزكوية</span>
          <span className="text-xl font-bold text-primary">{fmt(total)} {currencyName}</span>
        </div>
      </div>
    </div>
  );
}
