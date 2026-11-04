export type PublicPriceRow = {
  id: string;
  country: string;
  currency: string;
  gold_gram: number | null;
  silver_gram: number | null;
  buyback_gram: number | null;
  silver_buyback_gram?: number | null;
};

export function createPriceUpdateTracker(country: string) {
  const seen = new Map<string, string>();
  const signature = (row: PublicPriceRow) =>
    JSON.stringify([
      row.currency,
      row.gold_gram,
      row.silver_gram,
      row.buyback_gram,
      row.silver_buyback_gram ?? null,
    ]);
  return {
    seed(table: string, rows: PublicPriceRow[]) {
      for (const row of rows) seen.set(`${table}:${row.id}`, signature(row));
    },
    accept(table: string, row: PublicPriceRow) {
      if (row.country !== country || !row.id) return false;
      const key = `${table}:${row.id}`;
      const next = signature(row);
      const previous = seen.get(key);
      seen.set(key, next);
      return previous !== next;
    },
  };
}
