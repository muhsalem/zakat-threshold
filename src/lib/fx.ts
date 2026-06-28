/**
 * Multi-currency FX support for Zakat reports.
 *
 * Rates are quoted as: "1 unit of `from` = N units of `to` (report currency)".
 * Example: { from: "USD", to: "SAR", rate: 3.75 } → 100 USD = 375 SAR.
 *
 * Conversions are applied to a "report-side" snapshot prior to export so the
 * generated PDF/Excel display a single normalized currency, while preserving
 * an audit trail of the source currency and rate used.
 */

export type FxRate = {
  /** ISO-4217-like code, free-form to allow stablecoins (USDT) and metals (XAU). */
  from: string;
  /** Code of the report currency. Must match across all rates. */
  to: string;
  /** Multiplier: amount_in_to = amount_in_from * rate. */
  rate: number;
};

export type FxEntry = {
  label: string;
  originalAmount: number;
  originalCurrency: string;
  rate: number;
  convertedAmount: number;
};

export type FxInfo = {
  reportCurrency: string;
  rates: FxRate[];
  entries: FxEntry[];
  /** Optional human-readable source attribution (e.g. "Central Bank — 2026-06-27"). */
  source?: string;
};

/** Convert `amount` from currency `from` to `to` using the provided rates. */
export function convert(amount: number, from: string, to: string, rates: FxRate[]): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const r = rates.find((x) => x.from === from && x.to === to);
  if (r && r.rate > 0) return amount * r.rate;
  // Try inverse rate.
  const inv = rates.find((x) => x.from === to && x.to === from);
  if (inv && inv.rate > 0) return amount / inv.rate;
  // No rate available — return original (graceful degradation).
  return amount;
}

/**
 * Build an FxInfo snapshot from a list of foreign-currency line items.
 * Items already in the report currency are skipped to keep the output focused.
 */
export function buildFxInfo(opts: {
  reportCurrency: string;
  rates: FxRate[];
  items: Array<{ label: string; amount: number; currency: string }>;
  source?: string;
}): FxInfo {
  const entries: FxEntry[] = [];
  for (const it of opts.items) {
    if (!it.currency || it.currency === opts.reportCurrency || it.amount === 0) continue;
    const converted = convert(it.amount, it.currency, opts.reportCurrency, opts.rates);
    const rate = it.amount === 0 ? 0 : converted / it.amount;
    entries.push({
      label: it.label,
      originalAmount: it.amount,
      originalCurrency: it.currency,
      rate,
      convertedAmount: converted,
    });
  }
  return { reportCurrency: opts.reportCurrency, rates: opts.rates, entries, source: opts.source };
}

/** Apply FX to a numeric value (helper for inline use in report payload builders). */
export function fx(amount: number, from: string, to: string, rates: FxRate[]): number {
  return convert(amount, from, to, rates);
}
