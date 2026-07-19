import { describe, it, expect } from "vitest";
import {
  findDuplicateSidebarLinks,
  getSidebarLinksForRole,
  type SidebarRole,
} from "./sidebarLinks";

const ROLES: SidebarRole[] = [
  "guest",
  "individual",
  "company",
  "institution",
  "accountant",
  "admin",
];

describe("sidebar links per role", () => {
  it.each(ROLES)("role %s renders no duplicated URL", (role) => {
    const dupes = findDuplicateSidebarLinks(role);
    expect(dupes, `Duplicate sidebar links for role "${role}": ${dupes.join(", ")}`).toEqual([]);
  });

  it.each(ROLES)("role %s renders at least one link", (role) => {
    const links = getSidebarLinksForRole(role);
    expect(links.length).toBeGreaterThan(0);
  });

  it("accountant does not see /subscription or the plain /history nav item", () => {
    const links = getSidebarLinksForRole("accountant");
    expect(links.some((l) => l.url === "/subscription")).toBe(false);
    // /history should only appear once, and inside pro_records, not nav.
    const history = links.filter((l) => l.url === "/history");
    expect(history).toHaveLength(1);
    expect(history[0].group).toBe("pro_records");
  });

  it("individual sees individual-only calculators and hides company/institution ones", () => {
    const urls = getSidebarLinksForRole("individual").map((l) => l.url);
    expect(urls).toContain("/zakat-fitr");
    expect(urls).not.toContain("/zakat-company");
    expect(urls).not.toContain("/enterprise");
  });

  it("company sees /zakat-company and not /zakat-fitr", () => {
    const urls = getSidebarLinksForRole("company").map((l) => l.url);
    expect(urls).toContain("/zakat-company");
    expect(urls).not.toContain("/zakat-fitr");
  });
});
