import { createFileRoute } from "@tanstack/react-router";

import { buildOpenApi } from "@/lib/openapi";
import { CORS, json } from "@/lib/public-api.server";

/** Machine-readable description of the public API. */
export const Route = createFileRoute("/api/public/v1/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => json(buildOpenApi(new URL(request.url).origin)),
    },
  },
});
