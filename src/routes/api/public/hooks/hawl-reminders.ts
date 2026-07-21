import { createFileRoute } from "@tanstack/react-router";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

/**
 * تذكيرات الحول اليومية — تُستدعى من pg_cron.
 * محميّة بمفتاح مشترك `CRON_SECRET` عبر ترويسة `X-Cron-Secret`.
 * (يُقبل أيضاً `Authorization: Bearer <CRON_SECRET>` للأدوات التي لا تسمح بترويسة مخصصة.)
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  if (header && header === secret) return true;
  const auth = request.headers.get("authorization");
  if (auth && auth.replace(/^Bearer\s+/i, "") === secret) return true;
  return false;
}

async function run(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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
