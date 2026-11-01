import { authenticateCronRequest } from "../integrations/supabase/cron-auth";

/** Never invoke privileged work until the shared secret has been verified. */
export async function withCronAuthorization(
  request: Request,
  update: () => Promise<Response>,
): Promise<Response> {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  return update();
}