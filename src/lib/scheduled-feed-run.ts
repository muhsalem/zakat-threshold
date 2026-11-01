import { z } from "zod";

export const scheduledFeedRunSchema = z.object({
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  status: z.enum(["running", "success", "partial", "failed"]),
  updated: z.array(z.string()),
  warningCount: z.number().int().nonnegative(),
});
export type ScheduledFeedRun = z.infer<typeof scheduledFeedRunSchema>;

/** The store is durable; callbacks are injected to keep tracking testable. */
export async function trackScheduledFeedRun(
  execute: () => Promise<Response>,
  save: (run: ScheduledFeedRun, first: boolean) => Promise<void>,
  now: () => Date = () => new Date(),
): Promise<Response> {
  const run: ScheduledFeedRun = {
    startedAt: now().toISOString(),
    finishedAt: null,
    status: "running",
    updated: [],
    warningCount: 0,
  };
  await save(run, true);
  try {
    const response = await execute();
    const result: unknown = await response.clone().json();
    const parsed = z
      .object({ ok: z.boolean(), updated: z.array(z.string()), errors: z.array(z.string()) })
      .safeParse(result);
    const updated = parsed.success ? parsed.data.updated : [];
    const warningCount = parsed.success ? parsed.data.errors.length : 0;
    const status =
      !response.ok || !parsed.success || !parsed.data.ok || !updated.length
        ? "failed"
        : warningCount
          ? "partial"
          : "success";
    await save({ ...run, finishedAt: now().toISOString(), status, updated, warningCount }, false);
    return response;
  } catch {
    // Never persist exception text: it may contain credentials or upstream responses.
    await save({ ...run, finishedAt: now().toISOString(), status: "failed" }, false);
    return Response.json({ ok: false, error: "scheduled_update_failed" }, { status: 500 });
  }
}
