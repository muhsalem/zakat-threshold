import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";
import { cronUnauthorizedResponse, isCronAuthorized } from "@/lib/cronAuth.server";

/**
 * تذكيرات الحول اليومية — تُستدعى من pg_cron.
 * محميّة بمفتاح مشترك `CRON_SECRET` عبر ترويسة `X-Cron-Secret`.
 * (يُقبل أيضاً `Authorization: Bearer <CRON_SECRET>` للأدوات التي لا تسمح بترويسة مخصصة.)
 */
async function run(request: Request): Promise<Response> {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }
  const rl = await rateLimit(request, { key: "hawl-reminders", limit: 6, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("generate_hawl_reminders");
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, inserted: data ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/hawl-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});
