import { createFileRoute } from "@tanstack/react-router";

import { COUNTRIES } from "@/lib/countries";

const PAGES = [
  "/", "/today", "/calculator", "/countries", "/map", "/compare", "/history", "/chronology",
  "/methodology", "/fiqh", "/types", "/faq", "/sources", "/developers", "/outlook", "/waqf",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = [...PAGES, ...COUNTRIES.map((c) => `/country/${c.code.toLowerCase()}`)];
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
