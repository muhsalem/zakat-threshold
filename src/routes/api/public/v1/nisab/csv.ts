import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { COUNTRIES } from "@/lib/countries";
import { nisabCsv } from "@/lib/nisab-csv";
import { getLivePrices } from "@/lib/prices.functions";
import { CORS } from "@/lib/public-api.server";

const Query = z.object({ country: z.string().regex(/^[A-Za-z]{2}$/) });

/** A single CSV row for spreadsheets: `=IMPORTDATA(".../api/public/v1/nisab/csv?country=EG")`. */
export const Route = createFileRoute("/api/public/v1/nisab/csv")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const parsed = Query.safeParse({
          country: new URL(request.url).searchParams.get("country") ?? "",
        });
        const fail = (status: number, message: string) =>
          new Response(message, {
            status,
            headers: {
              ...CORS,
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        if (!parsed.success) return fail(400, "use ?country=EG");
        const country = COUNTRIES.find((c) => c.code === parsed.data.country.toUpperCase());
        if (!country) return fail(404, "unknown country");

        let prices;
        try {
          prices = await getLivePrices();
        } catch {
          return fail(503, "price sources temporarily unavailable");
        }
        const rate = prices.rates[country.currency];
        if (!rate) return fail(404, "no exchange rate for this currency");

        return new Response(
          nisabCsv({
            country: country.code,
            currency: country.currency,
            goldUsdOz: prices.goldUsdOz,
            silverUsdOz: prices.silverUsdOz,
            ratePerUsd: rate,
            updatedAt: prices.metalsUpdatedAt,
          }),
          {
            headers: {
              ...CORS,
              "Content-Type": "text/csv; charset=utf-8",
              "Cache-Control": "public, max-age=900",
            },
          },
        );
      },
    },
  },
});
