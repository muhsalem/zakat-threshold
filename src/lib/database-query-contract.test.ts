import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { inspectQueries, readSchema } from "./database-query-contract";

const root = fileURLToPath(new URL("../../", import.meta.url));
const schema = readSchema(readFileSync(join(root, "src/integrations/supabase/types.ts"), "utf8"));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
  });
}

describe("database query contracts", () => {
  test("loads generated table, write and RPC shapes", () => {
    assert.equal(schema.tables.size, 14);
    assert.equal(schema.tables.get("price_submissions")?.get("Insert")?.get("user_id")?.optional, false);
    assert.equal(schema.functions.get("jeweler_leaderboard")?.has("_country"), true);
  });

  for (const path of ["routes", "components", "lib"].flatMap(folder => sourceFiles(join(root, "src", folder)))) {
    const filename = relative(root, path);
    const source = readFileSync(path, "utf8");
    if (!/\.(from|rpc)\s*\(/.test(source) || filename.includes("database-query-contract")) continue;
    test(`${filename}: database tables, columns, writes and RPC arguments match generated types`, () => {
      const result = inspectQueries(source, filename, schema);
      assert.deepEqual(result.errors, [], result.errors.join("\n"));
    });
  }

  test("rejects a removed table", () => {
    assert.match(inspectQueries('db.from("missing_table").select("*")', "fixture.ts", schema).errors.join("\n"), /unknown table missing_table/);
  });
  test("rejects selected, filtered and ordered columns, including reused builders", () => {
    const result = inspectQueries('const query = db.from("nisab_history").select("missing_price"); query.eq("missing_country", "EG").order("missing_day");', "fixture.ts", schema);
    assert.equal(result.errors.length, 3);
  });
  test("rejects unknown write keys and missing required fields", () => {
    const result = inspectQueries('db.from("price_votes").upsert({ user_id: "u", vote: 1, typo: 1 });', "fixture.ts", schema);
    assert.match(result.errors.join("\n"), /unknown write field typo/);
    assert.match(result.errors.join("\n"), /missing required write field submission_id/);
  });
  test("rejects wrong RPC names and argument keys", () => {
    const result = inspectQueries('db.rpc("missing_rpc", {}); db.rpc("jeweler_leaderboard", { country: "EG" });', "fixture.ts", schema);
    assert.equal(result.errors.length, 3);
  });
  test("rejects unreviewed dynamic tables and invalid conflict columns", () => {
    const result = inspectQueries('db.from(target).select("*"); db.from("price_votes").upsert({ submission_id: "s", user_id: "u", vote: 1 }, { onConflict: "submission_id,typo" });', "fixture.ts", schema);
    assert.equal(result.errors.length, 2);
  });
});