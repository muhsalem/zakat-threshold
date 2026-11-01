import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { NISAB_CSV_HEADER, nisabCsv } from "./nisab-csv";

describe("nisab csv", () => {
  test("a row follows the header and uses the 85 g and 595 g weights", () => {
    // 3110.34768 USD/oz is exactly 100 USD/g; 31.1034768 USD/oz is exactly 1 USD/g.
    const csv = nisabCsv({
      country: "EG",
      currency: "EGP",
      goldUsdOz: 3110.34768,
      silverUsdOz: 31.1034768,
      ratePerUsd: 50,
      updatedAt: "2026-11-01T12:00:00Z",
    });
    const [header, row] = csv.trim().split("\n");
    assert.equal(header, NISAB_CSV_HEADER);
    assert.equal(
      row,
      "EG,EGP,425000.00,29750.00,29750.00,5000.00,4375.00,50.00,2026-11-01T12:00:00Z",
    );
    assert.equal(header!.split(",").length, row!.split(",").length);
  });
});
