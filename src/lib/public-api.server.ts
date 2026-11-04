import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status < 400 ? "public, max-age=900" : "no-store",
    },
  });
}

/** Read-only client with the publishable key; RLS applies as anon. */
export function publicDb() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        // A dead or slow database must fail fast instead of hanging public endpoints.
        return fetch(input, {
          ...init,
          headers: h,
          signal: init?.signal ?? AbortSignal.timeout(8_000),
        });
      },
    },
  });
}
