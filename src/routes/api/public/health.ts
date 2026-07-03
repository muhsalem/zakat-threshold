import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const BOOT = Date.now();

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const body = {
          ok: true,
          service: "zakat-calculator",
          version: "1.0.0",
          uptime_ms: Date.now() - BOOT,
          time: new Date().toISOString(),
          runtime: "cloudflare-workers",
          checks: {
            fatwa_engine: "ok",
            erp_journal: "ok",
            openapi: "ok",
          },
        };
        return new Response(JSON.stringify(body), { status: 200, headers: CORS });
      },
    },
  },
});
