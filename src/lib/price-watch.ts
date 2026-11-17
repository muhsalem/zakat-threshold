import { dailyWindow } from "./daily-nisab";

export type PriceTable = "jeweler_feed" | "public_price_quotes" | "official_nisab";

export function priceUpdateKeys(table: PriceTable): string[] {
  return table === "official_nisab" ? ["official-nisab"] : ["local-quote", "previous-day-nisab"];
}

/** Re-check at the UTC boundary, and recover immediately after a suspended tab wakes. */
export function watchUtcDay(options: {
  now: () => Date;
  schedule: (callback: () => void, delay: number) => () => void;
  refresh: () => void;
}) {
  let day = dailyWindow(options.now()).today;
  let cancel: (() => void) | undefined;
  let stopped = false;
  const check = () => {
    if (stopped) return;
    const window = dailyWindow(options.now());
    if (window.today !== day) {
      day = window.today;
      options.refresh();
    }
    cancel?.();
    cancel = options.schedule(check, window.remainingMs);
  };
  check();
  return {
    check,
    stop: () => {
      stopped = true;
      cancel?.();
    },
  };
}
