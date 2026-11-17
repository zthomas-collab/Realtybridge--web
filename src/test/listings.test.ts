import { describe, expect, it } from "vitest";
import { listingAreaMatch, sortListingsForInvestor } from "@/lib/domain/listings";

describe("realtor listings for investors", () => {
  it("shows every listing, with the investor's area first", () => {
    const rows = [
      { id: "tx", state: "TX", county: null },
      { id: "nc", state: "NC", county: "Durham County" },
      { id: "wake", state: "NC", county: "Wake County" },
    ];
    const sorted = sortListingsForInvestor(rows, ["NC"], ["NC:Wake County"]);
    expect(sorted.map((r) => r.id)).toEqual(["wake", "nc", "tx"]);
  });

  it("labels county and state matches", () => {
    expect(listingAreaMatch({ state: "VA", county: "Wythe County" }, ["VA"], ["VA:Wythe County"])).toBe("county");
    expect(listingAreaMatch({ state: "VA", county: "Smyth County" }, ["VA"], ["VA:Wythe County"])).toBe("state");
    expect(listingAreaMatch({ state: "TX", county: null }, ["VA"])).toBeNull();
  });
});
