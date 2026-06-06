import { useEffect, useState } from "react";

const KEY = "zk-pro-mode";
// كلمة مرور محلية لفتح وضع المحاسب المحترف. يمكن تغييرها لاحقًا.
export const PRO_PASSCODE = "1430";

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
