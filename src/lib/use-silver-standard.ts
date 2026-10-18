import { useEffect, useState } from "react";
import { SILVER_NISAB_G } from "./nisab";
import { ALTERNATIVE_SILVER_NISAB_G } from "./nisab-valuation";

const KEY = "nisab.silverStandard";
export function useSilverStandard() {
  const [weight, setWeight] = useState<number>(SILVER_NISAB_G);
  useEffect(() => {
    const sync = () =>
      setWeight(
        localStorage.getItem(KEY) === "612.36" ? ALTERNATIVE_SILVER_NISAB_G : SILVER_NISAB_G,
      );
    sync();
    window.addEventListener("nisab-standard", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nisab-standard", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    weight,
    setWeight: (value: number) => {
      localStorage.setItem(
        KEY,
        String(value === ALTERNATIVE_SILVER_NISAB_G ? value : SILVER_NISAB_G),
      );
      window.dispatchEvent(new Event("nisab-standard"));
    },
  };
}
