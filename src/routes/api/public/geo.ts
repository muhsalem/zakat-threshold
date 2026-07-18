// Server route: يقرأ CF-IPCountry ويُرجع بلد المستخدم + منطقته + عملته.
import { createFileRoute } from "@tanstack/react-router";
import { getCountry } from "@/lib/geo/countries";

export const Route = createFileRoute("/api/public/geo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cf =
          request.headers.get("cf-ipcountry") ||
          request.headers.get("x-vercel-ip-country") ||
          request.headers.get("x-country-code");
        const raw = cf && cf !== "XX" && cf !== "T1" ? cf.toUpperCase() : null;
        const country = getCountry(raw);
        return Response.json(
          {
            code: raw,
            tier: country.tier,
            currency: country.currency,
            name: country.name,
            nameAr: country.nameAr,
            flag: country.flag,
            locale: country.locale,
          },
          {
            headers: {
              "cache-control": "public, max-age=3600, s-maxage=3600",
            },
          },
        );
      },
    },
  },
});
