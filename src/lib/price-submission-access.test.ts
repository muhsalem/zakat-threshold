import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../drizzle/migrations/0004_restrict_price_submission_reads.sql", import.meta.url), "utf8");

describe("raw price submission access migration", () => {
  it("restricts reads to the owner or database-verified admin instead of all signed-in users", () => {
    assert.match(migration, /ALTER POLICY "subs read"[\s\S]*TO authenticated USING \(\(user_id = \(SELECT auth\.uid\(\)\)\) OR public\.has_role\(\(SELECT auth\.uid\(\)\), 'admin'::public\.app_role\)\)/);
    assert.doesNotMatch(migration, /USING\s*\(true\)/i);
  });
  it("removes anonymous direct access while retaining owner submission and admin review grants", () => {
    assert.match(migration, /REVOKE ALL ON public\.price_submissions FROM anon/);
    assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON public\.price_submissions TO authenticated/);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  });
});