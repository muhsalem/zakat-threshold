import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";
import { inspectQueries, readSchema } from "./database-query-contract";
import { authenticateCronRequest } from "../integrations/supabase/cron-auth";

const root = fileURLToPath(new URL("../../", import.meta.url));
const schema = readSchema(readFileSync(join(root, "src/integrations/supabase/types.ts"), "utf8"));
// Bulk arrays assembled in loops require separate payload/type checks; keep this
// reviewed list explicit so a newly uninspectable write cannot silently pass.
const reviewedBulkWrites: Record<string, string[]> = {
  "src/lib/admin-console.functions.ts": ["insert(fresh.slice(i, i + 500))"],
  "src/lib/daily-broadcast.server.ts": ["insert(out)"],
  "src/routes/api/public/hooks/jeweler-feed.ts": ["upsert(rows)"],
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")
        ? [path]
        : [];
  });
}

describe("database query contracts", () => {
  test("query result types, nullability, payload types and RPC enums satisfy compile-only contracts", () => {
    const program = ts.createProgram([join(root, "src/lib/database-query-types.fixture.ts")], {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
  });
  test("loads generated table, write and RPC shapes", () => {
    // 14 tables plus the public_price_quotes and public_profiles views.
    assert.equal(schema.tables.size, 16);
    assert.equal(
      schema.tables.get("price_submissions")?.get("Insert")?.get("user_id")?.optional,
      false,
    );
    assert.equal(schema.functions.get("jeweler_leaderboard")?.has("_country"), true);
  });

  for (const path of ["routes", "components", "lib"].flatMap((folder) =>
    sourceFiles(join(root, "src", folder)),
  )) {
    const filename = relative(root, path).replaceAll("\\", "/");
    const source = readFileSync(path, "utf8");
    if (
      !/\.(from|rpc)\s*\(/.test(source) ||
      filename.includes("database-query-contract") ||
      filename.endsWith(".fixture.ts")
    )
      continue;
    test(`${filename}: database tables, columns, writes and RPC arguments match generated types`, () => {
      const result = inspectQueries(source, filename, schema);
      assert.deepEqual(result.errors, [], result.errors.join("\n"));
      assert.deepEqual(
        result.deferredWrites,
        (reviewedBulkWrites[filename] ?? []).map((write) => `${filename}: ${write}`),
        "Review new dynamic bulk writes explicitly",
      );
    });
  }

  test("rejects a removed table", () => {
    assert.match(
      inspectQueries('db.from("missing_table").select("*")', "fixture.ts", schema).errors.join(
        "\n",
      ),
      /unknown table missing_table/,
    );
  });
  test("rejects selected, filtered and ordered columns, including reused builders", () => {
    const result = inspectQueries(
      'const query = db.from("nisab_history").select("missing_price"); query.eq("missing_country", "EG").order("missing_day");',
      "fixture.ts",
      schema,
    );
    assert.equal(result.errors.length, 3);
  });
  test("rejects unknown write keys and missing required fields", () => {
    const result = inspectQueries(
      'db.from("price_votes").upsert({ user_id: "u", vote: 1, typo: 1 });',
      "fixture.ts",
      schema,
    );
    assert.match(result.errors.join("\n"), /unknown write field typo/);
    assert.match(result.errors.join("\n"), /missing required write field submission_id/);
  });
  test("rejects wrong RPC names and argument keys", () => {
    const result = inspectQueries(
      'db.rpc("missing_rpc", {}); db.rpc("jeweler_leaderboard", { country: "EG" });',
      "fixture.ts",
      schema,
    );
    // Unknown RPC and unknown argument key; _country is optional in this database.
    assert.equal(result.errors.length, 2);
  });
  test("checks write fields in mapped arrays and conditional spreads", () => {
    assert.match(
      inspectQueries(
        'db.from("notifications").insert(ids.map(id => ({ user_id: id, typo: true })));',
        "fixture.ts",
        schema,
      ).errors.join("\n"),
      /unknown write field typo/,
    );
    assert.match(
      inspectQueries(
        'db.from("official_sources").update({ ...(changed ? { typo: "now" } : {}) });',
        "fixture.ts",
        schema,
      ).errors.join("\n"),
      /unknown write field typo/,
    );
  });
  test("rejects unreviewed dynamic tables and invalid conflict columns", () => {
    const result = inspectQueries(
      'db.from(target).select("*"); db.from("price_votes").upsert({ submission_id: "s", user_id: "u", vote: 1 }, { onConflict: "submission_id,typo" });',
      "fixture.ts",
      schema,
    );
    assert.equal(result.errors.length, 2);
  });

  test("price refresh authentication rejects legacy tokens and accepts only the verified bearer credential", async () => {
    const current = process.env["LOVABLE_CRON_SECRET"];
    const previous = process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
    process.env["LOVABLE_CRON_SECRET"] = "test-only-cron-credential";
    delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
    try {
      const request = (headers: Record<string, string>) =>
        new Request("https://example.test/api/public/hooks/jeweler-feed", {
          method: "POST",
          headers,
        });
      assert.equal(
        (await authenticateCronRequest(request({ "x-job-token": "anything" })))?.status,
        401,
      );
      assert.equal(
        (await authenticateCronRequest(request({ authorization: "Bearer invalid" })))?.status,
        401,
      );
      assert.equal(
        await authenticateCronRequest(
          request({ authorization: "Bearer test-only-cron-credential" }),
        ),
        null,
      );
    } finally {
      if (current === undefined) delete process.env["LOVABLE_CRON_SECRET"];
      else process.env["LOVABLE_CRON_SECRET"] = current;
      if (previous === undefined) delete process.env["LOVABLE_CRON_SECRET_PREVIOUS"];
      else process.env["LOVABLE_CRON_SECRET_PREVIOUS"] = previous;
    }
  });
});
