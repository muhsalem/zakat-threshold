/** The persisted daily history is keyed by UTC calendar dates. */
export const PRICE_REFRESH_MS = 60_000;
export const HISTORY_CACHE_MS = 60 * 60_000;

export function dailyWindow(now: Date) {
  const today = now.toISOString().slice(0, 10);
  const end = Date.parse(`${today}T00:00:00Z`) + 86_400_000;
  return {
    today,
    yesterday: new Date(end - 2 * 86_400_000).toISOString().slice(0, 10),
    remainingMs: end - now.getTime(),
  };
}

export function nisabChange(current: number, previous: number | null | undefined) {
  if (!Number.isFinite(current) || previous == null || !Number.isFinite(previous) || previous <= 0) return null;
  const difference = current - previous;
  return { difference, percent: difference / previous * 100 };
}

export function isCurrentUtcDay(at: string, day: string) {
  const date = new Date(at);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}