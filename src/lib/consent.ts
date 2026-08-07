const KEY = "nisab.consent.analytics";

export type ConsentValue = "accepted" | "declined";

export function getAnalyticsConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* التخزين المحلي قد يكون معطَّلاً — لا نكسر شيئاً */
  }
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === "accepted";
}
