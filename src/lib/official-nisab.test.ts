import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import { OFFICIAL_FATWAS } from "./official-nisab";

describe("official fatwa data", () => {
  it("every entry that cites a source also says when it was checked", () => {
    for (const f of Object.values(OFFICIAL_FATWAS)) {
      if (f.sourceUrl) {
        assert.ok(f.sourceUrl.startsWith("https://"), f.countryCode);
        assert.match(f.checkedOn ?? "", /^\d{4}-\d{2}-\d{2}$/, f.countryCode);
      }
    }
  });

  it("the standard matches what the ruling text says for the checked countries", () => {
    assert.equal(OFFICIAL_FATWAS["EG"]!.standard, "gold");
    assert.match(OFFICIAL_FATWAS["EG"]!.rulingAr, /عيار 21/);
    assert.equal(OFFICIAL_FATWAS["SA"]!.standard, "lower");
    assert.match(OFFICIAL_FATWAS["SA"]!.rulingAr, /أدنى النصابين/);
  });
});
