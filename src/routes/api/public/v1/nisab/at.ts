import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CORS, json } from "@/lib/public-api.server";

const Query = z.object({
  country: z.string().regex(/^[A-Za-z]{2}$/),
  /** Any ISO-8601 instant, e.g. 2026-10-20T14:30:00Z or just 2026-10-20 (taken as 00:00 UTC). */
  at: z.string().min(8).max(40),
  standard: z.enum(["default", "tola"]).default("default"),
});

/** The nisab of a country at a past minute: GET ?country=EG&at=2026-10-20T14:30Z[&standard=tola]. */
export const Route = createFileRoute("/api/public/v1/nisab/at")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const sp = new URL(request.url).searchParams;
        const parsed = Query.safeParse({
          country: sp.get("country") ?? "",
          at: sp.get("at") ?? "",
          standard: sp.get("standard") ?? undefined,
        });
        if (!parsed.success) {
          return json({ error: "use ?country=EG&at=2026-10-20T14:30:00Z[&standard=tola]" }, 400);
        }
        const { lookupNisabAt } = await import("@/lib/nisab-lookup.server");
        let result;
        try {
          result = await lookupNisabAt(parsed.data.country, parsed.data.at, parsed.data.standard);
        } catch {
          return json({ error: "history store unavailable" }, 503);
        }
        if (!result.found) {
          const status =
            result.reason === "invalid" ? 400 : result.reason === "no-data" ? 404 : 503;
          return json({ error: result.reason }, status);
        }
        return json({
          ...result,
          disclaimer: "Indicative figures, not a fatwa. / أرقام استرشادية وليست فتوى.",
        });
      },
    },
  },
});
