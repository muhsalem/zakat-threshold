/** Maps AI analysis error codes thrown by history-ask functions to translation keys. */
const CODES = ["QUESTION_SHORT", "NO_DATA", "RATE_LIMIT", "CREDITS", "DENIED", "EMPTY", "CONFIG", "FAILED"];

export function aiErrorMessage(e: unknown, t: (key: string) => string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const code = CODES.find((k) => raw.includes(k)) ?? (/fetch|network/i.test(raw) ? "NETWORK" : "FAILED");
  return t(`err.${code}`);
}
