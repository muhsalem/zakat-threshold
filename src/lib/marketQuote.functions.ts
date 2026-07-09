import { createServerFn } from "@tanstack/react-start";

/**
 * Fetch a market quote for a stock / ETF / sukuk / FX symbol via Yahoo Finance.
 * Free, no API key required.
 *
 * Examples of supported symbols:
 *  - US stocks/ETFs: AAPL, SPY, VOO
 *  - Saudi (Tadawul): 2222.SR (Aramco), 1180.SR (Al Rajhi)
 *  - Egypt (EGX): COMI.CA
 *  - UAE (DFM): EMAAR.AE
 *  - Sukuk ETFs: SPSK
 *  - Currency pairs: EURUSD=X, USDEGP=X, SARUSD=X
 *  - Crypto: BTC-USD, ETH-USD
 *
 * If a `date` (YYYY-MM-DD) is supplied, returns the closing price for that
 * trading day (or the nearest prior trading day if markets were closed).
 */
export const getMarketQuote = createServerFn({ method: "GET" })
  .inputValidator((data: { symbol: string; date?: string | null }) => {
    const symbol = String(data?.symbol ?? "").trim();
    if (!symbol || symbol.length > 32 || !/^[A-Za-z0-9._=^\-]+$/.test(symbol)) {
      throw new Error("رمز غير صالح");
    }
    const date = data?.date ? String(data.date) : null;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("تاريخ غير صالح");
    }
    return { symbol, date };
  })
  .handler(async ({ data }) => {
    const { symbol, date } = data;
    let url: string;
    if (date) {
      const day = new Date(date + "T00:00:00Z").getTime() / 1000;
      // ±5 day window to catch the closest trading day if the chosen date is weekend/holiday
      const p1 = Math.floor(day - 5 * 86400);
      const p2 = Math.floor(day + 1 * 86400);
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d`;
    } else {
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    }

    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 (compatible; ZakatCalc/1.0)",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as any;
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error("لا توجد بيانات");

      const meta = result.meta ?? {};
      const timestamps: number[] = result.timestamp ?? [];
      const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

      // Pick the closing price at-or-before the requested date; else latest valid close.
      let pickedTs: number | null = null;
      let pickedClose: number | null = null;
      if (date) {
        const target = new Date(date + "T23:59:59Z").getTime() / 1000;
        for (let i = timestamps.length - 1; i >= 0; i--) {
          if (timestamps[i] <= target && closes[i] != null) {
            pickedTs = timestamps[i];
            pickedClose = Number(closes[i]);
            break;
          }
        }
      }
      if (pickedClose == null) {
        for (let i = closes.length - 1; i >= 0; i--) {
          if (closes[i] != null) {
            pickedTs = timestamps[i];
            pickedClose = Number(closes[i]);
            break;
          }
        }
      }
      if (pickedClose == null) {
        pickedClose = Number(meta.regularMarketPrice);
        pickedTs = Number(meta.regularMarketTime ?? Date.now() / 1000);
      }
      if (!Number.isFinite(pickedClose)) throw new Error("سعر غير متوفر");

      return {
        ok: true as const,
        symbol: String(meta.symbol ?? symbol),
        name: String(meta.longName ?? meta.shortName ?? symbol),
        price: pickedClose,
        currency: String(meta.currency ?? "USD"),
        exchange: String(meta.fullExchangeName ?? meta.exchangeName ?? ""),
        instrument: String(meta.instrumentType ?? ""),
        asOf: new Date((pickedTs ?? Date.now() / 1000) * 1000).toISOString(),
        requestedDate: date,
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
