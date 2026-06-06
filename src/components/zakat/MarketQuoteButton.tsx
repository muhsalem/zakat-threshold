import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, RefreshCw, Calendar as CalIcon, CheckCircle2 } from "lucide-react";
import { getMarketQuote } from "@/lib/marketQuote.functions";

interface Props {
  symbol: string;
  defaultDate?: string;
  onApply: (price: number, meta: { currency: string; asOf: string; name: string }) => void;
  compact?: boolean;
}

/**
 * Inline button that fetches a live market quote (stock/sukuk/ETF/FX) via
 * Yahoo Finance for an optional historical date and applies it to the field.
 */
export function MarketQuoteButton({ symbol, defaultDate, onApply, compact }: Props) {
  const fetchQuote = useServerFn(getMarketQuote);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quote, setQuote] = useState<null | {
    price: number; currency: string; name: string; exchange: string; asOf: string;
  }>(null);

  async function fetchNow() {
    setBusy(true); setErr(null); setQuote(null);
    try {
      const r = await fetchQuote({ data: { symbol, date: date || null } });
      if (!r.ok) throw new Error(r.error);
      setQuote({ price: r.price, currency: r.currency, name: r.name, exchange: r.exchange, asOf: r.asOf });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!quote) return;
    onApply(quote.price, { currency: quote.currency, asOf: quote.asOf, name: quote.name });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant="outline"
          disabled={!symbol.trim()}
          className="gap-1 h-9"
          title={symbol.trim() ? "جلب السعر الحي" : "أدخل الرمز أولاً"}
        >
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs">سعر حي</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">{symbol}</Badge>
          <span className="text-xs text-muted-foreground">Yahoo Finance</span>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><CalIcon className="h-3 w-3" /> تاريخ التقييم (اختياري)</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-[10px] text-muted-foreground">اتركه فارغاً للسعر الحالي. عند اختيار تاريخ يُعاد سعر الإغلاق ليوم التداول الأقرب.</p>
        </div>
        <Button onClick={fetchNow} disabled={busy} className="w-full gap-1.5" size="sm">
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          {busy ? "جاري الجلب..." : "جلب السعر"}
        </Button>
        {err && <Alert variant="destructive" className="py-2"><AlertDescription className="text-xs">{err}</AlertDescription></Alert>}
        {quote && (
          <div className="rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
            <div className="font-semibold truncate">{quote.name}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-primary">{quote.price.toFixed(4)}</span>
              <Badge variant="secondary">{quote.currency}</Badge>
            </div>
            {quote.exchange && <div className="text-muted-foreground">{quote.exchange}</div>}
            <div className="text-[10px] text-muted-foreground">حتى: {new Date(quote.asOf).toLocaleString("ar")}</div>
            <Button onClick={apply} size="sm" className="w-full gap-1 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> تطبيق السعر
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
