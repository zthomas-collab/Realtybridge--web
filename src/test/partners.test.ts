import { describe, expect, it } from "vitest";

import { PARTNERS, partnerDomain } from "@/lib/domain/partners";

describe("Partner directory", () => {
  it("shows the partner's own website as the link text", () => {
    expect(partnerDomain("http://www.realestaterecoverygroup.com/")).toBe("realestaterecoverygroup.com");
  });

  it("hyperlinks RealEstate Recovery Group to its own website", () => {
    const rrg = PARTNERS.find((p) => p.name === "RealEstate Recovery Group");

    expect(rrg?.url).toBe("http://www.realestaterecoverygroup.com/");
    expect(rrg?.image).toMatch(/rrg-partner\.png$/);
    expect(rrg?.imageAlt).toContain("RealEstate Recovery Group");
  });

  it("hyperlinks StraightLine Funding, The Wolf of Wholesaling and First National Title & Escrow to their own websites", () => {
    const byName = new Map(PARTNERS.map((p) => [p.name, p]));

    expect(byName.get("StraightLine Funding")?.url).toBe("http://www.straightlinefunding.com/");
    expect(byName.get("The Wolf of Wholesaling")?.url).toBe("https://www.skool.com/thewolfofwholesaling/about");
    expect(byName.get("First National Title & Escrow")?.url).toBe("http://www.firstnte.com/");
    for (const name of ["StraightLine Funding", "The Wolf of Wholesaling", "First National Title & Escrow"]) {
      expect(byName.get(name)?.image.length).toBeGreaterThan(0);
    }
  });

  it("gives every partner an absolute website, a logo and alt text", () => {
    expect(PARTNERS.length).toBeGreaterThan(0);
    for (const p of PARTNERS) {
      expect(/^https?:\/\//.test(p.url)).toBe(true);
      expect(p.image.length).toBeGreaterThan(0);
      expect(p.imageAlt.length).toBeGreaterThan(0);
    }
  });
});
