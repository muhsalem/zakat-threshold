import { test } from "node:test";
import { strict as assert } from "node:assert";
import { trackScheduledFeedRun, type ScheduledFeedRun } from "./scheduled-feed-run";
import { withCronAuthorization } from "./cron-authorization.server";

test("records execution start, finish and successful updated countries", async () => {
  const records: ScheduledFeedRun[] = [];
  let tick = 0;
  await trackScheduledFeedRun(
    async () => Response.json({ ok: true, updated: ["EG", "SA"], errors: [] }),
    async (run) => {
      records.push(run);
    },
    () => new Date(`2026-10-25T06:00:0${tick++}Z`),
  );
  assert.equal(records[0]?.status, "running");
  assert.equal(records[0]?.startedAt, "2026-10-25T06:00:00.000Z");
  assert.equal(records[1]?.finishedAt, "2026-10-25T06:00:01.000Z");
  assert.equal(records[1]?.status, "success");
  assert.deepEqual(records[1]?.updated, ["EG", "SA"]);
});
test("source failures distinguish partial updates from no updated prices", async () => {
  for (const updated of [["EG"], []]) {
    const records: ScheduledFeedRun[] = [];
    await trackScheduledFeedRun(
      async () => Response.json({ ok: true, updated, errors: ["unavailable"] }),
      async (run) => {
        records.push(run);
      },
    );
    assert.equal(records[1]?.status, updated.length ? "partial" : "failed");
    assert.equal(records[1]?.warningCount, 1);
  }
});
test("unexpected failures record a finish time without saving private exception details", async () => {
  const records: ScheduledFeedRun[] = [];
  const response = await trackScheduledFeedRun(
    async () => {
      throw new Error("private-test-credential");
    },
    async (run) => {
      records.push(run);
    },
  );
  assert.equal(response.status, 500);
  assert.equal(records[1]?.status, "failed");
  assert.ok(records[1]?.finishedAt);
  assert.equal(JSON.stringify(records).includes("private-test-credential"), false);
});
test("unauthorized cron calls cannot write execution history or update prices", async () => {
  const previousSecret = process.env["LOVABLE_CRON_SECRET"];
  process.env["LOVABLE_CRON_SECRET"] = "test-only-secret";
  let writes = 0;
  let updates = 0;
  const response = await withCronAuthorization(
    new Request("https://example.test", { method: "POST" }),
    () =>
      trackScheduledFeedRun(
        async () => {
          updates++;
          return Response.json({});
        },
        async () => {
          writes++;
        },
      ),
  );
  if (previousSecret === undefined) delete process.env["LOVABLE_CRON_SECRET"];
  else process.env["LOVABLE_CRON_SECRET"] = previousSecret;
  assert.equal(response.status, 401);
  assert.equal(writes, 0);
  assert.equal(updates, 0);
});
