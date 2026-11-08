import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { INVITATION_KINDS, buildInvitation, whatsappShareUrl } from "./invitations";

describe("invitations", () => {
  test("every kind builds a message that names the site exactly once per link and has no double slash", () => {
    for (const { id } of INVITATION_KINDS) {
      const text = buildInvitation(id, "https://nisab.example/");
      assert.ok(text.startsWith("بسم الله الرحمن الرحيم"));
      assert.ok(text.includes("https://nisab.example"));
      assert.ok(!text.includes("example//"));
      assert.ok(!text.includes("example/ "));
    }
  });

  test("the scholars invitation sends people to the fiqh and methodology pages", () => {
    const text = buildInvitation("scholars", "https://nisab.example");
    assert.ok(text.includes("https://nisab.example/fiqh"));
    assert.ok(text.includes("https://nisab.example/methodology"));
  });

  test("the WhatsApp link carries the encoded text", () => {
    const url = whatsappShareUrl("نِصاب & زكاة");
    assert.ok(url.startsWith("https://api.whatsapp.com/send?text="));
    assert.equal(decodeURIComponent(url.split("text=")[1]!), "نِصاب & زكاة");
  });
});
