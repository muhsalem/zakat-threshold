import { useEffect, useState } from "react";

const KEY = "zk-pro-mode";
// Passcode الافتراضي قابل للتجاوز عبر متغير البيئة VITE_PRO_PASSCODE
// (لا يوضع السر داخل المستودع — للنشر يُحقن من Settings → Environment).
const FALLBACK_PASSCODE = "1430";
const ENV_PASSCODE = (import.meta.env.VITE_PRO_PASSCODE as string | undefined)?.trim();
export const PRO_PASSCODE = ENV_PASSCODE && ENV_PASSCODE.length >= 4 ? ENV_PASSCODE : FALLBACK_PASSCODE;

export function useProMode() {
  const [pro, setPro] = useState<boolean>(false);

  useEffect(() => {
    try {
      setPro(localStorage.getItem(KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  const unlock = (code: string) => {
    if (code.trim() === PRO_PASSCODE) {
      try { localStorage.setItem(KEY, "1"); } catch {}
      setPro(true);
      return true;
    }
    return false;
  };

  const lock = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setPro(false);
  };

  return { pro, unlock, lock };
}
