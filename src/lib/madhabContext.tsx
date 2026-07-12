import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Madhab = "hanafi" | "maliki" | "shafii" | "hanbali" | "aaoifi";

export interface MadhabRules {
  /** هل تجب الزكاة في حلي المرأة المستعمَل؟ (الحنفية: نعم — الجمهور: لا) */
  jewelryWornZakatable: boolean;
  /** نصاب الزروع والثمار — الجمهور: خمسة أوسق (~653kg)، الحنفية: تجب بأي قدر يخرج من الأرض */
  cropsRequireNisab: boolean;
  /** خلط المالين في زكاة الأنعام (الجمهور يجيزه بشروط، الحنفية لا) */
  livestockKhultahAllowed: boolean;
  /** زكاة عروض التجارة (الجمهور يوجبها، الظاهرية لا نعتمدها). كلها هنا = true */
  tradeGoodsZakatable: boolean;
  /** الدَّين المرجوّ: الجمهور يوجب زكاته سنوياً، المالكية تُخرج عن سنة واحدة عند القبض */
  strongDebtAnnual: boolean;
  /** الحلي غير المستعمَل (سبائك/ادخار) — بالإجماع تجب فيه الزكاة */
  jewelryStorageZakatable: true;
  /** مذهب المرجعية للأسم في المستشار */
  label: string;
}

const RULES: Record<Madhab, MadhabRules> = {
  hanafi: {
    jewelryWornZakatable: true,
    cropsRequireNisab: false,
    livestockKhultahAllowed: false,
    tradeGoodsZakatable: true,
    strongDebtAnnual: true,
    jewelryStorageZakatable: true,
    label: "الحنفي",
  },
  maliki: {
    jewelryWornZakatable: false,
    cropsRequireNisab: true,
    livestockKhultahAllowed: true,
    tradeGoodsZakatable: true,
    strongDebtAnnual: false, // سنة واحدة عند القبض
    jewelryStorageZakatable: true,
    label: "المالكي",
  },
  shafii: {
    jewelryWornZakatable: false,
    cropsRequireNisab: true,
    livestockKhultahAllowed: true,
    tradeGoodsZakatable: true,
    strongDebtAnnual: true,
    jewelryStorageZakatable: true,
    label: "الشافعي",
  },
  hanbali: {
    jewelryWornZakatable: false,
    cropsRequireNisab: true,
    livestockKhultahAllowed: true,
    tradeGoodsZakatable: true,
    strongDebtAnnual: true,
    jewelryStorageZakatable: true,
    label: "الحنبلي",
  },
  aaoifi: {
    jewelryWornZakatable: false,
    cropsRequireNisab: true,
    livestockKhultahAllowed: true,
    tradeGoodsZakatable: true,
    strongDebtAnnual: true,
    jewelryStorageZakatable: true,
    label: "معيار AAOIFI 35 (رأي الجمهور)",
  },
};

interface Ctx {
  madhab: Madhab;
  setMadhab: (m: Madhab) => void;
  rules: MadhabRules;
}

const MadhabContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "nisab.madhab";

export function MadhabProvider({ children }: { children: ReactNode }) {
  const [madhab, setMadhabState] = useState<Madhab>("aaoifi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Madhab | null;
      if (saved && RULES[saved]) setMadhabState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setMadhab = (m: Madhab) => {
    setMadhabState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  return (
    <MadhabContext.Provider value={{ madhab, setMadhab, rules: RULES[madhab] }}>
      {children}
    </MadhabContext.Provider>
  );
}

export function useMadhab(): Ctx {
  const ctx = useContext(MadhabContext);
  if (ctx) return ctx;
  // Fallback (component may render outside provider — SSR/tests)
  return { madhab: "aaoifi", setMadhab: () => {}, rules: RULES.aaoifi };
}

export const MADHAB_RULES = RULES;
