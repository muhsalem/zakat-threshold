import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CORS, json, publicDb } from "@/lib/public-api.server";

const Query = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * The immutable daily raw price snapshot (USD/oz, FX, source agreement).
 * Without ?day it returns the latest one; with ?day=YYYY-MM-DD that exact UTC day.
 */
export const Route = createFileRoute("/api/public/v1/nisab/snapshot")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const sp = new URL(request.url).searchParams;
        const parsed = Query.safeParse({ day: sp.get("day") ?? undefined });
        if (!parsed.success) return json({ error: "use ?day=YYYY-MM-DD" }, 400);

        const db = publicDb();
        const query = db.from("price_snapshots").select("*");
        const { data, error } = parsed.data.day
          ? await query.eq("day", parsed.data.day).maybeSingle()
          : await query.order("day", { ascending: false }).limit(1).maybeSingle();
        if (error) return json({ error: "snapshot store unavailable" }, 503);
        if (!data) return json({ error: "no snapshot for that day" }, 404);
        return json({
          ...data,
          note: "Raw inputs: derive any country's nisab as USD/oz ÷ 31.1034768 × fx_rates[currency] × weight.",
        });
      },
    },
  },
});
