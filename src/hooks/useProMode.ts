import { useEffect, useState } from "react";

/**
 * Pro Mode = تفضيل واجهة (يعرض/يخفي أدوات متقدمة). ليست بوابة أمان.
 * أي منطق حسّاس يجب فرضه على الخادم عبر أدوار قاعدة البيانات (`user_roles`)
 * وليس عبر هذا التبديل.
 */
const KEY = "zk-pro-mode";

export function useProMode() {
  const [pro, setPro] = useState<boolean>(false);

  useEffect(() => {
    try {
      setPro(localStorage.getItem(KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  const enable = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setPro(true);
  };

  const disable = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setPro(false);
  };

  const toggle = () => (pro ? disable() : enable());

  // توافق خلفي مع الاستهلاك السابق (unlock/lock)
  return { pro, enable, disable, toggle, unlock: enable, lock: disable };
}
