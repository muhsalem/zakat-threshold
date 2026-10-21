import { createFileRoute } from "@tanstack/react-router";

const PRIVATE = ["/admin", "/auth", "/control", "/moderation", "/alerts", "/api/"];

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = [
          "User-agent: *",
          "Allow: /",
          ...PRIVATE.map((p) => `Disallow: ${p}`),
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
