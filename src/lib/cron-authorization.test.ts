import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { withCronAuthorization } from "./cron-authorization.server";

describe("scheduled jeweler price update authorization", () => {
  test("rejects absent, incorrect, malformed and legacy tokens without running updates", async () => {
    await withTestSecrets(async () => {
      for (const headers of [
        {},
        { authorization: "Bearer incorrect" },
        { authorization: "Basic test-current-secret" },
        { authorization: "Bearer" },
        { authorization: "Bearer test-current-secret,other" },
        { "x-job-token": "test-current-secret" },
      ]) {
        let updates = 0;
        const response = await withCronAuthorization(request(headers), async () => {
          updates++;
          return Response.json({ updated: true });
        });
        assert.equal(response.status, 401);
        assert.equal(updates, 0);
      }
    });
  });

  test("runs the update exactly once for the correct bearer secret", async () => {
    await withTestSecrets(async () => {
      let updates = 0;
      const response = await withCronAuthorization(request({ authorization: "Bearer test-current-secret" }), async () => {
        updates++;
        return Response.json({ updated: true });
      });
      assert.equal(updates, 1);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { updated: true });
    });
  });

  test("fails closed when the server secret is missing", async () => {
    await withTestSecrets(async () => {
      delete process.env["LOVABLE_CRON_SECRET"];
      let updates = 0;
      const response = await withCronAuthorization(request({ authorization: "Bearer test-current-secret" }), async () => {
        updates++;
        return new Response("updated");
      });
      assert.equal(response.status, 500);
      assert.equal(updates, 0);
    });
  });

  test("accepts the previous secret only while rotation is configured", async () => {
    await withTestSecrets(async () => {
      process.env["LOVABLE_CRON_SECRET_PREVIOUS"] = "test-previous-secret";
      let updates = 0;
      const update = async () => { updates++; return new Response("updated"); };
      assert.equal((await withCronAuthorization(request({ authorization: "Bearer test-previous-secret" }), update)).status, 200);
      delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
      assert.equal((await withCronAuthorization(request({ authorization: "Bearer test-previous-secret" }), update)).status, 401);
      assert.equal(updates, 1);
    });
  });
});

function request(headers: HeadersInit) {
  return new Request("https://example.test/api/public/hooks/jeweler-feed", { method: "POST", headers });
}

async function withTestSecrets(run: () => Promise<void>) {
  const current = process.env["LOVABLE_CRON_SECRET"];
  const previous = process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
  process.env["LOVABLE_CRON_SECRET"] = "test-current-secret";
  delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
  try { await run(); }
  finally {
    if (current === undefined) delete process.env["LOVABLE_CRON_SECRET"];
    else process.env["LOVABLE_CRON_SECRET"] = current;
    if (previous === undefined) delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
    else process.env["LOVABLE_CRON_SECRET_PREVIOUS"] = previous;
  }
}