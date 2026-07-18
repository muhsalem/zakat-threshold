// Hook: كشف الدولة تلقائياً + سماح بالتبديل اليدوي + مزامنة مع profile للمسجّلين.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCountry, type CountryInfo } from "@/lib/geo/countries";

const LS_KEY = "nisab.geo.country";

type State = {
  code: string | null;
  info: CountryInfo;
  source: "loading" | "manual" | "profile" | "ip" | "default";
};

async function fetchGeoFromIP(): Promise<string | null> {
  try {
    const res = await fetch("/api/public/geo", { cache: "force-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as { code: string | null };
    return data.code;
  } catch {
    return null;
  }
}

export function useGeoPricing() {
  const [state, setState] = useState<State>(() => {
    if (typeof window === "undefined") {
      return { code: null, info: getCountry(null), source: "loading" };
    }
    const stored = window.localStorage.getItem(LS_KEY);
    if (stored) {
      return { code: stored, info: getCountry(stored), source: "manual" };
    }
    return { code: null, info: getCountry(null), source: "loading" };
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) لو موجود اختيار يدوي — لا تلمسه
      const stored = window.localStorage.getItem(LS_KEY);
      if (stored) return;

      // 2) جرّب profile للمسجّلين
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("country")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled && profile?.country) {
          setState({
            code: profile.country,
            info: getCountry(profile.country),
            source: "profile",
          });
          return;
        }
      }

      // 3) fallback IP
      const ipCode = await fetchGeoFromIP();
      if (!cancelled) {
        if (ipCode) {
          setState({ code: ipCode, info: getCountry(ipCode), source: "ip" });
        } else {
          setState({ code: null, info: getCountry(null), source: "default" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCountry = useCallback(async (code: string) => {
    const upper = code.toUpperCase();
    window.localStorage.setItem(LS_KEY, upper);
    setState({ code: upper, info: getCountry(upper), source: "manual" });

    // مزامنة مع profile
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ country: upper })
        .eq("user_id", user.id);
    }
  }, []);

  return { ...state, setCountry };
}
